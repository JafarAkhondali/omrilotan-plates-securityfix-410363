/*!
 * Stencil JavaScript Templating Library v1.0.3
 * git://github.com/watermelonbunny/Stencil.git
 * Watermelonbunny
 */
var Stencil = function (templatesFileLocation, options) {
	options = options || {};
    var _templates = {},
		_templatesFileLocation = templatesFileLocation || 'Templates.html',
		_templateTagName = options.templateTagName || 'template',
		// functions
        _getAttributeName = function (name) {
			if (typeof name !== 'string') {
				new Error('Stencil.js Error: Attribute name must be a string');
				return undefined;
			};
			var constants = {
				IF: 'sys-if',
				LISTENER: 'sys-listener',
				DATA: 'sys-data',
				TEMPLATE: 'sys-template',
				INCLUDE: 'sys-include',
				CONVERT: 'sys-convertdata',
				HANDLE: 'sys-handleelement'
			};
            return constants[name.toUpperCase()];
        },
        _pattern = function () {
			return /\{\{.*\}\}/gmi;
		},
		_trim = function (string) {
			return string.replace(/(^[\s]+|[\s]+$)/g, '');
		},
		_isDOMElement = function (element) {
			var isDOMElement = false;
			try {
				isDOMElement = element instanceof HTMLElement;
			} catch (e) {
				isDOMElement = (typeof element === 'object' &&
								(element.nodeType === 1) &&
								(typeof element.style === 'object') &&
								(typeof element.ownerDocument === 'object'));
			}
			return isDOMElement;
		},
		_addListener = (function () {
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
            if (typeof _templates[name] !== 'object' || // template object found
                typeof _templates[name].nodeType !== 'number' ||
                _templates[name].nodeType !== 1) { // template is a DOM element
                new Error('Stencil.js Error: Template not found');
                return false;
            }
            return _templates[name].cloneNode(true);
        },
        _testPattern = function (string) {
            return _pattern().test(string);
        },
        _clearPattern = function (string) {
            return string.replace(_pattern(), '');
        },
		_create = function (templateName) {
			var temporary = typeof templateName === 'string' ? _getTemplate(templateName) : templateName,
				fragment = document.createDocumentFragment(),
				children = temporary.childNodes;
			while (temporary.childNodes.length > 0) {
				// move all element child nodes to the fragment
				if (typeof temporary.childNodes[0] === 'object' && temporary.childNodes[0].nodeType === 1) {
					// only element nodes transfer
					fragment.appendChild(temporary.childNodes[0]);
				} else {
					// all others are removed
					temporary.removeChild(temporary.childNodes[0]);
				}
			}
			temporary = null; // deallocate memory
			return fragment;
		},
		_removeCurlyBrackets = function (string) {
			return string.replace(/\{\{( )*/gmi, '').replace(/( )*\}\}/gmi, '');
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
			text = _clearPattern(text);
			newNode = document.createTextNode(text);
			node.parentNode.replaceChild(newNode, node);
			return text;
		},
		_replaceNodeAttributes = function (node, dataitem) {
			if (typeof node.attributes === 'object' && node.attributes !== null) {
				var iterate = node.attributes.length,
					attributeNames = {
						'if': _getAttributeName('if'),
						'listener': _getAttributeName('listener'),
						'handle': _getAttributeName('handle'),
						'include': _getAttributeName('include'),
						'convert': _getAttributeName('convert'),
					},
					convertdata = dataitem[node.getAttribute(attributeNames['convert'])];
				if (typeof convertdata === 'function') {
					dataitem = _convertAndMergeData(dataitem, convertdata(dataitem));
				}
				while (iterate--) {
					switch (node.attributes[iterate].name) {
						case (attributeNames['if']):
							if (dataitem[_removeCurlyBrackets(node.getAttribute(attributeNames['if']))] === false) {
								node.parentNode.removeChild(node);
							} else {
								node.removeAttribute(attributeNames['if']);
							}
							break;
						case (attributeNames['listener']):
							_addHandler(node, node.getAttribute(attributeNames['listener']), dataitem);
							node.removeAttribute(attributeNames['listener']);
							break;
						case (attributeNames['handle']):
							codeafter = dataitem[node.getAttribute(attributeNames['handle'])]
							if (typeof codeafter === 'function') {
								codeafter(node);
							}
							break;
						case (attributeNames['include']):
							node.appendChild(Stencil.get(node.getAttribute(attributeNames['include']), dataitem));
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
			// break up listener to event and function
			if (typeof listenerString !== 'string' || listenerString.indexOf('::') === -1 || typeof dataitem !== 'object') {
				return false;
			}
			var listenerArray = listenerString.split('::'),
				func = typeof dataitem[listenerArray[1]] === 'function' ? dataitem[listenerArray[1]] : eval('window.' + listenerArray[1]); // TODO element.ownerDocument[name]
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
			if (element.nodeType === 3 && _testPattern(element.nodeValue)) { // textNode
				// TEXT_NODE
				_replaceNodeValue(element, dataitem);
			} else {
				if (element.nodeType === 1 && typeof element.getAttribute(_getAttributeName('data')) === 'string') {
					_createCycle(element, dataitem);
				} else {
					if (element.nodeType !== 11) {
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
			var dataArray = dataitem[cycleElement.getAttribute(_getAttributeName('data'))],
				template = cycleElement.getAttribute(_getAttributeName('template')),
				convertdata = dataitem[cycleElement.getAttribute(_getAttributeName('convert'))],
				parent = cycleElement.parentNode;
			if (typeof dataArray.length === 'number') {
				var frag = _createList(template, dataArray, convertdata);
				parent.replaceChild(frag, cycleElement);
			}
			return parent;
		},
		_createList = function (template, dataArray, convertdata) {
			var fragment = document.createDocumentFragment(),
				dataitem = {};
			// check if it's as Array
			for (var i = 0, loops = dataArray.length; i < loops; i++) {
				convertdata = typeof convertdata === 'function' ? convertdata(dataArray[i]) : dataArray[i];
				convertedData = _convertAndMergeData(dataArray[i], convertdata);
				fragment.appendChild(Stencil.get(template, convertedData));
			}
			return fragment;
		};
	(function (templatesFileLocation) {
        var XHR = new XMLHttpRequest(),
			templatesArray = [],
			doc = document.implementation.createHTMLDocument('TemplatesDocument'),
			i = 0;
        XHR.open('GET', templatesFileLocation, false); // sync load
        XHR.setRequestHeader('Content-Type', 'text/html');
        XHR.onload = function (evt) {
            if (XHR.readyState === 4 && (XHR.status === 200 || XHR.status === 0)) { // 0 for localhost
                doc.body.innerHTML = XHR.responseText;
                templatesArray = doc.getElementsByTagName(_templateTagName);
                i = templatesArray.length;
                while (i--) {
                    _templates[templatesArray[i].getAttribute('name')] = templatesArray[i];
                }
                doc = null; // destroy the doc, keep the DOM Elements
            }
        }
        XHR.send();
    })(_templatesFileLocation);
    return {
		get: function (templateName, dataitem, codeafter) {
			if (typeof codeafter === 'function') {
				return codeafter(_nodeReplacements(_create(templateName), dataitem));
			} else {
				return _nodeReplacements(_create(templateName), dataitem);
			}
		},
		append: function (parent, templateName, dataitem, codeafter) {
			parent = typeof parent === 'string' ? document.querySelector(parent) : parent;
			return parent.appendChild(this.get(templateName, dataitem));
		},
		clearAndAppend: function (parent, templateName, dataitem, codeafter) {
			parent = typeof parent === 'string' ? document.querySelector(parent) : parent;
			parent.innerHTML = '';
			return this.append(parent, templateName, dataitem);
		}
	};
};
Stencil = Stencil();
/* IMPLEMENT:
 * Stencil = Stencil('Templates.html', { templateTagName: 'template' });
 */
/* EXAMPLE:
 * Stencil.append('#myDiv', 'templateName', {}, Translate);
 */