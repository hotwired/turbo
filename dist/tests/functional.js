'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var intern = require('intern');
var http = require('http');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var intern__default = /*#__PURE__*/_interopDefaultLegacy(intern);

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

class FunctionalTestCase extends InternTestCase {
    get remote() {
        return this.internTest.remote;
    }
    async goToLocation(location) {
        const processedLocation = location.match(/^\//) ? location.slice(1) : location;
        return this.remote.get(processedLocation);
    }
    async goBack() {
        return this.remote.goBack();
    }
    async goForward() {
        return this.remote.goForward();
    }
    async reload() {
        await this.evaluate(() => location.reload());
        return this.nextBeat;
    }
    async hasSelector(selector) {
        return (await this.remote.findAllByCssSelector(selector)).length > 0;
    }
    async querySelector(selector) {
        return this.remote.findByCssSelector(selector);
    }
    async clickSelector(selector) {
        return this.remote.findByCssSelector(selector).click();
    }
    async scrollToSelector(selector) {
        const element = await this.remote.findByCssSelector(selector);
        return this.evaluate(element => element.scrollIntoView(), element);
    }
    async outerHTMLForSelector(selector) {
        const element = await this.remote.findByCssSelector(selector);
        return this.evaluate(element => element.outerHTML, element);
    }
    async innerHTMLForSelector(selector) {
        const element = await this.remote.findAllByCssSelector(selector);
        return this.evaluate(element => element.innerHTML, element);
    }
    get scrollPosition() {
        return this.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    }
    async isScrolledToSelector(selector) {
        const { y: pageY } = await this.scrollPosition;
        const { y: elementY } = await this.remote.findByCssSelector(selector).getPosition();
        const offset = pageY - elementY;
        return offset > -1 && offset < 1;
    }
    get nextBeat() {
        return new Promise(resolve => setTimeout(resolve, 100));
    }
    async evaluate(callback, ...args) {
        return await this.remote.execute(callback, args);
    }
    get head() {
        return this.evaluate(() => document.head);
    }
    get body() {
        return this.evaluate(() => document.body);
    }
    get location() {
        return this.evaluate(() => location.toString());
    }
    get origin() {
        return this.evaluate(() => location.origin.toString());
    }
    get pathname() {
        return this.evaluate(() => location.pathname);
    }
    get hash() {
        return this.evaluate(() => location.hash);
    }
}

class RemoteChannel {
    constructor(remote, identifier) {
        this.index = 0;
        this.remote = remote;
        this.identifier = identifier;
    }
    async read(length) {
        const records = (await this.newRecords).slice(0, length);
        this.index += records.length;
        return records;
    }
    async drain() {
        await this.read();
    }
    get newRecords() {
        return this.remote.execute((identifier, index) => {
            const records = window[identifier];
            if (records != null && typeof records.slice == "function") {
                return records.slice(index);
            }
            else {
                return [];
            }
        }, [this.identifier, this.index]);
    }
}

class TurboDriveTestCase extends FunctionalTestCase {
    constructor() {
        super(...arguments);
        this.eventLogChannel = new RemoteChannel(this.remote, "eventLogs");
    }
    async beforeTest() {
        await this.drainEventLog();
        this.lastBody = await this.body;
    }
    get nextWindowHandle() {
        return (async (nextHandle) => {
            do {
                const handle = await this.remote.getCurrentWindowHandle();
                const handles = await this.remote.getAllWindowHandles();
                nextHandle = handles[handles.indexOf(handle) + 1];
            } while (!nextHandle);
            return nextHandle;
        })();
    }
    async nextEventNamed(eventName) {
        let record;
        while (!record) {
            const records = await this.eventLogChannel.read(1);
            record = records.find(([name]) => name == eventName);
        }
        return record[1];
    }
    get nextBody() {
        return (async () => {
            let body;
            do
                body = await this.changedBody;
            while (!body);
            return this.lastBody = body;
        })();
    }
    get changedBody() {
        return (async () => {
            const body = await this.body;
            if (!this.lastBody || this.lastBody.elementId != body.elementId) {
                return body;
            }
        })();
    }
    get visitAction() {
        return this.evaluate(() => {
            try {
                return window.Turbo.navigator.currentVisit.action;
            }
            catch (error) {
                return "load";
            }
        });
    }
    drainEventLog() {
        return this.eventLogChannel.drain();
    }
}

class AsyncScriptTests extends TurboDriveTestCase {
    async setup() {
        await this.goToLocation("/src/tests/fixtures/async_script.html");
    }
    async "test does not emit turbo:load when loaded asynchronously after DOMContentLoaded"() {
        const events = await this.eventLogChannel.read();
        this.assert.deepEqual(events, []);
    }
    async "test following a link when loaded asynchronously after DOMContentLoaded"() {
        this.clickSelector("#async-link");
        await this.nextBody;
        this.assert.equal(await this.visitAction, "advance");
    }
}
AsyncScriptTests.registerSuite();

class FormSubmissionTests extends TurboDriveTestCase {
    async setup() {
        await this.goToLocation("/src/tests/fixtures/form.html");
    }
    async "test standard form submission with redirect response"() {
        this.listenForFormSubmissions();
        const button = await this.querySelector("#standard form.redirect input[type=submit]");
        await button.click();
        await this.nextBody;
        this.assert.ok(this.turboFormSubmitted);
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.visitAction, "advance");
    }
    async "test standard form submission with empty created response"() {
        const htmlBefore = await this.outerHTMLForSelector("body");
        const button = await this.querySelector("#standard form.created input[type=submit]");
        await button.click();
        await this.nextBeat;
        const htmlAfter = await this.outerHTMLForSelector("body");
        this.assert.equal(htmlAfter, htmlBefore);
    }
    async "test standard form submission with empty no-content response"() {
        const htmlBefore = await this.outerHTMLForSelector("body");
        const button = await this.querySelector("#standard form.no-content input[type=submit]");
        await button.click();
        await this.nextBeat;
        const htmlAfter = await this.outerHTMLForSelector("body");
        this.assert.equal(htmlAfter, htmlBefore);
    }
    async "test invalid form submission with unprocessable entity status"() {
        await this.clickSelector("#reject form.unprocessable_entity input[type=submit]");
        await this.nextBody;
        const title = await this.querySelector("h1");
        this.assert.equal(await title.getVisibleText(), "Unprocessable Entity", "renders the response HTML");
        this.assert.notOk(await this.hasSelector("#frame form.reject"), "replaces entire page");
    }
    async "test invalid form submission with server error status"() {
        await this.clickSelector("#reject form.internal_server_error input[type=submit]");
        await this.nextBody;
        const title = await this.querySelector("h1");
        this.assert.equal(await title.getVisibleText(), "Internal Server Error", "renders the response HTML");
        this.assert.notOk(await this.hasSelector("#frame form.reject"), "replaces entire page");
    }
    async "test submitter form submission reads button attributes"() {
        const button = await this.querySelector("#submitter form button[type=submit]");
        await button.click();
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/two.html");
        this.assert.equal(await this.visitAction, "advance");
    }
    async "test frame form submission with redirect response"() {
        const button = await this.querySelector("#frame form.redirect input[type=submit]");
        await button.click();
        await this.nextBeat;
        const message = await this.querySelector("#frame div.message");
        this.assert.notOk(await this.hasSelector("#frame form.redirect"));
        this.assert.equal(await message.getVisibleText(), "Frame redirected");
        this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html");
    }
    async "test frame form submission with empty created response"() {
        const htmlBefore = await this.outerHTMLForSelector("#frame");
        const button = await this.querySelector("#frame form.created input[type=submit]");
        await button.click();
        await this.nextBeat;
        const htmlAfter = await this.outerHTMLForSelector("#frame");
        this.assert.equal(htmlAfter, htmlBefore);
    }
    async "test frame form submission with empty no-content response"() {
        const htmlBefore = await this.outerHTMLForSelector("#frame");
        const button = await this.querySelector("#frame form.no-content input[type=submit]");
        await button.click();
        await this.nextBeat;
        const htmlAfter = await this.outerHTMLForSelector("#frame");
        this.assert.equal(htmlAfter, htmlBefore);
    }
    async "test invalid frame form submission with unprocessable entity status"() {
        await this.clickSelector("#frame form.unprocessable_entity input[type=submit]");
        await this.nextBeat;
        const title = await this.querySelector("#frame h2");
        this.assert.ok(await this.hasSelector("#reject form"), "only replaces frame");
        this.assert.equal(await title.getVisibleText(), "Frame: Unprocessable Entity");
    }
    async "test invalid frame form submission with internal server errror status"() {
        await this.clickSelector("#frame form.internal_server_error input[type=submit]");
        await this.nextBeat;
        const title = await this.querySelector("#frame h2");
        this.assert.ok(await this.hasSelector("#reject form"), "only replaces frame");
        this.assert.equal(await title.getVisibleText(), "Frame: Internal Server Error");
    }
    async "test frame form submission with stream response"() {
        const button = await this.querySelector("#frame form.stream input[type=submit]");
        await button.click();
        await this.nextBeat;
        const message = await this.querySelector("#frame div.message");
        this.assert.ok(await this.hasSelector("#frame form.redirect"));
        this.assert.equal(await message.getVisibleText(), "Hello!");
        this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html");
    }
    async "test frame form submission with HTTP verb other than GET or POST"() {
        await this.clickSelector("#frame form.put.stream input[type=submit]");
        await this.nextBeat;
        const message = await this.querySelector("#frame div.message");
        this.assert.ok(await this.hasSelector("#frame form.redirect"));
        this.assert.equal(await message.getVisibleText(), "1: Hello!");
        this.assert.equal(await this.pathname, "/src/tests/fixtures/form.html");
    }
    async "test form submission with Turbo disabled on the form"() {
        this.listenForFormSubmissions();
        await this.clickSelector('#disabled form[data-turbo="false"] input[type=submit]');
        await this.nextBody;
        await this.querySelector("#element-id");
        this.assert.notOk(await this.turboFormSubmitted);
    }
    async "test form submission with Turbo disabled on the submitter"() {
        this.listenForFormSubmissions();
        await this.clickSelector('#disabled form:not([data-turbo]) input[data-turbo="false"]');
        await this.nextBody;
        await this.querySelector("#element-id");
        this.assert.notOk(await this.turboFormSubmitted);
    }
    async "test form submission skipped within method=dialog"() {
        this.listenForFormSubmissions();
        await this.clickSelector('#dialog-method [type="submit"]');
        await this.nextBeat;
        this.assert.notOk(await this.turboFormSubmitted);
    }
    async "test form submission skipped with submitter formmethod=dialog"() {
        this.listenForFormSubmissions();
        await this.clickSelector('#dialog-formmethod [formmethod="dialog"]');
        await this.nextBeat;
        this.assert.notOk(await this.turboFormSubmitted);
    }
    listenForFormSubmissions() {
        this.remote.execute(() => addEventListener("turbo:submit-start", function eventListener(event) {
            removeEventListener("turbo:submit-start", eventListener, false);
            document.head.insertAdjacentHTML("beforeend", `<meta name="turbo-form-submitted">`);
        }, false));
    }
    get turboFormSubmitted() {
        return this.hasSelector("meta[name=turbo-form-submitted]");
    }
}
FormSubmissionTests.registerSuite();

class FrameTests extends FunctionalTestCase {
    async setup() {
        await this.goToLocation("/src/tests/fixtures/frames.html");
    }
    async "test following a link to a page without a matching frame results in an empty frame"() {
        await this.clickSelector("#missing a");
        await this.nextBeat;
        this.assert.notOk(await this.innerHTMLForSelector("#missing"));
    }
}
FrameTests.registerSuite();

class LoadingTests extends TurboDriveTestCase {
    async setup() {
        await this.goToLocation("/src/tests/fixtures/loading.html");
    }
    async "test eager loading within a details element"() {
        await this.nextBeat;
        this.assert.ok(await this.hasSelector("#loading-eager turbo-frame#frame h2"));
    }
    async "test lazy loading within a details element"() {
        await this.nextBeat;
        const frameContents = "#loading-lazy turbo-frame h2";
        this.assert.notOk(await this.hasSelector(frameContents));
        await this.clickSelector("#loading-lazy summary");
        await this.nextBeat;
        const contents = await this.querySelector(frameContents);
        this.assert.equal(await contents.getVisibleText(), "Hello from a frame");
    }
    async "test changing loading attribute from lazy to eager loads frame"() {
        const frameContents = "#loading-lazy turbo-frame h2";
        await this.nextBeat;
        this.assert.notOk(await this.hasSelector(frameContents));
        await this.remote.execute(() => { var _a; return (_a = document.querySelector("#loading-lazy turbo-frame")) === null || _a === void 0 ? void 0 : _a.setAttribute("loading", "eager"); });
        await this.nextBeat;
        const contents = await this.querySelector(frameContents);
        await this.clickSelector("#loading-lazy summary");
        this.assert.equal(await contents.getVisibleText(), "Hello from a frame");
    }
    async "test changing src attribute on a frame with loading=lazy defers navigation"() {
        const frameContents = "#loading-lazy turbo-frame h2";
        await this.nextBeat;
        await this.remote.execute(() => { var _a; return (_a = document.querySelector("#loading-lazy turbo-frame")) === null || _a === void 0 ? void 0 : _a.setAttribute("src", "/src/tests/fixtures/frames.html"); });
        this.assert.notOk(await this.hasSelector(frameContents));
        await this.clickSelector("#loading-lazy summary");
        await this.nextBeat;
        const contents = await this.querySelector(frameContents);
        this.assert.equal(await contents.getVisibleText(), "Frames: #hello");
    }
    async "test changing src attribute on a frame with loading=eager navigates"() {
        const frameContents = "#loading-eager turbo-frame h2";
        await this.remote.execute(() => { var _a; return (_a = document.querySelector("#loading-eager turbo-frame")) === null || _a === void 0 ? void 0 : _a.setAttribute("src", "/src/tests/fixtures/frames.html"); });
        await this.nextBeat;
        await this.clickSelector("#loading-eager summary");
        const contents = await this.querySelector(frameContents);
        this.assert.equal(await contents.getVisibleText(), "Frames: #frame");
    }
}
LoadingTests.registerSuite();

class NavigationTests extends TurboDriveTestCase {
    async setup() {
        await this.goToLocation("/src/tests/fixtures/navigation.html");
    }
    async "test after loading the page"() {
        this.assert.equal(await this.pathname, "/src/tests/fixtures/navigation.html");
        this.assert.equal(await this.visitAction, "load");
    }
    async "test following a same-origin unannotated link"() {
        this.clickSelector("#same-origin-unannotated-link");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.visitAction, "advance");
    }
    async "test following a same-origin data-turbo-action=replace link"() {
        this.clickSelector("#same-origin-replace-link");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.visitAction, "replace");
    }
    async "test following a same-origin data-turbo=false link"() {
        this.clickSelector("#same-origin-false-link");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.visitAction, "load");
    }
    async "test following a same-origin unannotated link inside a data-turbo=false container"() {
        this.clickSelector("#same-origin-unannotated-link-inside-false-container");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.visitAction, "load");
    }
    async "test following a same-origin data-turbo=true link inside a data-turbo=false container"() {
        this.clickSelector("#same-origin-true-link-inside-false-container");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.visitAction, "advance");
    }
    async "test following a same-origin anchored link"() {
        this.clickSelector("#same-origin-anchored-link");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.hash, "#element-id");
        this.assert.equal(await this.visitAction, "advance");
        this.assert(await this.isScrolledToSelector("#element-id"));
    }
    async "test following a same-origin link to a named anchor"() {
        this.clickSelector("#same-origin-anchored-link-named");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.hash, "#named-anchor");
        this.assert.equal(await this.visitAction, "advance");
        this.assert(await this.isScrolledToSelector("[name=named-anchor]"));
    }
    async "test following a cross-origin unannotated link"() {
        this.clickSelector("#cross-origin-unannotated-link");
        await this.nextBody;
        this.assert.equal(await this.location, "about:blank");
        this.assert.equal(await this.visitAction, "load");
    }
    async "test following a same-origin [target] link"() {
        this.clickSelector("#same-origin-targeted-link");
        await this.nextBeat;
        this.remote.switchToWindow(await this.nextWindowHandle);
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.visitAction, "load");
    }
    async "test following a same-origin [download] link"() {
        this.clickSelector("#same-origin-download-link");
        await this.nextBeat;
        this.assert(!await this.changedBody);
        this.assert.equal(await this.pathname, "/src/tests/fixtures/navigation.html");
        this.assert.equal(await this.visitAction, "load");
    }
    async "test following a same-origin link inside an SVG element"() {
        this.clickSelector("#same-origin-link-inside-svg-element");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.visitAction, "advance");
    }
    async "test following a cross-origin link inside an SVG element"() {
        this.clickSelector("#cross-origin-link-inside-svg-element");
        await this.nextBody;
        this.assert.equal(await this.location, "about:blank");
        this.assert.equal(await this.visitAction, "load");
    }
    async "test clicking the back button"() {
        this.clickSelector("#same-origin-unannotated-link");
        await this.nextBody;
        await this.goBack();
        this.assert.equal(await this.pathname, "/src/tests/fixtures/navigation.html");
        this.assert.equal(await this.visitAction, "restore");
    }
    async "test clicking the forward button"() {
        this.clickSelector("#same-origin-unannotated-link");
        await this.nextBody;
        await this.goBack();
        await this.goForward();
        this.assert.equal(await this.pathname, "/src/tests/fixtures/one.html");
        this.assert.equal(await this.visitAction, "restore");
    }
}
NavigationTests.registerSuite();

class RenderingTests extends TurboDriveTestCase {
    async setup() {
        await this.goToLocation("/src/tests/fixtures/rendering.html");
    }
    async "test triggers before-render and render events"() {
        this.clickSelector("#same-origin-link");
        const { newBody } = await this.nextEventNamed("turbo:before-render");
        const h1 = await this.querySelector("h1");
        this.assert.equal(await h1.getVisibleText(), "One");
        await this.nextEventNamed("turbo:render");
        this.assert(await newBody.equals(await this.body));
    }
    async "test triggers before-render and render events for error pages"() {
        this.clickSelector("#nonexistent-link");
        const { newBody } = await this.nextEventNamed("turbo:before-render");
        this.assert.equal(await newBody.getVisibleText(), "404 Not Found: /nonexistent");
        await this.nextEventNamed("turbo:render");
        this.assert(await newBody.equals(await this.body));
    }
    async "test reloads when tracked elements change"() {
        this.clickSelector("#tracked-asset-change-link");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/tracked_asset_change.html");
        this.assert.equal(await this.visitAction, "load");
    }
    async "test reloads when turbo-visit-control setting is reload"() {
        this.clickSelector("#visit-control-reload-link");
        await this.nextBody;
        this.assert.equal(await this.pathname, "/src/tests/fixtures/visit_control_reload.html");
        this.assert.equal(await this.visitAction, "load");
    }
    async "test accumulates asset elements in head"() {
        const originalElements = await this.assetElements;
        this.clickSelector("#additional-assets-link");
        await this.nextBody;
        const newElements = await this.assetElements;
        this.assert.notDeepEqual(newElements, originalElements);
        this.goBack();
        await this.nextBody;
        const finalElements = await this.assetElements;
        this.assert.deepEqual(finalElements, newElements);
    }
    async "test replaces provisional elements in head"() {
        const originalElements = await this.provisionalElements;
        this.assert(!await this.hasSelector("meta[name=test]"));
        this.clickSelector("#same-origin-link");
        await this.nextBody;
        const newElements = await this.provisionalElements;
        this.assert.notDeepEqual(newElements, originalElements);
        this.assert(await this.hasSelector("meta[name=test]"));
        this.goBack();
        await this.nextBody;
        const finalElements = await this.provisionalElements;
        this.assert.notDeepEqual(finalElements, newElements);
        this.assert(!await this.hasSelector("meta[name=test]"));
    }
    async "skip evaluates head script elements once"() {
        this.assert.equal(await this.headScriptEvaluationCount, undefined);
        this.clickSelector("#head-script-link");
        await this.nextEventNamed("turbo:render");
        this.assert.equal(await this.headScriptEvaluationCount, 1);
        this.goBack();
        await this.nextEventNamed("turbo:render");
        this.assert.equal(await this.headScriptEvaluationCount, 1);
        this.clickSelector("#head-script-link");
        await this.nextEventNamed("turbo:render");
        this.assert.equal(await this.headScriptEvaluationCount, 1);
    }
    async "test evaluates body script elements on each render"() {
        this.assert.equal(await this.bodyScriptEvaluationCount, undefined);
        this.clickSelector("#body-script-link");
        await this.nextEventNamed("turbo:render");
        this.assert.equal(await this.bodyScriptEvaluationCount, 1);
        this.goBack();
        await this.nextEventNamed("turbo:render");
        this.assert.equal(await this.bodyScriptEvaluationCount, 1);
        this.clickSelector("#body-script-link");
        await this.nextEventNamed("turbo:render");
        this.assert.equal(await this.bodyScriptEvaluationCount, 2);
    }
    async "test does not evaluate data-turbo-eval=false scripts"() {
        this.clickSelector("#eval-false-script-link");
        await this.nextEventNamed("turbo:render");
        this.assert.equal(await this.bodyScriptEvaluationCount, undefined);
    }
    async "test preserves permanent elements"() {
        let permanentElement = await this.permanentElement;
        this.assert.equal(await permanentElement.getVisibleText(), "Rendering");
        this.clickSelector("#permanent-element-link");
        await this.nextEventNamed("turbo:render");
        this.assert(await permanentElement.equals(await this.permanentElement));
        this.assert.equal(await permanentElement.getVisibleText(), "Rendering");
        this.goBack();
        await this.nextEventNamed("turbo:render");
        this.assert(await permanentElement.equals(await this.permanentElement));
    }
    async "test before-cache event"() {
        this.beforeCache(body => body.innerHTML = "Modified");
        this.clickSelector("#same-origin-link");
        await this.nextBody;
        await this.goBack();
        const body = await this.nextBody;
        this.assert(await body.getVisibleText(), "Modified");
    }
    async "test mutation record as before-cache notification"() {
        this.modifyBodyAfterRemoval();
        this.clickSelector("#same-origin-link");
        await this.nextBody;
        await this.goBack();
        const body = await this.nextBody;
        this.assert(await body.getVisibleText(), "Modified");
    }
    async "test error pages"() {
        this.clickSelector("#nonexistent-link");
        const body = await this.nextBody;
        this.assert.equal(await body.getVisibleText(), "404 Not Found: /nonexistent");
        await this.goBack();
    }
    get assetElements() {
        return filter(this.headElements, isAssetElement);
    }
    get provisionalElements() {
        return filter(this.headElements, async (element) => !await isAssetElement(element));
    }
    get headElements() {
        return this.evaluate(() => Array.from(document.head.children));
    }
    get permanentElement() {
        return this.querySelector("#permanent");
    }
    get headScriptEvaluationCount() {
        return this.evaluate(() => window.headScriptEvaluationCount);
    }
    get bodyScriptEvaluationCount() {
        return this.evaluate(() => window.bodyScriptEvaluationCount);
    }
    async modifyBodyBeforeCaching() {
        return this.remote.execute(() => addEventListener("turbo:before-cache", function eventListener(event) {
            removeEventListener("turbo:before-cache", eventListener, false);
            document.body.innerHTML = "Modified";
        }, false));
    }
    async beforeCache(callback) {
        return this.remote.execute((callback) => {
            addEventListener("turbo:before-cache", function eventListener(event) {
                removeEventListener("turbo:before-cache", eventListener, false);
                callback(document.body);
            }, false);
        }, [callback]);
    }
    async modifyBodyAfterRemoval() {
        return this.remote.execute(() => {
            const { documentElement, body } = document;
            const observer = new MutationObserver(records => {
                for (const record of records) {
                    if (Array.from(record.removedNodes).indexOf(body) > -1) {
                        body.innerHTML = "Modified";
                        observer.disconnect();
                        break;
                    }
                }
            });
            observer.observe(documentElement, { childList: true });
        });
    }
}
async function filter(promisedValues, predicate) {
    const values = await promisedValues;
    const matches = await Promise.all(values.map(value => predicate(value)));
    return matches.reduce((result, match, index) => result.concat(match ? values[index] : []), []);
}
async function isAssetElement(element) {
    const tagName = await element.getTagName();
    const relValue = await element.getAttribute("rel");
    return tagName == "script" || tagName == "style" || (tagName == "link" && relValue == "stylesheet");
}
RenderingTests.registerSuite();

class ScrollRestorationTests extends TurboDriveTestCase {
    async "test landing on an anchor"() {
        await this.goToLocation("/src/tests/fixtures/scroll_restoration.html#three");
        const { y: yAfterLoading } = await this.scrollPosition;
        this.assert.notEqual(yAfterLoading, 0);
    }
    async "test reloading after scrolling"() {
        await this.goToLocation("/src/tests/fixtures/scroll_restoration.html");
        await this.scrollToSelector("#three");
        const { y: yAfterScrolling } = await this.scrollPosition;
        this.assert.notEqual(yAfterScrolling, 0);
        await this.reload();
        const { y: yAfterReloading } = await this.scrollPosition;
        this.assert.notEqual(yAfterReloading, 0);
    }
    async "test returning from history"() {
        await this.goToLocation("/src/tests/fixtures/scroll_restoration.html");
        await this.scrollToSelector("#three");
        await this.goToLocation("/src/tests/fixtures/bare.html");
        await this.goBack();
        const { y: yAfterReturning } = await this.scrollPosition;
        this.assert.notEqual(yAfterReturning, 0);
    }
}
ScrollRestorationTests.registerSuite();

class StreamTests extends FunctionalTestCase {
    async setup() {
        await this.goToLocation("/src/tests/fixtures/stream.html");
    }
    async "test receiving a stream message"() {
        let element;
        const selector = "#messages div.message:last-child";
        element = await this.querySelector(selector);
        this.assert.equal(await element.getVisibleText(), "First");
        await this.createMessage("Hello world!");
        await this.nextBeat;
        element = await this.querySelector(selector);
        this.assert.equal(await element.getVisibleText(), "Hello world!");
    }
    async createMessage(content) {
        return this.post("/__turbo/messages", { content });
    }
    async post(path, params = {}) {
        await this.evaluate((path, method, params) => {
            fetch(location.origin + path, { method, body: new URLSearchParams(params) });
        }, path, "POST", params);
    }
}
StreamTests.registerSuite();

class VisitTests extends TurboDriveTestCase {
    async setup() {
        this.goToLocation("/src/tests/fixtures/visit.html");
    }
    async "test programmatically visiting a same-origin location"() {
        const urlBeforeVisit = await this.location;
        await this.visitLocation("/src/tests/fixtures/one.html");
        const urlAfterVisit = await this.location;
        this.assert.notEqual(urlBeforeVisit, urlAfterVisit);
        this.assert.equal(await this.visitAction, "advance");
        const { url: urlFromBeforeVisitEvent } = await this.nextEventNamed("turbo:before-visit");
        this.assert.equal(urlFromBeforeVisitEvent, urlAfterVisit);
        const { url: urlFromVisitEvent } = await this.nextEventNamed("turbo:visit");
        this.assert.equal(urlFromVisitEvent, urlAfterVisit);
        const { timing } = await this.nextEventNamed("turbo:load");
        this.assert.ok(timing);
    }
    async "skip programmatically visiting a cross-origin location falls back to window.location"() {
        const urlBeforeVisit = await this.location;
        await this.visitLocation("about:blank");
        const urlAfterVisit = await this.location;
        this.assert.notEqual(urlBeforeVisit, urlAfterVisit);
        this.assert.equal(await this.visitAction, "load");
    }
    async "test visiting a location served with a non-HTML content type"() {
        const urlBeforeVisit = await this.location;
        await this.visitLocation("/src/tests/fixtures/svg");
        const url = await this.remote.getCurrentUrl();
        const contentType = await contentTypeOfURL(url);
        this.assert.equal(contentType, "image/svg+xml");
        const urlAfterVisit = await this.location;
        this.assert.notEqual(urlBeforeVisit, urlAfterVisit);
        this.assert.equal(await this.visitAction, "load");
    }
    async "test canceling a before-visit event prevents navigation"() {
        this.cancelNextVisit();
        const urlBeforeVisit = await this.location;
        this.clickSelector("#same-origin-link");
        await this.nextBeat;
        this.assert(!await this.changedBody);
        const urlAfterVisit = await this.location;
        this.assert.equal(urlAfterVisit, urlBeforeVisit);
    }
    async "test navigation by history is not cancelable"() {
        this.clickSelector("#same-origin-link");
        await this.drainEventLog();
        await this.nextBeat;
        await this.goBack();
        this.assert(await this.changedBody);
    }
    async visitLocation(location) {
        this.remote.execute((location) => window.Turbo.visit(location), [location]);
    }
    async cancelNextVisit() {
        this.remote.execute(() => addEventListener("turbo:before-visit", function eventListener(event) {
            removeEventListener("turbo:before-visit", eventListener, false);
            event.preventDefault();
        }, false));
    }
}
function contentTypeOfURL(url) {
    return new Promise(resolve => {
        http.get(url, ({ headers }) => resolve(headers["content-type"]));
    });
}
VisitTests.registerSuite();

exports.AsyncScriptTests = AsyncScriptTests;
exports.FormSubmissionTests = FormSubmissionTests;
exports.FrameTests = FrameTests;
exports.LoadingTests = LoadingTests;
exports.NavigationTests = NavigationTests;
exports.RenderingTests = RenderingTests;
exports.ScrollRestorationTests = ScrollRestorationTests;
exports.StreamTests = StreamTests;
exports.VisitTests = VisitTests;
//# sourceMappingURL=functional.js.map
