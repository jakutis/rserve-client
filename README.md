# rserve-client

A stateful client for [Rserve](http://www.rforge.net/Rserve/), a TCP/IP server for [R project](http://www.r-project.org/).

# Example

    var r = require('rserve-client');
    r.connect('localhost', 6311, function(err, client) {
        client.eval('a<-2.7+2', function(err, ans) {
            console.log(ans);
            client.end();
        });
    });

See example directory.

# Methods

## r.connect(hostname, port, callback)

Connects to Rserve at hostname on port and returns the connection via callback.

## connection.eval(command, callback)

Evaluates the given command on Rserve and returns the result via callback.

## connection.end()

Ends the connection by closing the socket.

# Installation

To install with [npm](http://github.com/isaacs/npm):

    npm install rserve-client

# License

MIT
