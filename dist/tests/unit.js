var tests_unit = (function (exports, intern) {
    'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var intern__default = /*#__PURE__*/_interopDefaultLegacy(intern);

    var FrameLoadingStyle;
    (function (FrameLoadingStyle) {
        FrameLoadingStyle["eager"] = "eager";
        FrameLoadingStyle["lazy"] = "lazy";
    })(FrameLoadingStyle || (FrameLoadingStyle = {}));
    class FrameElement extends HTMLElement {
        constructor() {
            super();
            this.loaded = Promise.resolve();
            this.delegate = new FrameElement.delegateConstructor(this);
        }
        static get observedAttributes() {
            return ["loading", "src"];
        }
        connectedCallback() {
            this.delegate.connect();
        }
        disconnectedCallback() {
            this.delegate.disconnect();
        }
        attributeChangedCallback(name) {
            if (name == "loading") {
                this.delegate.loadingStyleChanged();
            }
            else if (name == "src") {
                this.delegate.sourceURLChanged();
            }
        }
        get src() {
            return this.getAttribute("src");
        }
        set src(value) {
            if (value) {
                this.setAttribute("src", value);
            }
            else {
                this.removeAttribute("src");
            }
        }
        get loading() {
            return frameLoadingStyleFromString(this.getAttribute("loading") || "");
        }
        set loading(value) {
            if (value) {
                this.setAttribute("loading", value);
            }
            else {
                this.removeAttribute("loading");
            }
        }
        get disabled() {
            return this.hasAttribute("disabled");
        }
        set disabled(value) {
            if (value) {
                this.setAttribute("disabled", "");
            }
            else {
                this.removeAttribute("disabled");
            }
        }
        get autoscroll() {
            return this.hasAttribute("autoscroll");
        }
        set autoscroll(value) {
            if (value) {
                this.setAttribute("autoscroll", "");
            }
            else {
                this.removeAttribute("autoscroll");
            }
        }
        get complete() {
            return !this.delegate.isLoading;
        }
        get isActive() {
            return this.ownerDocument === document && !this.isPreview;
        }
        get isPreview() {
            var _a, _b;
            return (_b = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.documentElement) === null || _b === void 0 ? void 0 : _b.hasAttribute("data-turbo-preview");
        }
    }
    function frameLoadingStyleFromString(style) {
        switch (style.toLowerCase()) {
            case "lazy": return FrameLoadingStyle.lazy;
            default: return FrameLoadingStyle.eager;
        }
    }

    class Location {
        constructor(url) {
            const linkWithAnchor = document.createElement("a");
            linkWithAnchor.href = url;
            this.absoluteURL = linkWithAnchor.href;
            const anchorLength = linkWithAnchor.hash.length;
            if (anchorLength < 2) {
                this.requestURL = this.absoluteURL;
            }
            else {
                this.requestURL = this.absoluteURL.slice(0, -anchorLength);
                this.anchor = linkWithAnchor.hash.slice(1);
            }
        }
        static get currentLocation() {
            return this.wrap(window.location.toString());
        }
        static wrap(locatable) {
            if (typeof locatable == "string") {
                return new this(locatable);
            }
            else if (locatable != null) {
                return locatable;
            }
        }
        getOrigin() {
            return this.absoluteURL.split("/", 3).join("/");
        }
        getPath() {
            return (this.requestURL.match(/\/\/[^/]*(\/[^?;]*)/) || [])[1] || "/";
        }
        getPathComponents() {
            return this.getPath().split("/").slice(1);
        }
        getLastPathComponent() {
            return this.getPathComponents().slice(-1)[0];
        }
        getExtension() {
            return (this.getLastPathComponent().match(/\.[^.]*$/) || [])[0] || "";
        }
        isHTML() {
            return !!this.getExtension().match(/^(?:|\.(?:htm|html|xhtml))$/);
        }
        isPrefixedBy(location) {
            const prefixURL = getPrefixURL(location);
            return this.isEqualTo(location) || stringStartsWith(this.absoluteURL, prefixURL);
        }
        isEqualTo(location) {
            return location && this.absoluteURL === location.absoluteURL;
        }
        toCacheKey() {
            return this.requestURL;
        }
        toJSON() {
            return this.absoluteURL;
        }
        toString() {
            return this.absoluteURL;
        }
        valueOf() {
            return this.absoluteURL;
        }
    }
    function getPrefixURL(location) {
        return addTrailingSlash(location.getOrigin() + location.getPath());
    }
    function addTrailingSlash(url) {
        return stringEndsWith(url, "/") ? url : url + "/";
    }
    function stringStartsWith(string, prefix) {
        return string.slice(0, prefix.length) === prefix;
    }
    function stringEndsWith(string, suffix) {
        return string.slice(-suffix.length) === suffix;
    }

    class FetchResponse {
        constructor(response) {
            this.response = response;
        }
        get succeeded() {
            return this.response.ok;
        }
        get failed() {
            return !this.succeeded;
        }
        get clientError() {
            return this.statusCode >= 400 && this.statusCode <= 499;
        }
        get serverError() {
            return this.statusCode >= 500 && this.statusCode <= 599;
        }
        get redirected() {
            return this.response.redirected;
        }
        get location() {
            return Location.wrap(this.response.url);
        }
        get isHTML() {
            return this.contentType && this.contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/);
        }
        get statusCode() {
            return this.response.status;
        }
        get contentType() {
            return this.header("Content-Type");
        }
        get responseText() {
            return this.response.text();
        }
        get responseHTML() {
            if (this.isHTML) {
                return this.response.text();
            }
            else {
                return Promise.resolve(undefined);
            }
        }
        header(name) {
            return this.response.headers.get(name);
        }
    }

    function dispatch(eventName, { target, cancelable, detail } = {}) {
        const event = new CustomEvent(eventName, { cancelable, bubbles: true, detail });
        void (target || document.documentElement).dispatchEvent(event);
        return event;
    }
    function nextAnimationFrame() {
        return new Promise(resolve => requestAnimationFrame(() => resolve()));
    }

    var FetchMethod;
    (function (FetchMethod) {
        FetchMethod[FetchMethod["get"] = 0] = "get";
        FetchMethod[FetchMethod["post"] = 1] = "post";
        FetchMethod[FetchMethod["put"] = 2] = "put";
        FetchMethod[FetchMethod["patch"] = 3] = "patch";
        FetchMethod[FetchMethod["delete"] = 4] = "delete";
    })(FetchMethod || (FetchMethod = {}));
    function fetchMethodFromString(method) {
        switch (method.toLowerCase()) {
            case "get": return FetchMethod.get;
            case "post": return FetchMethod.post;
            case "put": return FetchMethod.put;
            case "patch": return FetchMethod.patch;
            case "delete": return FetchMethod.delete;
        }
    }
    class FetchRequest {
        constructor(delegate, method, location, body) {
            this.abortController = new AbortController;
            this.delegate = delegate;
            this.method = method;
            this.location = location;
            this.body = body;
        }
        get url() {
            const url = this.location.absoluteURL;
            const query = this.params.toString();
            if (this.isIdempotent && query.length) {
                return [url, query].join(url.includes("?") ? "&" : "?");
            }
            else {
                return url;
            }
        }
        get params() {
            return this.entries.reduce((params, [name, value]) => {
                params.append(name, value.toString());
                return params;
            }, new URLSearchParams);
        }
        get entries() {
            return this.body ? Array.from(this.body.entries()) : [];
        }
        cancel() {
            this.abortController.abort();
        }
        async perform() {
            const { fetchOptions } = this;
            dispatch("turbo:before-fetch-request", { detail: { fetchOptions } });
            try {
                this.delegate.requestStarted(this);
                const response = await fetch(this.url, fetchOptions);
                return await this.receive(response);
            }
            catch (error) {
                this.delegate.requestErrored(this, error);
                throw error;
            }
            finally {
                this.delegate.requestFinished(this);
            }
        }
        async receive(response) {
            const fetchResponse = new FetchResponse(response);
            const event = dispatch("turbo:before-fetch-response", { cancelable: true, detail: { fetchResponse } });
            if (event.defaultPrevented) {
                this.delegate.requestPreventedHandlingResponse(this, fetchResponse);
            }
            else if (fetchResponse.succeeded) {
                this.delegate.requestSucceededWithResponse(this, fetchResponse);
            }
            else {
                this.delegate.requestFailedWithResponse(this, fetchResponse);
            }
            return fetchResponse;
        }
        get fetchOptions() {
            return {
                method: FetchMethod[this.method].toUpperCase(),
                credentials: "same-origin",
                headers: this.headers,
                redirect: "follow",
                body: this.isIdempotent ? undefined : this.body,
                signal: this.abortSignal
            };
        }
        get isIdempotent() {
            return this.method == FetchMethod.get;
        }
        get headers() {
            return Object.assign({ "Accept": "text/html, application/xhtml+xml" }, this.additionalHeaders);
        }
        get additionalHeaders() {
            if (typeof this.delegate.additionalHeadersForRequest == "function") {
                return this.delegate.additionalHeadersForRequest(this);
            }
            else {
                return {};
            }
        }
        get abortSignal() {
            return this.abortController.signal;
        }
    }

    class AppearanceObserver {
        constructor(delegate, element) {
            this.started = false;
            this.intersect = entries => {
                const lastEntry = entries.slice(-1)[0];
                if (lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.isIntersecting) {
                    this.delegate.elementAppearedInViewport(this.element);
                }
            };
            this.delegate = delegate;
            this.element = element;
            this.intersectionObserver = new IntersectionObserver(this.intersect);
        }
        start() {
            if (!this.started) {
                this.started = true;
                this.intersectionObserver.observe(this.element);
            }
        }
        stop() {
            if (this.started) {
                this.started = false;
                this.intersectionObserver.unobserve(this.element);
            }
        }
    }

    var FormSubmissionState;
    (function (FormSubmissionState) {
        FormSubmissionState[FormSubmissionState["initialized"] = 0] = "initialized";
        FormSubmissionState[FormSubmissionState["requesting"] = 1] = "requesting";
        FormSubmissionState[FormSubmissionState["waiting"] = 2] = "waiting";
        FormSubmissionState[FormSubmissionState["receiving"] = 3] = "receiving";
        FormSubmissionState[FormSubmissionState["stopping"] = 4] = "stopping";
        FormSubmissionState[FormSubmissionState["stopped"] = 5] = "stopped";
    })(FormSubmissionState || (FormSubmissionState = {}));
    class FormSubmission {
        constructor(delegate, formElement, submitter, mustRedirect = false) {
            this.state = FormSubmissionState.initialized;
            this.delegate = delegate;
            this.formElement = formElement;
            this.formData = buildFormData(formElement, submitter);
            this.submitter = submitter;
            this.fetchRequest = new FetchRequest(this, this.method, this.location, this.formData);
            this.mustRedirect = mustRedirect;
        }
        get method() {
            var _a;
            const method = ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute("formmethod")) || this.formElement.getAttribute("method") || "";
            return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get;
        }
        get action() {
            var _a;
            return ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute("formaction")) || this.formElement.action;
        }
        get location() {
            return Location.wrap(this.action);
        }
        async start() {
            const { initialized, requesting } = FormSubmissionState;
            if (this.state == initialized) {
                this.state = requesting;
                return this.fetchRequest.perform();
            }
        }
        stop() {
            const { stopping, stopped } = FormSubmissionState;
            if (this.state != stopping && this.state != stopped) {
                this.state = stopping;
                this.fetchRequest.cancel();
                return true;
            }
        }
        additionalHeadersForRequest(request) {
            const headers = {};
            if (this.method != FetchMethod.get) {
                const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token");
                if (token) {
                    headers["X-CSRF-Token"] = token;
                }
            }
            return headers;
        }
        requestStarted(request) {
            this.state = FormSubmissionState.waiting;
            dispatch("turbo:submit-start", { target: this.formElement, detail: { formSubmission: this } });
            this.delegate.formSubmissionStarted(this);
        }
        requestPreventedHandlingResponse(request, response) {
            this.result = { success: response.succeeded, fetchResponse: response };
        }
        requestSucceededWithResponse(request, response) {
            if (response.clientError || response.serverError) {
                this.delegate.formSubmissionFailedWithResponse(this, response);
            }
            else if (this.requestMustRedirect(request) && responseSucceededWithoutRedirect(response)) {
                const error = new Error("Form responses must redirect to another location");
                this.delegate.formSubmissionErrored(this, error);
            }
            else {
                this.state = FormSubmissionState.receiving;
                this.result = { success: true, fetchResponse: response };
                this.delegate.formSubmissionSucceededWithResponse(this, response);
            }
        }
        requestFailedWithResponse(request, response) {
            this.result = { success: false, fetchResponse: response };
            this.delegate.formSubmissionFailedWithResponse(this, response);
        }
        requestErrored(request, error) {
            this.result = { success: false, error };
            this.delegate.formSubmissionErrored(this, error);
        }
        requestFinished(request) {
            this.state = FormSubmissionState.stopped;
            dispatch("turbo:submit-end", { target: this.formElement, detail: Object.assign({ formSubmission: this }, this.result) });
            this.delegate.formSubmissionFinished(this);
        }
        requestMustRedirect(request) {
            return !request.isIdempotent && this.mustRedirect;
        }
    }
    function buildFormData(formElement, submitter) {
        const formData = new FormData(formElement);
        const name = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("name");
        const value = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("value");
        if (name && formData.get(name) != value) {
            formData.append(name, value || "");
        }
        return formData;
    }
    function getCookieValue(cookieName) {
        if (cookieName != null) {
            const cookies = document.cookie ? document.cookie.split("; ") : [];
            const cookie = cookies.find((cookie) => cookie.startsWith(cookieName));
            if (cookie) {
                const value = cookie.split("=").slice(1).join("=");
                return value ? decodeURIComponent(value) : undefined;
            }
        }
    }
    function getMetaContent(name) {
        const element = document.querySelector(`meta[name="${name}"]`);
        return element && element.content;
    }
    function responseSucceededWithoutRedirect(response) {
        return response.statusCode == 200 && !response.redirected;
    }

    class FormInterceptor {
        constructor(delegate, element) {
            this.submitBubbled = ((event) => {
                if (event.target instanceof HTMLFormElement) {
                    const form = event.target;
                    const submitter = event.submitter || undefined;
                    if (this.delegate.shouldInterceptFormSubmission(form, submitter)) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        this.delegate.formSubmissionIntercepted(form, submitter);
                    }
                }
            });
            this.delegate = delegate;
            this.element = element;
        }
        start() {
            this.element.addEventListener("submit", this.submitBubbled);
        }
        stop() {
            this.element.removeEventListener("submit", this.submitBubbled);
        }
    }

    class LinkInterceptor {
        constructor(delegate, element) {
            this.clickBubbled = (event) => {
                if (this.respondsToEventTarget(event.target)) {
                    this.clickEvent = event;
                }
                else {
                    delete this.clickEvent;
                }
            };
            this.linkClicked = ((event) => {
                if (this.clickEvent && this.respondsToEventTarget(event.target) && event.target instanceof Element) {
                    if (this.delegate.shouldInterceptLinkClick(event.target, event.detail.url)) {
                        this.clickEvent.preventDefault();
                        event.preventDefault();
                        this.delegate.linkClickIntercepted(event.target, event.detail.url);
                    }
                }
                delete this.clickEvent;
            });
            this.willVisit = () => {
                delete this.clickEvent;
            };
            this.delegate = delegate;
            this.element = element;
        }
        start() {
            this.element.addEventListener("click", this.clickBubbled);
            document.addEventListener("turbo:click", this.linkClicked);
            document.addEventListener("turbo:before-visit", this.willVisit);
        }
        stop() {
            this.element.removeEventListener("click", this.clickBubbled);
            document.removeEventListener("turbo:click", this.linkClicked);
            document.removeEventListener("turbo:before-visit", this.willVisit);
        }
        respondsToEventTarget(target) {
            const element = target instanceof Element
                ? target
                : target instanceof Node
                    ? target.parentElement
                    : null;
            return element && element.closest("turbo-frame, html") == this.element;
        }
    }

    class FrameController {
        constructor(element) {
            this.resolveVisitPromise = () => { };
            this.element = element;
            this.appearanceObserver = new AppearanceObserver(this, this.element);
            this.linkInterceptor = new LinkInterceptor(this, this.element);
            this.formInterceptor = new FormInterceptor(this, this.element);
        }
        connect() {
            if (this.loadingStyle == FrameLoadingStyle.lazy) {
                this.appearanceObserver.start();
            }
            this.linkInterceptor.start();
            this.formInterceptor.start();
        }
        disconnect() {
            this.appearanceObserver.stop();
            this.linkInterceptor.stop();
            this.formInterceptor.stop();
        }
        sourceURLChanged() {
            if (this.loadingStyle == FrameLoadingStyle.eager) {
                this.loadSourceURL();
            }
        }
        loadingStyleChanged() {
            if (this.loadingStyle == FrameLoadingStyle.lazy) {
                this.appearanceObserver.start();
            }
            else {
                this.appearanceObserver.stop();
                this.loadSourceURL();
            }
        }
        async loadSourceURL() {
            if (this.isActive && this.sourceURL && this.sourceURL != this.loadingURL) {
                try {
                    this.loadingURL = this.sourceURL;
                    this.element.loaded = this.visit(this.sourceURL);
                    this.appearanceObserver.stop();
                    await this.element.loaded;
                }
                finally {
                    delete this.loadingURL;
                }
            }
        }
        async loadResponse(response) {
            const fragment = fragmentFromHTML(await response.responseHTML);
            if (fragment) {
                const element = await this.extractForeignFrameElement(fragment);
                await nextAnimationFrame();
                this.loadFrameElement(element);
                this.scrollFrameIntoView(element);
                await nextAnimationFrame();
                this.focusFirstAutofocusableElement();
            }
        }
        elementAppearedInViewport(element) {
            this.loadSourceURL();
        }
        shouldInterceptLinkClick(element, url) {
            return this.shouldInterceptNavigation(element);
        }
        linkClickIntercepted(element, url) {
            this.navigateFrame(element, url);
        }
        shouldInterceptFormSubmission(element) {
            return this.shouldInterceptNavigation(element);
        }
        formSubmissionIntercepted(element, submitter) {
            if (this.formSubmission) {
                this.formSubmission.stop();
            }
            this.formSubmission = new FormSubmission(this, element, submitter);
            if (this.formSubmission.fetchRequest.isIdempotent) {
                this.navigateFrame(element, this.formSubmission.fetchRequest.url);
            }
            else {
                this.formSubmission.start();
            }
        }
        additionalHeadersForRequest(request) {
            return { "Turbo-Frame": this.id };
        }
        requestStarted(request) {
            this.element.setAttribute("busy", "");
        }
        requestPreventedHandlingResponse(request, response) {
            this.resolveVisitPromise();
        }
        async requestSucceededWithResponse(request, response) {
            await this.loadResponse(response);
            this.resolveVisitPromise();
        }
        requestFailedWithResponse(request, response) {
            console.error(response);
            this.resolveVisitPromise();
        }
        requestErrored(request, error) {
            console.error(error);
            this.resolveVisitPromise();
        }
        requestFinished(request) {
            this.element.removeAttribute("busy");
        }
        formSubmissionStarted(formSubmission) {
        }
        formSubmissionSucceededWithResponse(formSubmission, response) {
            const frame = this.findFrameElement(formSubmission.formElement);
            frame.delegate.loadResponse(response);
        }
        formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
            this.element.delegate.loadResponse(fetchResponse);
        }
        formSubmissionErrored(formSubmission, error) {
        }
        formSubmissionFinished(formSubmission) {
        }
        async visit(url) {
            const location = Location.wrap(url);
            const request = new FetchRequest(this, FetchMethod.get, location);
            return new Promise(resolve => {
                this.resolveVisitPromise = () => {
                    this.resolveVisitPromise = () => { };
                    resolve();
                };
                request.perform();
            });
        }
        navigateFrame(element, url) {
            const frame = this.findFrameElement(element);
            frame.src = url;
        }
        findFrameElement(element) {
            var _a;
            const id = element.getAttribute("data-turbo-frame");
            return (_a = getFrameElementById(id)) !== null && _a !== void 0 ? _a : this.element;
        }
        async extractForeignFrameElement(container) {
            let element;
            const id = CSS.escape(this.id);
            if (element = activateElement(container.querySelector(`turbo-frame#${id}`))) {
                return element;
            }
            if (element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id}]`))) {
                await element.loaded;
                return await this.extractForeignFrameElement(element);
            }
            console.error(`Response has no matching <turbo-frame id="${id}"> element`);
            return new FrameElement();
        }
        loadFrameElement(frameElement) {
            var _a;
            const destinationRange = document.createRange();
            destinationRange.selectNodeContents(this.element);
            destinationRange.deleteContents();
            const sourceRange = (_a = frameElement.ownerDocument) === null || _a === void 0 ? void 0 : _a.createRange();
            if (sourceRange) {
                sourceRange.selectNodeContents(frameElement);
                this.element.appendChild(sourceRange.extractContents());
            }
        }
        focusFirstAutofocusableElement() {
            const element = this.firstAutofocusableElement;
            if (element) {
                element.focus();
                return true;
            }
            return false;
        }
        scrollFrameIntoView(frame) {
            if (this.element.autoscroll || frame.autoscroll) {
                const element = this.element.firstElementChild;
                const block = readScrollLogicalPosition(this.element.getAttribute("data-autoscroll-block"), "end");
                if (element) {
                    element.scrollIntoView({ block });
                    return true;
                }
            }
            return false;
        }
        shouldInterceptNavigation(element) {
            const id = element.getAttribute("data-turbo-frame") || this.element.getAttribute("target");
            if (!this.enabled || id == "_top") {
                return false;
            }
            if (id) {
                const frameElement = getFrameElementById(id);
                if (frameElement) {
                    return !frameElement.disabled;
                }
            }
            return true;
        }
        get firstAutofocusableElement() {
            const element = this.element.querySelector("[autofocus]");
            return element instanceof HTMLElement ? element : null;
        }
        get id() {
            return this.element.id;
        }
        get enabled() {
            return !this.element.disabled;
        }
        get sourceURL() {
            return this.element.src;
        }
        get loadingStyle() {
            return this.element.loading;
        }
        get isLoading() {
            return this.formSubmission !== undefined || this.loadingURL !== undefined;
        }
        get isActive() {
            return this.element.isActive;
        }
    }
    function getFrameElementById(id) {
        if (id != null) {
            const element = document.getElementById(id);
            if (element instanceof FrameElement) {
                return element;
            }
        }
    }
    function readScrollLogicalPosition(value, defaultValue) {
        if (value == "end" || value == "start" || value == "center" || value == "nearest") {
            return value;
        }
        else {
            return defaultValue;
        }
    }
    function fragmentFromHTML(html) {
        if (html) {
            const foreignDocument = document.implementation.createHTMLDocument();
            return foreignDocument.createRange().createContextualFragment(html);
        }
    }
    function activateElement(element) {
        if (element && element.ownerDocument !== document) {
            element = document.importNode(element, true);
        }
        if (element instanceof FrameElement) {
            return element;
        }
    }

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

    FrameElement.delegateConstructor = FrameController;
    customElements.define("turbo-frame", FrameElement);
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
