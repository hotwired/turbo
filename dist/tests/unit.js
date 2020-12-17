(function (exports, intern) {
    'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var intern__default = /*#__PURE__*/_interopDefaultLegacy(intern);

    const StreamActions = {
        append() {
            var _a;
            (_a = this.targetElement) === null || _a === void 0 ? void 0 : _a.append(this.templateContent);
        },
        prepend() {
            var _a;
            (_a = this.targetElement) === null || _a === void 0 ? void 0 : _a.prepend(this.templateContent);
        },
        remove() {
            var _a;
            (_a = this.targetElement) === null || _a === void 0 ? void 0 : _a.remove();
        },
        replace() {
            var _a;
            (_a = this.targetElement) === null || _a === void 0 ? void 0 : _a.replaceWith(this.templateContent);
        },
        update() {
            if (this.targetElement) {
                this.targetElement.innerHTML = "";
                this.targetElement.append(this.templateContent);
            }
        }
    };

    const closest = (() => {
        const html = document.documentElement;
        const match = html.matches
            || html.webkitMatchesSelector
            || html.msMatchesSelector
            || html.mozMatchesSelector;
        const closest = html.closest || function (selector) {
            let element = this;
            while (element) {
                if (match.call(element, selector)) {
                    return element;
                }
                else {
                    element = element.parentElement;
                }
            }
        };
        return function (element, selector) {
            return closest.call(element, selector);
        };
    })();
    function nextAnimationFrame() {
        return new Promise(resolve => requestAnimationFrame(() => resolve()));
    }
    const preventDefaultSupported = (() => {
        const event = document.createEvent("Events");
        event.initEvent("test", true, true);
        event.preventDefault();
        return event.defaultPrevented;
    })();

    class StreamElement extends HTMLElement {
        async connectedCallback() {
            try {
                await this.render();
            }
            catch (error) {
                console.error(error);
            }
            finally {
                this.disconnect();
            }
        }
        async render() {
            var _a;
            return (_a = this.renderPromise) !== null && _a !== void 0 ? _a : (this.renderPromise = (async () => {
                if (this.dispatchEvent(this.beforeRenderEvent)) {
                    await nextAnimationFrame();
                    this.performAction();
                }
            })());
        }
        disconnect() {
            try {
                this.remove();
            }
            catch (_a) { }
        }
        get performAction() {
            if (this.action) {
                const actionFunction = StreamActions[this.action];
                if (actionFunction) {
                    return actionFunction;
                }
                this.raise("unknown action");
            }
            this.raise("action attribute is missing");
        }
        get targetElement() {
            var _a;
            if (this.target) {
                return (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.getElementById(this.target);
            }
            this.raise("target attribute is missing");
        }
        get templateContent() {
            return this.templateElement.content;
        }
        get templateElement() {
            if (this.firstElementChild instanceof HTMLTemplateElement) {
                return this.firstElementChild;
            }
            this.raise("first child element must be a <template> element");
        }
        get action() {
            return this.getAttribute("action");
        }
        get target() {
            return this.getAttribute("target");
        }
        raise(message) {
            throw new Error(`${this.description}: ${message}`);
        }
        get description() {
            var _a, _b;
            return (_b = ((_a = this.outerHTML.match(/<[^>]+>/)) !== null && _a !== void 0 ? _a : [])[0]) !== null && _b !== void 0 ? _b : "<turbo-stream>";
        }
        get beforeRenderEvent() {
            return new CustomEvent("turbo:before-stream-render", { bubbles: true, cancelable: true });
        }
    }
    customElements.define("turbo-stream", StreamElement);

    class InternTestCase {
        constructor(internTest) {
            this.internTest = internTest;
        }
        static registerSuite() {
            return intern__default['default'].getInterface("object").registerSuite(this.name, { tests: this.tests });
        }
        static get tests() {
            return this.testNames.reduce((tests, testName) => {
                return Object.assign(Object.assign({}, tests), { [testName]: internTest => this.runTest(internTest) });
            }, {});
        }
        static get testNames() {
            return this.testKeys.map(key => key.slice(5));
        }
        static get testKeys() {
            return Object.getOwnPropertyNames(this.prototype).filter(key => key.match(/^test /));
        }
        static runTest(internTest) {
            const testCase = new this(internTest);
            return testCase.runTest();
        }
        get testName() {
            return this.internTest.name;
        }
        async runTest() {
            try {
                await this.setup();
                await this.beforeTest();
                await this.test();
                await this.afterTest();
            }
            finally {
                await this.teardown();
            }
        }
        get assert() {
            return intern__default['default'].getPlugin("chai").assert;
        }
        async setup() {
        }
        async beforeTest() {
        }
        get test() {
            const method = this[`test ${this.testName}`];
            if (method != null && typeof method == "function") {
                return method;
            }
            else {
                throw new Error(`No such test "${this.testName}"`);
            }
        }
        async afterTest() {
        }
        async teardown() {
        }
    }

    class DOMTestCase extends InternTestCase {
        constructor() {
            super(...arguments);
            this.fixtureElement = document.createElement("main");
        }
        async setup() {
            this.fixtureElement.hidden = true;
            document.body.insertAdjacentElement("afterbegin", this.fixtureElement);
        }
        async teardown() {
            this.fixtureElement.innerHTML = "";
            this.fixtureElement.remove();
        }
        append(node) {
            this.fixtureElement.appendChild(node);
        }
        find(selector) {
            return this.fixtureElement.querySelector(selector);
        }
        get fixtureHTML() {
            return this.fixtureElement.innerHTML;
        }
        set fixtureHTML(html) {
            this.fixtureElement.innerHTML = html;
        }
    }

    class StreamElementTests extends DOMTestCase {
        async beforeTest() {
            this.fixtureHTML = `<div id="hello">Hello Turbo</div>`;
        }
        async "test action=append"() {
            var _a, _b;
            const element = createStreamElement("append", "hello", createTemplateElement(" Streams"));
            this.assert.equal((_a = this.find("#hello")) === null || _a === void 0 ? void 0 : _a.textContent, "Hello Turbo");
            this.append(element);
            await nextAnimationFrame();
            this.assert.equal((_b = this.find("#hello")) === null || _b === void 0 ? void 0 : _b.textContent, "Hello Turbo Streams");
            this.assert.isNull(element.parentElement);
        }
        async "test action=prepend"() {
            var _a, _b;
            const element = createStreamElement("prepend", "hello", createTemplateElement("Streams "));
            this.assert.equal((_a = this.find("#hello")) === null || _a === void 0 ? void 0 : _a.textContent, "Hello Turbo");
            this.append(element);
            await nextAnimationFrame();
            this.assert.equal((_b = this.find("#hello")) === null || _b === void 0 ? void 0 : _b.textContent, "Streams Hello Turbo");
            this.assert.isNull(element.parentElement);
        }
        async "test action=remove"() {
            const element = createStreamElement("remove", "hello");
            this.assert.ok(this.find("#hello"));
            this.append(element);
            await nextAnimationFrame();
            this.assert.notOk(this.find("#hello"));
            this.assert.isNull(element.parentElement);
        }
        async "test action=replace"() {
            var _a, _b;
            const element = createStreamElement("replace", "hello", createTemplateElement(`<h1 id="hello">Hello Turbo</h1>`));
            this.assert.equal((_a = this.find("#hello")) === null || _a === void 0 ? void 0 : _a.textContent, "Hello Turbo");
            this.assert.ok(this.find("div#hello"));
            this.append(element);
            await nextAnimationFrame();
            this.assert.equal((_b = this.find("#hello")) === null || _b === void 0 ? void 0 : _b.textContent, "Hello Turbo");
            this.assert.notOk(this.find("div#hello"));
            this.assert.ok(this.find("h1#hello"));
            this.assert.isNull(element.parentElement);
        }
        async "test action=update"() {
            var _a, _b;
            const element = createStreamElement("update", "hello", createTemplateElement("Goodbye Turbo"));
            this.assert.equal((_a = this.find("#hello")) === null || _a === void 0 ? void 0 : _a.textContent, "Hello Turbo");
            this.append(element);
            await nextAnimationFrame();
            this.assert.equal((_b = this.find("#hello")) === null || _b === void 0 ? void 0 : _b.textContent, "Goodbye Turbo");
            this.assert.isNull(element.parentElement);
        }
    }
    function createStreamElement(action, target, templateElement) {
        const element = new StreamElement();
        if (action)
            element.setAttribute("action", action);
        if (target)
            element.setAttribute("target", target);
        if (templateElement)
            element.appendChild(templateElement);
        return element;
    }
    function createTemplateElement(html) {
        const element = document.createElement("template");
        element.innerHTML = html;
        return element;
    }
    StreamElementTests.registerSuite();

    exports.StreamElementTests = StreamElementTests;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}, intern));
//# sourceMappingURL=unit.js.map
