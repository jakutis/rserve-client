# rserve-client

A stateful client for [Rserve](http://www.rforge.net/Rserve/), a TCP/IP server for [R project](http://www.r-project.org/).

- [Overview](#overview)
- [Installation](#installation)
- [API](#api)
- [Development](#development)

## Overview

    TODO

## Installation

  Install with [npm](https://www.npmjs.org/package/rserve-client):

    $ npm install --save rserve-client

## API

    var r = require('rserve-client');
    r.connect('localhost', 6311, function(err, client) {
        client.eval('a<-2.7+2', function(err, ans) {
            console.log(ans);
            client.end();
        });
    });

See example directory.

### .connect(hostname, port, callback)

Connects to Rserve at hostname on port and returns the connection via callback.

### connection.eval(command, callback)

Evaluates the given command on Rserve and returns the result via callback.

### connection.exec(command, callback)

Alias of `connection.eval`.

### connection.end()

Ends the connection by closing the socket.

## Development

    TODO
