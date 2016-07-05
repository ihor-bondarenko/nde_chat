var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var chatServer = require('./lib/chat_server');

var cache = {};

if(cluster.isMaster){
    for(var i = 0;i<numCPUs;i++){
        cluster.fork();
    }
    cluster.on('exit',function(worker,code,signal) {
        console.log('worker exited with error code:' + code );
    });
}else{
    var server = http.createServer(function (req, res) {
        var filePath = false;
        if (req.url == '/') {
            filePath = 'public/index.json'
        } else {
            filePath = 'public' + req.url;
        }
        var absPath = './' + filePath;
        serveStatic(res, cache, absPath);
    });

    server.listen(3000, function () {
        console.log('listening');
    });
}
process.on('uncaughtException', function (err) {
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
    console.error(err.stack)
    process.exit(1)
})


    function send404(response) {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.write('Error 404: resource not found');
        response.end();
    }

    function sendFile(response, filePath, fileContents) {
        response.writeHead(
            200,
            {'Content-Type': mime.lookup(path.basename(filePath))}
        );
        response.end();
    }

    function serveStatic(response, cache, absPath) {
        if (cache[absPath]) {
            sendFile(response, absPath, cache[absPath]);
        } else {
            fs.exists(absPath, function (exists) {
                if (exists) {
                    fs.readFile(absPath, function (err, data) {
                        if (err) {
                            send404(response);
                        } else {
                            cache[absPath] = data;
                            sendFile(response, absPath, data);
                        }
                    })
                } else {
                    send404(response);
                }
            });
        }
    }