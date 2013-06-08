var net = require('net');
var Buffers = require('buffers');
var h = require('./helpers');

var noop = function(){};

var parse_SEXP = function(buf, offset, attr) {
    if(typeof attr === 'undefined') {
        attr = null;
    }
    var r = buf;
    var i = offset;
    var ra = h.int8(r, i);
    var rl = h.int24(r, i + 1);

    i += 4;
    offset = i + rl;
    var eoa = offset;

    if ((ra & 64) === 64) {
        throw new Error('long packets are not implemented');
    }

    if (ra > 127) {
        ra &= 127;
        var al = h.int24(r, i + 1);
        var ret = parse_SEXP(buf, i);
        attr = ret[0];
        i += al + 4;
    }
    if (ra === 0) {
        return [null, i];
    }
    if (ra === 16) { // generic vector
        var a = [];
        while (i < eoa) {
            if(h.int8(buf, i) === 255) {
                break;
            }
            var ret = parse_SEXP(buf, i);
            i = ret[1];
            a.push(ret[0]);
        }
        // if the 'names' attribute is set, convert the plain array into a map
        if (attr !== null && typeof attr.names !== 'undefined') {
            var names = attr.names;
            var na = {};
            var n = a.length;
            for (var k = 0; k < n; k++) {
                na[names[k]] = a[k];
            }
            return [na, i];
        }
        return [a, i];
    }
    if (ra === 19) { // symbol
        var oi = i;
        while (i < eoa && r[i] !== 0) i++;
        return [buf.slice(oi, i).toString('utf8'), i];
    }
    if (ra === 20 || ra === 22) { // pairlist w/o tags
        var a = [];
        while (i < eoa) {
            var ret = parse_SEXP(buf, i);
            i = ret[1];
            a.push(ret[0]);
        }
        return [a, i];
    }
    if (ra === 21 || ra === 23) { // pairlist with tags
        var a = {};
        while (i < eoa) {
            var retval = parse_SEXP(buf, i);
            i = retval[1];
            var rettag = parse_SEXP(buf, i);
            i = rettag[1];
            a[rettag[0]] = retval[0];
        }
        return [a, i];
    }
    if (ra === 32) { // integer array
        var a = [];
        while (i < eoa) {
            a.push(h.int32(r, i));
            i += 4;
        }
        if (a.length === 1) return [a[0], i];
        return [a, i];
    }
    if (ra === 33) { // double array
        var a = [];
        while (i < eoa) {
            a.push(h.flt64(r, i));
            i += 8;
        }
        if (a.length === 1) return [a[0], i];
        return [a, i];
    }
    if (ra === 34) { // string array
        var a = [];
        var oi = i;
        while (i < eoa) {
            if (r[i] === 0) {
                a.push(r.slice(oi, i).toString('utf8'));
                oi = i + 1;
            }
            i++;
        }
        if (a.length === 1) return [a[0], i];
        return [a, i];
    }
    if (ra === 36) { // boolean vector
        var n = h.int32(r, i);
        i += 4;
        var k = 0;
        var a = [];
        while (k < n) {
            var v = h.int8(r, i++);
            a.push((v === 1) ? true : ((v === 0) ? false : null));
            k++;
        }
        if (n === 1) return [a[0], i];
        return [a, i];
    }
    if (ra === 37) { // raw vector
        var len = h.int32(r, i);
        i += 4;
        return [r.slice(i, i + len), i];
    }
    /*
    if (ra === 48) { // unimplemented type in Rserve
        var uit = h.int32(r, i);
        // echo "Note: result contains type #$uit unsupported by Rserve.<br/>";
        return [null, i];
    }
    */
    throw new Error('type ' + ra + ' is not implemented');
}

var mkp_str = function(command, string) {
    var buf = new Buffer(string, 'utf8');
    var n = buf.length + 1;

    var bufs = Buffers();

    bufs.push(h.mkint32(0));
    bufs.push(h.mkint32(0));
    bufs.push(new Buffer([4]));
    bufs.push(h.mkint24(n));
    bufs.push(buf);
    bufs.push(new Buffer([0]));

    while((n & 3) !== 0) {
        bufs.push(new Buffer([1]));
        n++;
    }
    bufs.unshift(h.mkint32(n + 4));
    bufs.unshift(h.mkint32(command));

    return bufs.toBuffer();
}

var eval = function(client, cb, command) {
    var len = -1;
    client.handler = function(data) {
        if(len < 0) {
            if(client.buffers.length >= 16) {
                var buf;

                buf = client.buffers.slice(0, 16);
                len = 16 + h.int32(buf, 4);
            }
        }
        if(client.buffers.toBuffer().length >= len) {
            client.handler = noop;

            var r = client.buffers.splice(0, len).toBuffer();
            var res = h.int32(r);
            var sc = (res >> 24) & 127;
            var rr = res & 255;

            if(rr != 1) {
                cb(new Error('error code ' + sc), null);
            } else if(h.int8(r, 16) != 10) {
                cb(new Error('invalid response (expecting SEXP)'), null);
            } else {
                try {
                    cb(null, parse_SEXP(r, 20)[0]);
                } catch(err) {
                    cb(err, null);
                }
            }
        }
    };
    client.write(mkp_str(3, command));
};

exports.connect = function(host, port, cb) {
    var client = net.connect(port, host);
    client.buffers = Buffers();
    client.handler = function() {
        if(client.buffers.length >= 32) {
            client.handler = noop;
            var rv = client.buffers.splice(0, 32).slice(4, 8).toString('utf8');
            if (rv !== '0103') {
                cb(new Error('Unsupported protocol version ' + rv), null);
            } else {
                cb(null, {
                    end : function() {
                        client.end();
                    },
                    exec : function(command, cb) {
                        eval(client, cb, command);
                    },
                    eval : function(command, cb) {
                        eval(client, cb, command);
                    }
                });
            }
        }
    };
    client.on('data', function(data) {
        client.buffers.push(data);
        client.handler();
    });
};
