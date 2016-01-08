// Dependencies:
// XMLHttpRequest
// String.prototype.trim
// Array.prototype.reduce
// Array.prototype.forEach


var plates = plates || (function __plates__ (window, document, FUNCTION, OBJECT, NUMBER, STRING, BOOLEAN, TEXT_HTML, IMPORT, undefined) {
    "use strict";

    var noop = function noop () {},

        // Settings
        /////////////

        // Queries
        Q = {                                                // Set up constants:
            ATTRIBUTE: "template-name",                      // Attribute for searching template objects in the HTML file
            SCRIPT   : "script[type=\"text/templates\"]",    // Script type for searching template strings on the page
            LINK     : "link[rel=\"import\"]"        // HTML Imports Resources on other origins must be CORS-enabled
        },

        // Default options
        defaults = {

            // Fall-back for default (native) CSS selectors
            querySelectorAll: function plates$def$_querySelectorAll () {
                defaults.onerror("No DOM querying method supplied");
                return [];      // simulate no matches
            },
            querySelector: function plates$def$_querySelector () {
                defaults.onerror("No DOM querying method supplied");
                return null;    // simulate no match
            },
            onerror : noop,     // Report errors to a custom method
            async   : false,    // Whether external templates file will load asynchronously
            evaluate: false,    // Whether to allow evaluation on value strings
            scope   : window    // Add a scope for dot notation references
        },

        extensions     = {},    // Store plates extensions here
        readyListeners = [],    // Store all "ready" listeners

        exports,                // Interface

        // Environment
        supportsImport = IMPORT in document.createElement("link"),

        // Helpers
        selector, selectAll, select,
        pushFirst, combine,
        readyCaller,
        getNodeType, isDOMElement, isDocumentElement,
        parse,
        retrieveString, getElementOrQuery, isValidValue, getValue,
        pattern, cleanString, resolveDotNotation, processString,
        frag, xhrCall, importHTMLDocument, getAndScanFile,

        iterate, processElementAttributes, processElementNode, processTextNode, handle, process,
        templatesManager, Template;

    // -------------------------- //
    // Wrapped options methods
    // -------------------------- //
    selector = function () {
        return "*[" + Q.ATTRIBUTE + "]";
    },
    selectAll = function plates$_querySelectorAll (query, context) {
        context = context || document;
        return typeof context.querySelectorAll === FUNCTION ?
                context.querySelectorAll(query) :
                defaults.querySelectorAll(query, context);
    };

    select = function plates$_querySelector (query, context) {
        context = context || document;
        return typeof context.querySelector === FUNCTION ?
                context.querySelector(query) :
                defaults.querySelector(query, context);
    };

    pushFirst = function plates$_pushFirst (array) {
        while (arguments.length > 1) {
            array.unshift([].pop.call(arguments));
        }
        return array;
    };

    combine = function plates$_combine () {
        var combined = [].pop.call(arguments),
            subject,
            key;
        while (arguments.length) {
            subject = [].pop.call(arguments);
            for (key in subject) {
                if (subject.hasOwnProperty(key)) {
                    combined[key] = subject[key];
                }
            }
        }
        return combined;
    };

    readyCaller = function plates$_readyCaller () {
        while (readyListeners.length) {
            readyListeners.pop()();
        }
    };

    getNodeType = function plates$_getNodeType (node) {
        return typeof node === OBJECT &&
                node !== null &&
                typeof node.nodeType === NUMBER ?
                node.nodeType : 0;
    };
    isDOMElement = function plates$_isDOMElement (element) {
        var nodeType = getNodeType(element);
        return nodeType === 1 ||    // DOCUMENT_FRAGMENT_NODE
               nodeType === 11;     // ELEMENT_NODE / DOCUMENT_POSITION_DISCONNECTED
    };
    isDocumentElement = function plates$_isDocumentElement (element) {
        return getNodeType(element) === 9;      // DOCUMENT_NODE
    };

    // Render Markup from string
    parse = (function plates$parse__ () {
        var canParse;
        if (typeof DOMParser === FUNCTION) {
            try {
                (new DOMParser()).parseFromString("", TEXT_HTML);
                canParse = true;
            } catch (err) {
                // Do nothing
            }
        }

        if (canParse === true) {
            return function plates$parse (string) {
                return (new DOMParser()).parseFromString(string, TEXT_HTML);
            };
        } else if (typeof document.implementation.createHTMLDocument === FUNCTION) {
            return function plates$parse (string) {
                var parser = document.implementation.createHTMLDocument("TemplatesDocument").body;
                parser.innerHTML = string;
                return parser;
            }
        } else {
            return function plates$parse (string) {
                parser = document.createElement("div");
                parser.innerHTML = string;
                return parser;
            }
        }
    }());

    retrieveString = function plates$_retrieveString (item) {
        return item.text        ||     // scripts
               item.textContext ||     // FF
               item.innerText   ||     // Conform
               item.innerHTML;         // Worst case
    };

    getElementOrQuery = function plates$_getElementOrQuery (element) {
        if (typeof element === STRING) {
            element = select(element, document);
        }
        if (isDOMElement(element)) {
            return element;
        }
        defaults.onerror("Did not find query element: " + element);
        return frag();    // Keep the code running
    };

    // This value can return to the user
    isValidValue = function plates$_isValidValue (value) {
        return value !== undefined &&
               value !== null &&

                // Also check for a bad number input
                // * isNaN(function(){}) may return true
                !(typeof value === NUMBER && isNaN(value));
    };

   // Get value for extension attribute values
    getValue = function plates$_getValue (value, data, node) {
        var nValue = resolveDotNotation(cleanString(value), data);

        // This exit point is for cases where "resolveDotNotation"
        //     was enough to retrieve the value even when evaluation is turned on
        //     0, false and an empty string (for example) are okay
        if (isValidValue(nValue)) {
            return nValue;
        }

        // check for parentheses ()
        if (defaults.evaluate === true && /\(.*\)/gmi.test(value)) {
            try {

                // Try to run the text as javascript function's body
                //     introduce two arguments: $data and $element
                nValue = (new Function("$data", "$element", "$scope",
                        "return (" + value + ")"));
                return nValue.call(null, data, node, defaults.scope);
            } catch (e) {
                defaults.onerror("Evaluation Error: " + e.message);
            }
        }
        return;    // undefined
    };

    // Remove curly brackets and 0 or more white spaces
    cleanString = function plates$_cleanString (string) {
        return typeof string === STRING ?
                string.replace(/\{\{\s*|\s*\}\}/gmi, "").trim() : "";
    };

    // Retrieve a data member from strings representing objects
    //     or return an object from the the global scope
    //     failed notation returns undefined
    resolveDotNotation = function plates$_resolve (string, context) {
        var value;
        context = typeof context === OBJECT ? context : defaults.scope;
        value   = pushFirst(string.split("."), context)
                .reduce(function plates$_resolve$reduce (obj, index) {
            return typeof obj === OBJECT &&
                    obj.hasOwnProperty(index) ?
                    obj[index] : undefined;
        });
        if (value === undefined) {
            if (context        !== defaults.scope &&
                context        !== window &&
                defaults.scope !== window) {

                // Retry on a saved scope
                value = resolveDotNotation(string, defaults.scope);
            } else if (context !== window) {

                // Retry on the global scope
                value = resolveDotNotation(string, window);
            }
        }
        return value;
    };

    // This is the pattern which hold replaceable variables: {{ XXX }}
    pattern = function plates$_pattern () {

        // We create a new one each time to get an empty regex
        return /\{\{.*\}\}/gmi;
    };

    // Find and replace within a string:
    //     keys wrapped with double curly brackets and 0 or more white spaces
    processString = function plates$_procStr (string, data, node) {

        // If there are any matches
        if (pattern().test(string)) {

            // Loop through an array of matches {{XXX}}
            string.match(/(\{\{.*?\}\})/gmi).forEach(function plates$_procStr$match (item) {
                var resolved;
                if (defaults.evaluate === true &&
                        /\(.*\)/gmi.test(string)) {    // check for parentheses ()
                    resolved = getValue(cleanString(item), data, node);
                } else {
                    resolved = resolveDotNotation(cleanString(item), data);
                }
                string = string.replace(item,

                        // 0, false, objects etc. will display their string representation
                        (resolved !== null &&
                         resolved !== undefined ?
                                resolved.toString() : ""));
            });
        }
        return string;
    };

    frag = function () {
        return document.createDocumentFragment();
    },

    xhrCall = function plates$_xhrCall (url, callback, options) {
        var XHR = new XMLHttpRequest(),
            vars = combine({
                async : false,
                method: "GET",
                type  : TEXT_HTML
            }, options);

        XHR.open(vars.method, url, vars.async);
        XHR.setRequestHeader("Content-Type", vars.type);
        XHR.onreadystatechange = function plates$_xhrCall$onreadystatechange () {
            if (XHR.readyState === 4 &&

                    (XHR.status === 200 ||    // 200: ready
                     XHR.status === 0)) {     // 0: localhost
                callback(XHR.responseText);
            }
        };
        XHR.send();
        // false 'async' (default) waits here for the load event
    };

    importHTMLDocument = function plates$_importHTMLDoc (uri, callback) {
        var link = document.createElement("link"),
            head = document.head || document.getElementsByTagName("head")[0];

        link.rel    = IMPORT;
        link.href   = uri;
        link.onload = function plates$_importHTMLDoc$callback () {
            callback(link[IMPORT]);
            head.removeChild(link);    // Clean up
        };
        link.onerror = function plates$_importHTMLDoc$error (evt) {
            defaults.onerror(evt.message);
        };
        head.appendChild(link);
    };

    // Retrieve a remote file
    getAndScanFile = function plates$_getAndScan (uri, callback) {
        if (supportsImport && defaults.async) {    // Works only with async
            importHTMLDocument(uri, function plates$_getAndScan$callback (doc) {
                templatesManager.store(selectAll(selector(), doc));
                callback();
            });
        } else {
            xhrCall(uri, function plates$_getAndScan$callback (string) {
                exports.add(string);
                callback();
            }, { async: defaults.async });
        }
    };

    iterate = function plates$_iterate (node, data) {
        document.createNodeIterator = document.createNodeIterator ||
                                      document.createTreeWalker;
        if (typeof document.createNodeIterator === FUNCTION) {
            // Use NodeFilter to traverse the DOM

            var iterator = document.createNodeIterator(
                    node,    // Root for traversal
                    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, // consider NodeFilter.SHOW_ALL as well
                    null,    // No filter method
                    false);

            // Start traversing
            node = iterator.nextNode();
            while (node !== null) {
                process(node, data);
                node = iterator.nextNode();
            }
        } else {

            // Fall-back: Iterate over a copy of childNodes
            //    Use .slice to duplicate childNodes and protect the original tree
            //    for cases where the childNodes collection mutate in the process
            [].forEach.call([].slice.call(node.childNodes, 0),
                    function plates$_iterate$procEngine (item) {
                process(item, data);

                // And down the recursive rabbit hole we go!
                if (item.childNodes && item.childNodes.length) {
                    iterate(item, data);
                }
            });
        }
    };
    processElementAttributes = function plates$_procAttr (node, data, attribute) {
        var name      = attribute.nodeName || attribute.name,
            value     = attribute.value    || attribute.nodeValue || node.getAttribute(name),
            extension = extensions[name];

        // TODO: Check if this confirmation is still required after
        //     switching the attribute iterator from "forEach" to "while" loop
        if (name === null) {    // The attribute could have been removed
            return;
        }

        // If an extension was registered for the attribute name
        if (typeof extension === OBJECT &&
                typeof extension.method === FUNCTION) {

            // Execute the registered function
            if (extension.options.process === true) {
                value = processString(value, data, node) || value;
            }
            if (extension.options.clean !== false) {
                value = cleanString(value);
            }

            extension.method.call(null,
                    node,
                    value,
                    data);

            // After handling the extension, remove the attribute
            //     unless specified differently
            if (extension.options.remove !== false) {
                node.removeAttribute(name);
            }
        } else {
            value = processString(value, data, node);
            node.setAttribute(name, value);
        }
    };
    processElementNode = function plates$_procEleNode (node, data) {
        var i;
        if (node.attributes !== null &&
                typeof node.attributes === OBJECT &&
                node.attributes.length) {

            // Iterate through the extensions
            //     * forEach is not used in case attributes get removed
            i = node.attributes.length;
            while (i--) {
                processElementAttributes(node, data, node.attributes[i]);
            }
        }
        return node;
    };
    processTextNode = function plates$_procTxtNode (node, data) {

        // First see if the replacement is necessary
        if (pattern().test(node.nodeValue)) {
            var text = processString(node.nodeValue,
                    data,
                    (node.parentElement || node.parentNode));

            // Remove remaining {{*}} strings representing no members in the "data" object
            text = text.replace(pattern(), "");

            // Replace the original node with the new one
            if (node.parentNode !== null) {
                node.parentNode.replaceChild(document.createTextNode(text), node);
            }
        }
    };
    handle = {

            // ELEMENT_NODE / DOCUMENT_POSITION_DISCONNECTED
            1: function plates$_handle$element (node, data) {
                processElementNode(node, data);    // changes the node's attributes
            },

            // TEXT_NODE
            3: function plates$_handle$text (node, data) {
                processTextNode(node, data);
            }
    };
    process = function plates$_proc (node, data) {
        var nodeType = getNodeType(node);
        if (typeof handle[nodeType] === FUNCTION) {
            handle[nodeType](node, data);
        }
        return node;
    };

    // -----
    // Templates Manager
    // -----
    templatesManager = (function plates$__tmplMngr__ () {
        var collection = {};    // This is where we store the templates
        return {
            store: function plates$_tmplMngr$store (DOMcollection) {
                [].forEach.call(DOMcollection,
                        function plates$_tmplMngr$store$loop (item) {

                    // Keep the DOM Elements in a nicely named collection
                    // NOTE: it will run over an old member who has the same name
                    collection[item.getAttribute(Q.ATTRIBUTE).trim()] = item;
                });
            },

            // Retrieve template copy by name
            get: function plates$_tmplMngr$get (name) {
                var clone;
                if (!collection.hasOwnProperty(name) ||
                        !isDOMElement(collection[name])) {
                    defaults.onerror("Did not find template " + name);
                    return frag();    // Keep things running
                }

                if (collection[name].content !== undefined) {

                    // <template> Element: Return a recursive clone of the content
                    clone = collection[name].content.cloneNode(true);
                } else {

                    // DOM Element: Return a recursive clone
                    clone = (function plates$_tmplMngr$get$clone (element) {
                        var fragment = frag();
                        while (element.childNodes.length > 0) {
                            fragment.appendChild(element.childNodes[0]);
                        }
                        return fragment;
                    }(collection[name].cloneNode(true)));
                }
                return clone;
            },

            list: function plates$_tmplMngr$list () {
                var list = [],
                    key;
                for (key in collection) {
                    if (collection.hasOwnProperty(key)) {
                        list.push(key);
                    }
                }
                return list;
            }
        };
    }());

    // -----
    // Template constructor
    // -----
    Template = function plates$_Template (name) {
        if (typeof name === STRING) {
            this.element = templatesManager.get(name);
        } else if (isDOMElement(name)) {
            this.element = name;
        } else {
            defaults.onerror(name + " template is not valid");
            this.element = frag();    // Keep things running
        }
    };

    Template.prototype = {

        clone: function plates$_Template$clone () {
            this.element = this.element.cloneNode(true);
            return this;
        },

        process: function plates$_Template$process (data) {
            iterate(this.element, data);
            return this;
        },

        // Append the full template item into a parent element
        append: function plates$_Template$append (parent) {
            parent = getElementOrQuery(parent);
            parent.appendChild(this.element);
            this.element = parent;    // the fragment is now useless
            return this;
        },

        // Insert as a first child
        insert: function plates$_Template$insert (parent) {
            parent = getElementOrQuery(parent);
            if (parent.childNodes.length > 0) {
                parent.insertBefore(this.element, parent.firstChild);
                this.element = parent;    // the fragment is now useless
                return this;
            }

            // If the parent has no children, use append
            return this.append(parent);
        },

        // Empty the parent, then append the template item to it
        // TODO: Decide on a method to use here
        fill: function plates$_Template$fill (parent) {
            parent = getElementOrQuery(parent);

            // Empty the parent from previous resonances
            while (parent.hasChildNodes()) {
                parent.removeChild(parent.lastChild);
            }
            return this.append(parent);
        },

        // Replaces an element with the template item
        replace: function plates$_Template$replace (sibling) {
            sibling = getElementOrQuery(sibling);
            var parent = sibling.parentNode;
            isDOMElement(parent) ?
                    parent.replaceChild(this.element, sibling) :
                    defaults.onerror("Node has no eligible parent");
            this.element = parent;    // the fragment is now useless
            return this;
        },

        // Insert after a child
        after: function plates$_Template$after (sibling) {
            sibling = getElementOrQuery(sibling);
            var parent = sibling.parentNode;
            isDOMElement(sibling.nextSibling) ?
                    parent.insertBefore(this.element, sibling.nextSibling) :
                    parent.appendChild(this.element);
            this.element = parent;    // the fragment is now useless
            return this;
        }
    };


    // -----
    // Interface
    // -----
    exports = function plates (name) {
        return new Template(name);
    };

    exports.listen = function plates$listen (fn) {
        if (typeof fn === FUNCTION) {
            readyListeners.push(fn);
        }
        return exports;
    };

    // -----
    // Adding templates
    // -----
    exports.add = function plates$add (string) {
        if (typeof string !== STRING) {
            defaults.onerror("\"add\" method can only receive a string");
            return exports;
        }
        templatesManager.store(selectAll(selector(), parse(string)));
        return exports;
    };
    exports.scan = (function plates$__scan__ () {
        var scanScripts = function plates$scan$_scanScripts (scripts) {
                [].forEach.call(scripts,
                        function plates$scan$_scanScripts$scriptsLoop (item) {
                    exports.add(retrieveString(item));
                });
            },
            scanElement = function plates$scan$_scanElement (element) {
                templatesManager.store(selectAll(selector(),
                        element));
            },
            scanHTMLImports = function plates$scan$_scanHTMLImports (doc) {
                if (!supportsImport) {
                    return;
                }
                [].forEach.call(selectAll(Q.LINK, doc),
                        function plates$scan$_HTMLImportsLoop (item) {
                    templatesManager.store(selectAll(selector(),
                            item[IMPORT]));
                });
            };
        return function plates$scan () {
            var args = arguments.length > 0 ? arguments : [document],    // default: scan "document"
                count = args.length,
                countdown = function plates$scan$_countdown () {
                    if (--count === 0) {
                        readyCaller();
                    }
                };
            [].forEach.call(args, function plates$scan$attributesLoop (item) {
                if (typeof item === STRING) {
                    getAndScanFile(item, countdown);
                } else if (isDOMElement(item)) {
                    scanElement(item);
                    scanScripts(selectAll(Q.SCRIPT, item));
                    countdown();
                } else if (isDocumentElement(item)) {
                    scanHTMLImports(item);
                    scanElement(item);
                    scanScripts(selectAll(Q.SCRIPT, item));
                    countdown();
                } else {
                    defaults.onerror("Could not scan item " + item);
                    countdown();
                }
            });
            return exports;
        };
    }());

    exports.list = function plates$list () {
        return templatesManager.list();
    };

    // -----
    // Extensions:
    // Register custom attribute names as extensions triggers
    // Will be handled with their respective functions
    // -----
    exports.extend = function plates$extend (name, fn, options) {
        if (typeof name !== STRING &&
            typeof fn   !== FUNCTION) {
            return false;
        }
        extensions[name] = {
            name   : name,
            method : fn,
            options: options || {}
        };
        return true;
    };

    // Helper methods for extensions
    exports.getValue = function plates$getValue () {
        return getValue.apply(null, arguments);
    };
    exports.processString = function plates$processString () {
        return processString.apply(null, arguments);
    };

    // One method to configure many options:
    // async, evaluate, onerror, querySelector, querySelectorAll, scope
    // or query selectors
    exports.config =
    exports.configure =
    exports.customise =
    exports.customize = function plates$customise (alternatives) {
        var key;
        alternatives = alternatives || {};
        for (key in alternatives) {
            if (defaults.hasOwnProperty(key) &&
                    typeof alternatives[key] === typeof defaults[key]) {
                defaults[key] = alternatives[key];
            } else if (Q.hasOwnProperty(key) &&
                    typeof alternatives[key] === typeof Q[key]) {
                Q[key] = alternatives[key];

            }
        }
        return exports;
    };

    return exports;
}(window, document, "function", "object", "number", "string", "boolean", "text/html", "import"));
