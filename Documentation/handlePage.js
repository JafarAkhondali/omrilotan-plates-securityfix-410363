// fonts
(function () {
	var fontStyleSheet = document.createElement('link'),
		head = document.head || document.getElementsByTagName('head')[0];
	fontStyleSheet.setAttribute('rel', 'stylesheet');
	fontStyleSheet.setAttribute('href', 'http://fonts.googleapis.com/css?family=Oswald:300&subset=latin,latin-ext');
	head.appendChild(fontStyleSheet);
})();

(function () {
    // use feature detect to branch this handler
    if (typeof window.addEventListener === 'function') {
        addListener = function (ele, evt, func) {
            if (typeof evt === 'string') {
                ele.addEventListener(evt, func);
            } else {
                for (var i = 0, loops = evt.length; i < loops; i++) {
                    ele.addEventListener(evt[i], func);
                }
            }
            return ele;
        };
        removeListener = function (ele, evt, func) {
            if (typeof evt === 'string') {
                ele.removeEventListener('on' + evt, func);
            } else {
                for (var i = 0, loops = evt.length; i < loops; i++) {
                    ele.removeEventListener('on' + evt[i], func);
                }
            }
            return ele;
        };
    } else if (typeof document.attachEvent === 'function') {
        addListener = function (ele, evt, func) {
            if (typeof evt === 'string') {
                ele.attachEvent('on' + evt, func);
            } else {
                for (var i = 0, loops = evt.length; i < loops; i++) {
                    ele.attachEvent('on' + evt[i], func);
                }
            }
            return ele;
        };
        removeListener = function (ele, evt, func) {
            if (typeof evt === 'string') {
                ele.detachEvent(evt, func);
            } else {
                for (var i = 0, loops = evt.length; i < loops; i++) {
                    ele.detachEvent(evt[i], func);
                }
            }
            return ele;
        };
    } else {
        addListener = function (ele, evt, func) {
            if (typeof evt === 'string') {
                ele['on' + evt] = func;
            } else {
                for (var i = 0, loops = evt.length; i < loops; i++) {
                    ele['on' + evt[i]] = func;
                }
            }
            return ele;
        };
        removeListener = function (ele, evt, func) {
            if (typeof evt === 'string') {
                ele['on' + evt] = null;
            } else {
                for (var i = 0, loops = evt.length; i < loops; i++) {
                    ele['on' + evt[i]] = null;
                }
            }
            return ele;
        };
    }
})();
// open links in a new tab
var convertAHref = function (element) {
	element = element || document;
	var a = element.getElementsByTagName('a'),
		i = a.length;
	while (i--){
		(function (ele) {
			addListener(ele, 'click', function (evt) {
				evt = evt || window.event;
				window.open(ele.href, 'external_link');
				evt.returnValue = false;
				evt.cancelBubble = true;
				evt.preventDefault();
				evt.stopPropagation();
				return false;
			});
		})(a[i]);
	}
};