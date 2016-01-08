var platesExtend = function () {

    var combine = function _combine () {
        var args     = [].slice.call(arguments, 0),
            combined = args.shift(),
            subject,
            key;

        while (args.length) {

            // Harvest first argument
            subject = args.shift();
            for (key in subject) {
                if (subject.hasOwnProperty(key)) {
                    combined[key] = subject[key];
                }
            }
        }
        return combined;
    };

    var unpair = function _unpair (string, seperator) {
        var array = string.split(seperator);

        if (array.length > 1) {
            array[0] = typeof array[0] === "string" ? array[0].trim() : null;
            array[1] = typeof array[1] === "string" ? array[1].trim() : null;
            return array[0] !== null &&
                    array[1] !== null ?
                    array :
                    null;
        }
        return null;
    };

    // sys-if
    plates.extend("sys-if",
        function platesExt$if (node, value, data) {
            var bool = plates.getValue(value, data, node);

            if (!bool && node.parentNode !== null) {
                node.parentNode.removeChild(node);
            }
        });

    // sys-foreach
    plates.extend("sys-foreach",
            function platesExt$foreach (node, value, data) {
                var fragment = document.createDocumentFragment(),
                    array = plates.getValue(value, data, node),
                    parent = node.parentNode;

                // very important to remove this attribute before it'll try to loop thru itself
                node.removeAttribute("sys-foreach");
                if (!array || typeof array.length !== "number") {
                    return;
                }

                [].forEach.call(array,
                    function platesExt$foreach$loop (item, index, arr) {
                        stencil(node)
                            .clone()
                            .process(combine(item, {
                                "$index"  : index,
                                "$number" : index + 1,
                                "$array"  : arr,
                                "$context": data,
                                "$item"   : item
                            }))
                            .append(fragment);
                    });
                // finally
                parent.replaceChild(fragment, node);
            });

    // sys-listen
    plates.extend("sys-listen",
            function platesExt$listen (node, value, data) {
                var values = value.split(",");

                values.forEach(function (value) {
                    var pair = unpair(value, "="),
                        fn;

                    if (pair === null) { return; }

                    fn = plates.getValue(pair[1], data, node);

                    if (typeof fn !== "function") { return; }

                    node.addEventListener(pair[0],
                            function extension$_listener (evt) {
                                evt.originalNode = node;
                                fn.call(node, evt, data);
                            });
                });
            }, {
                process: true
            });


    // sys-attribute
    plates.extend("sys-attribute",
            function extension$textattribute (node, value, data) {
                var pair = unpair(value, "=");

                if (pair === null) { return; }

                pair = [
                    (plates.getValue(pair[0], data, node) || pair[0]),
                    (plates.getValue(pair[1], data, node) || pair[1])
                ];

                node.setAttribute.apply(node, pair);
            }, {
                process: true
            });


    // sys-attribute-no-process
    plates.extend("sys-attribute-no-process",
            function extension$textattribute (node, value, data) {
                var pair = unpair(value, "=");

                if (pair === null) { return; }

                pair = [
                    (plates.getValue(pair[0], data, node) || pair[0]),
                    (plates.getValue(pair[1], data, node) || pair[1])
                ];

                node.setAttribute.apply(node, pair);
            });

    // sys-include
    plates.extend("sys-include",
            function extension$include (node, value, data) {

                // First thing
                node.removeAttribute("sys-include");
                plates(plates.getValue(value, data, node) || value)
                        .process(data)
                        .replace(node);
            });

};





