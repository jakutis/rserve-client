'use strict';

var net = require('net');
var buffers = require('buffers');
var h = require('./helpers');

var noop = function(){};

// Same values as svn://svn.rforge.net/Rserve/trunk/src/Rsrv.h revision 431.
var XT_NULL = 0,
    XT_INT = 1,
    XT_DOUBLE = 2,
    XT_STR = 3,
    XT_LANG = 4,
    XT_SYM = 5,
    XT_BOOL = 6,
    XT_S4 = 7,
    XT_VECTOR = 16,
    XT_LIST = 17,
    XT_CLOS = 18,
    XT_SYMNAME = 19,
    XT_LIST_NOTAG = 20,
    XT_LIST_TAG = 21,
    XT_LANG_NOTAG = 22,
    XT_LANG_TAG = 23,
    XT_VECTOR_EXP = 26,
    XT_VECTOR_STR = 27,
    XT_ARRAY_INT = 32,
    XT_ARRAY_DOUBLE = 33,
    XT_ARRAY_STR = 34,
    XT_ARRAY_BOOL_UA = 35,
    XT_ARRAY_BOOL = 36,
    XT_RAW = 37,
    XT_ARRAY_CPLX = 38,
    XT_UNKNOWN = 48,
    XT_LARGE = 64,
    XT_HAS_ATTR = 128;

var parse_SEXP = function(r, i, attr) {
    var oi, ra, rl, eoa, al, a, ret, names, na, k, retval, rettag, n, v;

    if(typeof attr === 'undefined') {
        attr = null;
    }
    ra = h.int8(r, i);
    rl = h.int24(r, i + 1);

    i += 4;
    eoa = i + rl;

    if ((ra & XT_LARGE) === XT_LARGE) {
        throw new Error('long packets are not implemented');
    }

    if ((ra & XT_HAS_ATTR) == XT_HAS_ATTR) {
        ra ^= XT_HAS_ATTR;
        al = h.int24(r, i + 1);
        attr = parse_SEXP(r, i)[0];
        i += al + 4;
    }
    if (ra === XT_NULL) {
        return [null, i];
    }
    if (ra === XT_VECTOR) {
        a = [];
        while (i < eoa) {
            if(h.int8(r, i) === 255) {
                break;
            }
            ret = parse_SEXP(r, i);
            i = ret[1];
            a.push(ret[0]);
        }
        if (attr !== null && typeof attr.names !== 'undefined') {
            names = attr.names;
            na = {};
            for (k = 0; k < a.length; k++) {
                na[names[k]] = a[k];
            }
            return [na, i];
        }
        return [a, i];
    }
    if (ra === XT_SYMNAME) {
        oi = i;
        while (i < eoa && r[i] !== 0) i++;
        return [r.slice(oi, i).toString('utf8'), i];
    }
    if (ra === XT_LIST_NOTAG || ra === XT_LANG_NOTAG) {
        a = [];
        while (i < eoa) {
            ret = parse_SEXP(r, i);
            i = ret[1];
            a.push(ret[0]);
        }
        return [a, i];
    }
    if (ra === XT_LIST_TAG || ra === XT_LANG_TAG) {
        a = {};
        while (i < eoa) {
            retval = parse_SEXP(r, i);
            if(retval[0] === null) {
                break;
            }
            i = retval[1];
            rettag = parse_SEXP(r, i);
            i = rettag[1];
            a[rettag[0]] = retval[0];
        }
        return [a, i];
    }
    if (ra === XT_ARRAY_INT) {
        a = [];
        while (i < eoa) {
            a.push(h.int32(r, i));
            i += 4;
        }
        if (a.length === 1) return [a[0], i];
        a = convertToMatrix(attr, a);
        return [a, i];
    }
    if (ra === XT_ARRAY_DOUBLE) {
        a = [];
        while (i < eoa) {
            a.push(h.flt64(r, i)[0]);
            i += 8;
        }
        if (a.length === 1) return [a[0], i];
        a = convertToMatrix(attr, a);
        return [a, i];
    }
    if (ra === XT_ARRAY_CPLX) {
        a = [];
        while (i < eoa) {
            a.push([h.flt64(r, i)[0], h.flt64(r, i + 8)[0]]);
            i += 16;
        }
        if (a.length === 1) return [a[0], i];
        a = convertToMatrix(attr, a);
        return [a, i];
    }
    if (ra === XT_ARRAY_STR) {
        a = [];
        oi = i;
        while (i < eoa) {
            if (r[i] === 0) {
                a.push(r.slice(oi, i).toString('utf8'));
                oi = i + 1;
            }
            i++;
        }
        if (a.length === 1) return [a[0], i];
        a = convertToMatrix(attr, a);
        return [a, i];
    }
    if (ra === XT_ARRAY_BOOL) {
        n = h.int32(r, i);
        i += 4;
        k = 0;
        a = [];
        while (k < n) {
            v = h.int8(r, i++);
            a.push((v === 1) ? true : ((v === 0) ? false : null));
            k++;
        }
        if (n === 1) return [a[0], i];
        a = convertToMatrix(attr, a);
        return [a, i];
    }
    if (ra === XT_RAW) {
        n = h.int32(r, i);
        i += 4;
        return [r.slice(i, i + n), i];
    }
    if (ra === XT_UNKNOWN) {
        n = h.int32(r, i);
        i += 4;
        return [new Error('Rserve does not know how to serialize type ' + n), i];
    }
    if (ra === XT_S4) {
        return [new Error('Unable to decode S4 objects - since they are just attribute lists, get their value using R function attributes()'), i];
    }
    throw new Error('type ' + ra + ' is not implemented');
};

var convertToMatrix = function(attr, a) {
    if(attr !== null && Array.isArray(attr.dim)) {
        if(a.length !== attr.dim[0] * attr.dim[1]) {
            throw new Error();
        }
        return a.reduce(function(matrix, el, i) {
            if(i % attr.dim[1] === 0) {
                matrix.push([]);
            }
            matrix[matrix.length - 1].push(el);
            return matrix;
        }, []);
    }
    return a;
};

var mkp_str = function(command, string) {
    var buf, n, bufs;

    buf = new Buffer(string, 'utf8');
    n = buf.length + 1;
    bufs = buffers();

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
};

var evaluate = function(client, cb, command) {
    var len;

    len = -1;
    client.handler = function(data) {
        var buf, r, res, sc, rr;
        if(len < 0) {
            if(client.buffers.length >= 16) {
                buf = client.buffers.slice(0, 16);
                len = 16 + h.int32(buf, 4);
            }
        }
        if(client.buffers.toBuffer().length >= len) {
            client.handler = noop;

            r = client.buffers.splice(0, len).toBuffer();
            res = h.int32(r);
            sc = (res >> 24) & 127;
            rr = res & 255;

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
    var client;

    client = net.connect(port, host);
    client.buffers = buffers();
    client.handler = function() {
        var rv;
        if(client.buffers.length >= 32) {
            client.handler = noop;
            rv = client.buffers.splice(0, 32).slice(4, 8).toString('utf8');
            if (rv !== '0103') {
                cb(new Error('Unsupported protocol version ' + rv), null);
            } else {
                cb(null, {
                    end : function() {
                        client.end();
                    },
                    evaluate : function(command, cb) {
                        evaluate(client, cb, command);
                    }
                });
            }
        }
    };
    client.on('error',function(err){
        cb(err);
    });
    client.on('data', function(data) {
        client.buffers.push(data);
        client.handler();
    });
};
