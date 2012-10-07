/*!
 * Stencil JavaScript Templating Engine v1.0.4
 * git://github.com/watermelonbunny/Stencil.git
 * Watermelonbunny
 */
var Stencil = function (templatesFileLocation, options) {
    options = options || {};
    var _templates = {},
        _templatesFileLocation = templatesFileLocation || 'Templates.html',
        _templateTagName = options.templateTagName || 'template',
        // functions
        _meOrNothing = function (func) {
            return typeof func === 'function' ? func : function (args) {
                return args;
            };
        },
        _checkNodeType = (function () {
            var nodeTypes = typeof document.defaultView.Node === 'object' ? document.defaultView.Node : {
                'ELEMENT_NODE': 1,
                'TEXT_NODE': 3,
                'DOCUMENT_FRAGMENT_NODE': 11
            };
            return function (node, nodeType) {
                nodeType = nodeType.toUpperCase();
                return typeof node.nodeType === 'number' && node.nodeType === nodeTypes[nodeType];
            };
        })(),
        _isDOMElement = function (element) {
            var isDOMElement = false;
            try {
                isDOMElement = element instanceof HTMLElement;
            } catch (e) {
                isDOMElement = (typeof element === 'object' &&
                                _checkNodeType(element, 'ELEMENT_NODE') &&
                                (typeof element.style === 'object') &&
                                (typeof element.ownerDocument === 'object'));
            }
            return isDOMElement;
        },
        _getElementOrQuery = function (element) {
            var returnElement;
            if (_isDOMElement(element) || _checkNodeType(element, 'DOCUMENT_FRAGMENT_NODE')) {
                return element;
            } else if (typeof element === 'string') {
                returnElement = document.querySelector(element);
                return _getElementOrQuery(returnElement);
            } else {
                new Error('Stencil.js Error: unable to obtain element');
            }
        },
        _getConstants = function (name) {
            if (typeof name !== 'string') {
                new Error('Stencil.js Error: Attribute name must be a string');
                return undefined;
            };
            var constants = {
                'IF': 'sys-if',
                'LISTENER': 'sys-listener',
                'LISTENER_SEPERATOR': '::',
                'DATA': 'sys-data',
                'TEMPLATE': 'sys-template',
                'INCLUDE': 'sys-include',
                'CONVERT': 'sys-convertdata',
                'HANDLE': 'sys-handleelement'
            };
            return constants[name.toUpperCase()];
        },
        _pattern = function () {
            return /\{\{.*\}\}/gmi;
        },
        _trim = function (string) {
            return string.replace(/(^[\s]+|[\s]+$)/g, '');
        },
        _removeCurlyBrackets = function (string) {
            return string.replace(/\{\{( )*/gmi, '').replace(/( )*\}\}/gmi, '');
        },
        _stringToObject = function (string) {
            var array = string.split('.'),
                object = document.defaultView,
                i = 0,
                loops = array.length;
            for(; i < loops; i++) {
                object = object[array[i]];
            }
            return object;
        },
        _addListener = (function () {
            // use feature detection to determine which type of eventListener to apply
            // event name can be a list style string (e.g. 'click,change')
            if (typeof document.defaultView.addEventListener === 'function') {
                return function (obj, evt, func) {
                    if (!_isDOMElement(obj) || typeof evt !== 'string' || typeof func !== 'function') {
                        new Error('Stencil.js Error: Listener not attached');
                    } else {
                        var events = evt.split(','),
                            i = events.length;
                        while (i--) {
                            obj.addEventListener(_trim(events[i]), func);
                        }
                    }
                    return obj;
                };
            } else if (typeof document.attachEvent === 'function') {
                return function (obj, evt, func) {
                    if (!isDOMElement(obj) || typeof evt !== 'string' || typeof func !== 'function') {
                        new Error('Stencil.js Error: Listener not attached');
                    } else {
                        var events = evt.split(','),
                            i = events.length;
                        while (i--) {
                            obj.attachEvent(_trim(events[i]), func);
                        }
                    }
                    return obj;
                };
            } else {
                return function (obj, evt, func) {
                    if (!isDOMElement(obj) || typeof evt !== 'string' || typeof func !== 'function') {
                        new Error('Stencil.js Error: Listener not attached');
                    } else {
                        var events = evt.split(','),
                            i = events.length;
                        while (i--) {
                            obj['on' + _trim(events[i])] = func;
                        }
                    }
                    return obj;
                };
            }
        })(),
        _removeListener = (function () {
            if (typeof document.defaultView.removeEventListener === 'function') {
                return function (obj, evt, func) {
                    if (!isDOMElement(obj) || typeof evt !== 'string' || typeof func !== 'function') {
                        new Error('Stencil.js Error: Listener not attached');
                    } else {
                        var events = evt.split(','),
                            i = events.length;
                        while (i--) {
                            obj.removeEventListener(_trim(events[i]), func);
                        }
                    }
                    return obj;
                };
            } else if (typeof document.detachEvent === 'function') {
                return function (obj, evt, func) {
                    if (!isDOMElement(obj) || typeof evt !== 'string' || typeof func !== 'function') {
                        new Error('Stencil.js Error: Listener not attached');
                    } else {
                        var events = evt.split(','),
                            i = events.length;
                        while (i--) {
                            obj.detachEvent(_trim(events[i]), func);
                        }
                    }
                    return obj;
                };
            } else {
                return function (obj, evt) {
                    if (!isDOMElement(obj) || typeof evt !== 'string') {
                        new Error('Stencil.js Error: Listener not attached');
                    } else {
                        var events = evt.split(','),
                            i = events.length;
                        while (i--) {
                            obj['on' + _trim(events[i])] = null;
                        }
                    }
                    return obj;
                };
            }
        })(),
        _getTemplate = function (name) {
            if (_checkNodeType(_templates[name], 'ELEMENT_NODE') === false) {
                new Error('Stencil.js Error: Template not found');
                return false;
            }
            return _templates[name].cloneNode(true); // return a clone
        },
        _create = function (templateName) {
            var temporary = typeof templateName === 'string' ? _getTemplate(templateName) : templateName,
                fragment = document.createDocumentFragment(),
                children = temporary.childNodes;
            // move all element children from 'temporary' (cloned template) to 'fragment'
            // * Elements only (first generation children)
            while (temporary.childNodes.length > 0) {
                if (typeof temporary.childNodes[0] === 'object' && _checkNodeType(temporary.childNodes[0], 'ELEMENT_NODE')) {
                    fragment.appendChild(temporary.childNodes[0]);
                } else {
                    temporary.removeChild(temporary.childNodes[0]);
                }
            }
            temporary = null; // deallocate 'temporary'
            return fragment;
        },
        _replaceKeys = function (string, dataitem) {
            // replace in string key wrapped with double curley barckets and 0 or more whitespaces
            for (var key in dataitem) {
                var regex = new RegExp('\\{{( )*' + key + '( )*\\}}', 'gmi');
                string = string.replace(regex, dataitem[key]);
            }
            return string;
        },
        _replaceNodeValue = function (node, dataitem) {
            var text = node.nodeValue,
                    newNode,
                    key;
            for (key in dataitem) {
                text = _replaceKeys(text, dataitem);
            }
            // remove remaining {{*}} strings
            text = text.replace(_pattern(), '');
            newNode = document.createTextNode(text);
            node.parentNode.replaceChild(newNode, node);
            return text;
        },
        _replaceNodeAttributes = function (node, dataitem) {
            if (typeof node.attributes === 'object' && node.attributes !== null) {
                var iterate = node.attributes.length,
                    attributeNames = {
                        'if': _getConstants('if'),
                        'listener': _getConstants('listener'),
                        'handle': _getConstants('handle'),
                        'include': _getConstants('include'),
                        'convert': _getConstants('convert'),
                    },
                    convertdata = dataitem[node.getAttribute(attributeNames['convert'])],
                    attrName = '';
                if (typeof convertdata === 'function') {
                    // in case convert data action reqired, change dataitem accordingly
                    dataitem = _convertAndMergeData(dataitem, convertdata(dataitem));
                    node.removeAttribute(attributeNames['convert']);
                    iterate = node.attributes.length; // fix the attributes object
                }
                while (iterate--) {
                	attrName = node.attributes[iterate].name;
                    switch (attrName) {
                        case (attributeNames['if']):
                            if (!dataitem[_removeCurlyBrackets(node.getAttribute(attrName))]) {
                                // convert attribute to boolean; false == false || null || undefined || 0 || ''
                                node.parentNode.removeChild(node);
                            } else {
                                node.removeAttribute(attrName);
                            }
                            break;
                        case (attributeNames['listener']):
                            _addHandler(node, _removeCurlyBrackets(node.getAttribute(attrName)), dataitem);
                            node.removeAttribute(attrName);
                            break;
                        case (attributeNames['handle']):
                            codeafter = dataitem[_removeCurlyBrackets(node.getAttribute(attrName))] || _stringToObject(node.getAttribute(attrName));
                            if (typeof codeafter === 'function') {
								setTimeout(function () {
									codeafter(node);
								}, 15);
                            }
                            node.removeAttribute(attrName);
                            break;
                        case (attributeNames['include']):
                            node.appendChild(Stencil.get(_removeCurlyBrackets(node.getAttribute(attrName)), dataitem));
                            node.removeAttribute(attrName);
                            break;
                        default:
                            _replaceNodeAttribute(node, node.attributes[iterate].name, dataitem);
                            break;
                    }
                }
            }
            return node;
        },
        _addHandler = function (element, listenerString, dataitem) {
            var listener_seperator = _getConstants('listener_seperator');
            // break up listener to event and function
            if (typeof listenerString !== 'string' || listenerString.indexOf(listener_seperator) === -1 || typeof dataitem !== 'object') {
                return false;
            }
            var listenerArray = listenerString.split(listener_seperator),
                func = typeof dataitem[listenerArray[1]] === 'function' ? dataitem[listenerArray[1]] : _stringToObject(listenerArray[1]);
            if (typeof func === 'function') {
                _addListener(element, listenerArray[0], func);
            }
        },
        _replaceNodeAttribute = function (node, attributeName, dataitem) {
            node.setAttribute(attributeName, _replaceKeys(node.getAttribute(attributeName), dataitem));
            return node;
        },
        _nodeReplacements = function (element, dataitem) {
            var i = element.childNodes.length;
            if (_checkNodeType(element, 'TEXT_NODE') && _pattern().test(element.nodeValue)) {
                _replaceNodeValue(element, dataitem);
            } else {
                if (_checkNodeType(element, 'ELEMENT_NODE') && typeof element.getAttribute(_getConstants('data')) === 'string') {
                    _createCycle(element, dataitem);
                } else {
                    if (_checkNodeType(element, 'DOCUMENT_FRAGMENT_NODE') === false) {
                        // is not fragment
                        _replaceNodeAttributes(element, dataitem);
                    }
                    // do same for children
                    while (i--) {
                        _nodeReplacements(element.childNodes[i], dataitem);
                    }
                }
            }
            return element;
        },
        _convertAndMergeData = function (dataitem, convertdata) {
            for (var key in convertdata) {
                dataitem[key] = convertdata[key];
            }
            return dataitem;
        },
        _createCycle = function (cycleElement, dataitem) {
            if (typeof dataitem !== 'object') {
                return false;
            }
            var dataArray = dataitem[cycleElement.getAttribute(_getConstants('data'))] || [],
                template = cycleElement.getAttribute(_getConstants('template')),
                convertdata = dataitem[cycleElement.getAttribute(_getConstants('convert'))],
                parent = cycleElement.parentNode;
            if (typeof dataArray.length === 'number') {
                var frag = _createList(template, dataArray, convertdata);
                parent.replaceChild(frag, cycleElement);
            }
            return parent;
        },
        _createList = function (template, dataArray, convertdata) {
            var fragment = document.createDocumentFragment();
            // check if it's as Array
            for (var i = 0, loops = dataArray.length; i < loops; i++) {
                convertdata = _meOrNothing(convertdata);
                fragment.appendChild(Stencil.get(template, _convertAndMergeData(dataArray[i], convertdata(dataArray[i]))));
            }
            return fragment;
        };
    // load templates document
    (function (templatesFileLocation) {
        var XHR = new XMLHttpRequest(),
            doc = document.implementation.createHTMLDocument('TemplatesDocument'),
            templatesArray = [],
            i = 0;
        XHR.open('GET', templatesFileLocation, false); // sync load (wait for load event)
        XHR.setRequestHeader('Content-Type', 'text/html');
        XHR.onload = function (evt) {
            if (XHR.readyState === 4 && (XHR.status === 200 || XHR.status === 0)) { // 0 for localhost
                doc.body.innerHTML = XHR.responseText; // parse the HTML
                templatesArray = doc.getElementsByTagName(_templateTagName);
                i = templatesArray.length;
                while (i--) {
                    // keep the DOM Elements in a nicely named array
                    _templates[templatesArray[i].getAttribute('name')] = templatesArray[i];
                }
                doc = null; // destroy the doc
            }
        }
        try {
            XHR.send();
        } catch (error) {
            alert(error.name + ': ' + error.code + '\n\r' + error.message);
        }
    })(_templatesFileLocation);
    // Exposed (and priviliged) functions
    return {
        get: function (templateName, dataitem, runcode) {
            dataitem = dataitem || {};
            runcode = _meOrNothing(runcode);
            return runcode(_nodeReplacements(_create(templateName), dataitem));
        },
        insert: function (parent, templateName, dataitem, runcode) {
            parent = _getElementOrQuery(parent);
            if (parent.childNodes.length > 0) {
                return _getElementOrQuery(parent).insertBefore(this.get(templateName, dataitem, runcode), parent.firstChild);
            } else {
                return this.append(parent, templateName, dataitem, runcode);
            }
        },
        append: function (parent, templateName, dataitem, runcode) {
            return _getElementOrQuery(parent).appendChild(this.get(templateName, dataitem, runcode));
        },
        clearAndAppend: function (parent, templateName, dataitem, runcode) {
            parent = _getElementOrQuery(parent);
            parent.innerHTML = '';
            return this.append(parent, templateName, dataitem, runcode);
        }
    };
};
/* IMPLEMENT:
 * Stencil = Stencil('Templates.html', { templateTagName: 'template' });
 */
/* EXAMPLE:
 * Stencil.append('#myDiv', 'templateName', {}, Translate);
 */