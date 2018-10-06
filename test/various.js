'use strict';

var fs = require('fs');
var exec = require('child_process').exec;
var assert = require('assert');
var Promise = require('bluebird');

function evaluate(client, input, output) {
    return new Promise(function (resolve, reject) {
        client.evaluate(input, function(evaluateError, actualOutput) {
            if(evaluateError) {
                reject(evaluateError);
                return;
            }
            try {
                assert.deepEqual(actualOutput, output);
            } catch(testError) {
                reject(testError);
                return;
            }
            resolve();
        });
    });
}

function equals(input, expectedOutput) {
    return new Promise(function(resolve, reject) {
        require('../lib/rserve').connect('localhost', 6311, function(err, client) {
            if(err) {
                reject(err);
                client.end();
                return;
            }
            evaluate(client, input, expectedOutput)
                .then(function () {
                    client.end();
                    resolve();
                }, function (err) {
                    client.end();
                    reject(err);
                });
        });
    });
}

describe('rserve-client', function() {
    it('calls back with error when server does not exist', function() {
        return new Promise(function(resolve, reject) {
            require('../lib/rserve').connect('localhost', 1136, function(err) {
                if(err) {
                    resolve();
                } else {
                    reject(new Error('did not receive error'));
                }
            });
        });
    });
    it('supports numbers, strings, booleans, c() and list()', function() {
        return equals(
                'list(c(2, 3, 5), c("aa", "bb", "cc", "dd", "ee"), c(TRUE, FALSE, TRUE, FALSE, FALSE), 3)',
                [ [ 2, 3, 5 ], [ 'aa', 'bb', 'cc', 'dd', 'ee' ], [ true, false, true, false, false ] ]
            );
    });
    it('supports double matrices', function() {
        return equals('matrix(c(1,2,3,4), 2, 2)', [[1,2],[3,4]]);
    });
    it('supports complex matrices', function() {
        return equals('matrix(as.complex(c(12+3.14i,2,3,4)), 2, 2)', [[[12,3.14],[2,0]],[[3,0],[4,0]]]);
    });
    it('supports boolean matrices', function() {
        return equals('matrix(c(T,F,T,F), 2, 2)', [[true,false],[true,false]]);
    });
    it('supports string matrices', function() {
        return equals('matrix(c("a","b","c","d"), 2, 2)', [['a','b'],['c','d']]);
    });
    it('supports integer matrices', function() {
        return equals('matrix(as.integer(c(1,2,3,4)), 2, 2)', [[1,2],[3,4]]);
    });
    it('reconnects', function () {
        var pidfile = __dirname + '/../rs.pid';

        return new Promise(function(resolve, reject) {
            require('../lib/rserve').connect('localhost', 6311, function(err, client) {
                if(err) {
                    reject(err);
                    client.end();
                    return;
                }
                evaluate(client, '2+2', '4')
                    .then(function () {
                        return new Promise(function (resolve) {
                            exec('killall Rserve', resolve);
                        });
                    })
                    .then(function () {
                        if (fs.existsSync(pidfile)) {
                            throw new Error('failed to stop');
                        }
                        return new Promise(function(resolve) {
                            exec('npm run start-rserve', resolve);
                        });
                    })
                    .then(function () {
                      return new Promise(function (resolve) {
                        var interval = setInterval(function () {
                          if (fs.existsSync(pidfile)) {
                            clearInterval(interval);
                            resolve();
                          }
                        }, 100);
                      });
                    })
                    .then(function () {
                        return evaluate(client, '3+3', '6');
                    })
                    .then(function () {
                        client.end();
                        resolve();
                    }, function (err) {
                        client.end();
                        reject(err);
                    });
          });
      });
    });
});
