'use strict';

var binary = require('binary');
var jspack = require('jspack').jspack;

exports.flt64 = function(buf, o) {
    return jspack.Unpack("<d", buf, o | 0);
};
exports.int8 = function(buf, o) {
    return binary.parse(buf.slice(o | 0)).word8lu('n').vars.n;
};
exports.int16 = function(buf, o) {
    return binary.parse(buf.slice(o | 0)).word16lu('n').vars.n;
};
exports.int24 = function(buf, o) {
    o = o | 0;
    return buf[o] | buf[o + 1] << 8 | buf[o + 2] << 16;
};
exports.int32 = function(buf, o) {
    return binary.parse(buf.slice(o | 0)).word32lu('n').vars.n;
};
exports.mkint32 = function(i) {
    return new Buffer([i & 255, (i >> 8) & 255, (i >> 16) & 255, (i >> 24) & 255]);
};
exports.mkint24 = function(i) {
    return new Buffer([i & 255, (i >> 8) & 255, (i >> 16) & 255]);
};
