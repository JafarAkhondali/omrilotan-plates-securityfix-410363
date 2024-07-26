var http = require("http"),
    url  = require("url"),
    path = require("path"),
    fs   = require("fs"),
    base = "",
    port = 0,
    def  = "/readme.md";

[].shift.call(process.argv);    // program
[].shift.call(process.argv);    // file
if (process.argv.length > 0) {
    port = parseInt([].shift.call(process.argv), 10);
}
if (process.argv.length > 0) {
    base = [].shift.call(process.argv);
}

exports.init = function (base, port) {
    base = base || process.cwd;
    port = port || 1337;
    http.createServer(function (request, response) {
    if (path.normalize(decodeURI(request.url)) !== decodeURI(request.url)) {
        response.statusCode = 403;
        response.end();
        return;
    }

        var root = "",
            uri = root + url.parse(request.url).pathname,
            filename = path.join(base(), uri),
            errorHandler = function (error, code) {
                response.writeHead(code, {"Content-Type": "text/plain"});
                response.write(code + " \n" + error + " \n");
                response.end();
                return;
            };

        fs.exists(filename, function(exists) {
            if(!exists) {
                errorHandler("Not Found", 404)
                return;
            }

            if (fs.statSync(filename).isDirectory()) {
                filename += def;
            }

            fs.readFile(filename, "binary", function(error, file) {
                if (error) {
                    errorHandler(error, 500)
                    return;
                }

                response.writeHead(200);
                response.write(file, "binary");
                response.end();
            });
        });
    }).listen(parseInt(port, 10), "127.0.0.1");

    console.log("Static file server running at\n  => http://127.0.0.1:" + port + "/\nCTRL + C to shutdown");
};

exports.init(base, port);
