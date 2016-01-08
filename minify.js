var get      = function (array, index) {
        return array.length > index ? array[index] : null;
    },

    args     = process.argv.slice(2);
    fs       = require("fs"),
    uglifyjs = require("uglify-js"),
    name     = get(args, 0);

if (!name) {
    console.log("Name missing");
    return;
}

var origin       = name + ".js",
    dest         = name + ".min.js",
    outSourceMap = name + ".min.js.map",
    sourceRoot   = get(args, 1);

fs.exists(origin,
    function(exists) {
        if (!exists) { console.log("File read Error"); return; }
        console.log("Reading " + origin);

        fs.readFile(origin,
            "binary",
            function(error, file) {
                if (error) { console.log(error); return; }
                var options  = {
                        fromString: true,
                        drop_debugger: true,
                        warnings: false
                    },
                    minified;

                if (outSourceMap) { options.outSourceMap = outSourceMap; }
                if (sourceRoot)   { options.sourceRoot   = sourceRoot;   }

                minified = uglifyjs.minify(file, options);

                console.log("Compiling");

                fs.writeFile(dest,
                    minified.code,
                    {},
                    function (error) {
                        if (error) { console.error(error); return };
                        console.log("Writing " + dest);
                    });

                fs.writeFile(outSourceMap,
                    minified.map,
                    {},
                    function (error) {
                        if (error) { console.error(error); return };
                        console.log("Writing " + outSourceMap);
                    });
            });
    });