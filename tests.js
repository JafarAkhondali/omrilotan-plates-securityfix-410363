// Set string interpolation: ${ key }
var interpolate = function(string, obj) {
    return string.replace(/\${(.*?)\s*}/g,
        function (a, b) {
            var r = obj[b.trim()];
            return ~["string", "number", "boolean"].indexOf(typeof r) ? r : a;
        }
    );
};

// Set up Tests
var test = (function _test_ () {
    var collection = {},
        Test = function Test (name) {
            this.name = name;

            // Default template
            this.template = "Result for test \"${ name }\" (${ description }): ${ result }";
        };
    Test.prototype = {
        describe: function Test$describe (description) {
            this.description = description;
            return this;
        },
        set: function Test$set (fn) {
            this.fn = fn;
            return this;
        },
        go: function Test$go () {
            this.result = this.fn();
            return this;
        },
        templatise: function Test$templatise (template) {
            this.template = typeof template === "string" ? template : this.template;
            return this;
        },
        report: function Test$report () {
            return interpolate(this.template, this);
        }
    };

    return function test (name) {
        if (!collection.hasOwnProperty(name)) {
            collection[name] = new Test(name);
            collection[name];
        }
        return collection[name];
    };
}());

var subject = document.getElementById("subject"),
    nextSubject = function() {
        var clone = subject.cloneNode(false);
        subject.parentNode.appendChild(clone);
        subject = clone;
        while (subject.attributes.length) {
            subject.removeAttribute(subject.attributes[0].name);
        }
        return subject;
    };

var randomNumber = function (max) {
    max = max || 1000;
    return Math.ceil(Math.random() * max)
};

// Set up assets
plates.scan("templates.html");

var reporter = document.getElementById("reporter"),
    report = function (item, conteiner) {
        var style = item.result ? "color:green;" : "color:red;",
            wrapper,
            message;

        item.templatise("test: \"${ name }\"\n\t=> ${ description }");

        message = (item.result ? "Passed " : "Failed ") + item.report();

        console.log("%c" + message, style);
        if (reporter) {
            wrapper = document.createElement("span");
            wrapper.setAttribute("style", style);
            wrapper.appendChild(document.createTextNode(message));
            reporter.appendChild(wrapper);
        }
        if (conteiner) {
            conteiner.title = item.name;
        }
        if (conteiner && !item.result) {
            (function () {
                var span = document.createElement("span")
                span.appendChild(document.createTextNode("Fail: " + item.name));
                span.style.color = "red";
                conteiner.appendChild(span);
            }());
        }
    };

// Clear console
// console.clear();

/////////////////
// Tests Begin //
/////////////////

// New Test
test("Sanity")
    .describe("Subject has any string content")
    .set(function () {
        subject.appendChild(document.createTextNode("Sanity"));
        return subject.innerHTML.trim().length > 0;
    })
    .go();
report(test("Sanity"));

nextSubject();

// New Test
test("templates file")
    .describe("template replaces correct text")
    .set(function () {
        var data = { text: "output" };

        plates("bdcefqyg")
            .process(data)
            .fill(subject);
        return subject.innerHTML.trim() === data.text;
    })
    .go();
report(test("templates file"));

nextSubject();

// New Test
test("attribute value")
    .describe("template replaces correct text in attributes")
    .set(function () {
        var data = { identifier: "identifier" + randomNumber() };

        plates("kqjslyod")
            .process(data)
            .fill(subject);
        return document.getElementById(data.identifier) !== null;
    })
    .go();
report(test("attribute value"));

nextSubject();

// New Test
test("wrap vars in spaces")
    .describe("processes variables wrapped in spaces")
    .set(function () {
        var data = { value: "this-value" };

        plates("hdrvznfp")
            .process(data)
            .fill(subject);

        var ele = subject.firstElementChild;
        return ele ? ele.getAttribute("data-val") === data.value : false;
    })
    .go();
report(test("wrap vars in spaces"));

nextSubject();


// New Test
test("nested values")
    .describe("found nested values")
    .set(function () {
        var data = {
            nested: {
                inside: "this-value"
            }
        };

        plates("cxvfmgwp")
            .process(data)
            .fill(subject);

        return subject.innerHTML.indexOf(data.nested.inside) !== -1;
    })
    .go();
report(test("nested values"));

nextSubject();

// New Test
test("multiple replacements")
    .describe("template replaces multiple times in same string")
    .set(function () {
        var data = {
            first: "one",
            second: "two"
        };
        plates("vmzmqpoo")
            .process(data)
            .fill(subject);
        return subject.innerHTML.trim() === data.first + " " + data.second;
    })
    .go();
report(test("multiple replacements"));

nextSubject();

////////////////
// EXTENSIONS //
////////////////
platesExtend();

// New Test
test("if extension: true")
    .describe("an element is rendered")
    .set(function () {
        plates("jijswucn")
            .process({
                condition: true
            })
            .fill(subject);
        return subject.querySelectorAll("*").length > 0;
    })
    .go();
report(test("if extension: true"));

nextSubject();

// New Test
test("if extension: false")
    .describe("no element is rendered")
    .set(function () {
        plates("jijswucn")
            .process({
                condition: false
            })
            .fill(subject);
        return subject.querySelectorAll("*").length === 0;
    })
    .go();
report(test("if extension: false"));

nextSubject();

// New Test
test("listen extension")
    .describe("template responds to event listener")
    .set(function () {
        var evt        = "custom-event",
            event      = new Event(evt),
            result     = 1,
            val,

            data = {
                identifier: "identifier" + randomNumber(),
                evt: evt,
                callback: function() {
                    val = result;
                }
            };

        plates("hicolbnu")
            .process(data)
            .fill(subject);

        var ele = document.getElementById(data.identifier);
        if (ele) {
            document.getElementById(data.identifier).dispatchEvent(event);
        }
        return val === result;
    })
    .go();
report(test("listen extension"), subject);

nextSubject();

// New Test
test("extension without pre-process")
    .describe("added attribute name by variable")
    .set(function () {
        var data = {
                identifier: "identifier" + randomNumber(),
                attrName  : "theName",
                attrValue : "theValue",
                theName   : "",
                theValue  : ""
            };

        plates("jdplsqfw")
            .process(data)
            .fill(subject);

        var ele = document.getElementById(data.identifier);
        return ele ? ele.getAttribute(data.attrName.toLowerCase()) === data.attrValue : false;
    })
    .go();
report(test("extension without pre-process"));

nextSubject();

// New Test
test("extension with pre-process")
    .describe("added attribute name by variable")
    .set(function () {
        var name  = "my-attribute-name",
            value = "my-attribute-value",
            data  = {
                identifier: identifier = "identifier" + randomNumber(),
                attrName  : "theName",
                attrValue : "theValue",
                theName   : name,
                theValue  : value
            };

        plates("xuzbpyzw")
            .process(data)
            .fill(subject);

        var ele = document.getElementById(data.identifier);
        return ele ? ele.getAttribute(data.theName) === data.theValue : false;
    })
    .go();
report(test("extension with pre-process"));

nextSubject();


plates.scan(document);

// New Test
test("test link import")
    .describe("added templates using link import")
    .set(function () {
        var data = { text: "|_|" };

        plates("mznybokc")
            .process(data)
            .fill(subject);

        return subject.innerHTML.indexOf(data.text) !== -1;
    })
    .go();
report(test("test link import"));

nextSubject();

// New Test
test("test template DOM element import")
    .describe("added templates elements from DOM")
    .set(function () {
        var data = { text: "|_|" };

        plates("lijhhewx")
            .process(data)
            .fill(subject);

        return subject.innerHTML.indexOf(data.text) !== -1;
    })
    .go();
report(test("test template DOM element import"));

nextSubject();

// New Test
test("test script import")
    .describe("added templates using script teg")
    .set(function () {
        var data = { text: "|_|" };

        plates("pevhtydu")
            .process(data)
            .fill(subject);

        return subject.innerHTML.indexOf(data.text) !== -1;
    })
    .go();
report(test("test script import"));

nextSubject();


plates.add("<template template-name=\"btoutgft\">{{ text }}</template>");

// New Test
test("test string template add")
    .describe("added templates using string add")
    .set(function () {
        var data = { text: "|_|" };

        plates("btoutgft")
            .process(data)
            .fill(subject);

        return subject.innerHTML.indexOf(data.text) !== -1;
    })
    .go();
report(test("test string template add"));

nextSubject();


// New test
plates.config({
        async: true,
    })
    .scan("templates.async.html")
    .listen(function () {
        test("async templates file")
            .describe("template replaces correct text")
            .set(function () {
                var data = { text: "loaded" };
                plates("chwzwyfc")
                    .process(data)
                    .fill(subject);
                return subject.innerHTML.trim() === data.text;
            })
            .go();
        report(test("async templates file"));

        nextSubject();
    });





