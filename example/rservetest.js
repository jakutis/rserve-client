require('../lib/rserve').connect('localhost', 6311, function(err, client) {
    var command = 'a<-list(1,c("ab","cd"))';
    console.log('evaluating', command);
    client.eval(command, function(err, ans) {
        console.log('answer', ans);

        var command = 'a';
        console.log('evaluating', command);
        client.eval(command, function(err, ans) {
            console.log('answer', ans);
            client.end();
        });
    });
});
