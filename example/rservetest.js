require('../lib/rserve').connect('localhost', 6311, function(err, client) {
    var command = 'a<-list(c(2, 3, 5), c("aa", "bb", "cc", "dd", "ee"), c(TRUE, FALSE, TRUE, FALSE, FALSE), 3)';
    console.log('evaluating', command);
    client.evaluate(command, function(err, ans) {
        console.log('answer', ans);

        var command = 'a';
        console.log('evaluating', command);
        client.evaluate(command, function(err, ans) {
            console.log('answer', ans);
            client.end();
        });
    });
});
