var assert = require('assert');
var Promise = require('bluebird');

function equals(input, expectedOutput) {
    return new Promise(function(resolve, reject) {
        require('../lib/rserve').connect('localhost', 6311, function(err, client) {
            if(err) {
                reject(err);
                client.end();
                return;
            }
            client.evaluate(input, function(err, actualOutput) {
                if(err) {
                    reject(err);
                    client.end();
                    return;
                }
                try {
                    assert.deepEqual(actualOutput, expectedOutput);
                } catch(err) {
                    reject(err);
                    client.end();
                    return;
                }
                resolve();
                client.end();
            });
        });
    });
}

describe('rserve-client', function() {
    it('supports numbers, strings, booleans, c() and list()', function() {
        return equals(
                'list(c(2, 3, 5), c("aa", "bb", "cc", "dd", "ee"), c(TRUE, FALSE, TRUE, FALSE, FALSE), 3)',
                [ [ 2, 3, 5 ], [ 'aa', 'bb', 'cc', 'dd', 'ee' ], [ true, false, true, false, false ] ]
            );
    });
});
