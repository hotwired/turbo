var LinkInterceptor = /** @class */ (function () {
    function LinkInterceptor(delegate, element) {
        var _this = this;
        this.clickBubbled = function (event) {
            if (_this.respondsToEventTarget(event.target)) {
                _this.clickEvent = event;
            }
            else {
                delete _this.clickEvent;
            }
        };
        this.linkClicked = (function (event) {
            if (_this.clickEvent && _this.respondsToEventTarget(event.target)) {
                if (_this.delegate.shouldInterceptLinkClick(event.target, event.data.url)) {
                    _this.clickEvent.preventDefault();
                    event.preventDefault();
                    _this.delegate.linkClickIntercepted(event.target, event.data.url);
                }
            }
            delete _this.clickEvent;
        });
        this.willVisit = function () {
            delete _this.clickEvent;
        };
        this.delegate = delegate;
        this.element = element;
    }
    LinkInterceptor.prototype.start = function () {
        this.element.addEventListener("click", this.clickBubbled);
        document.addEventListener("turbo:click", this.linkClicked);
        document.addEventListener("turbo:before-visit", this.willVisit);
    };
    LinkInterceptor.prototype.stop = function () {
        this.element.removeEventListener("click", this.clickBubbled);
        document.removeEventListener("turbo:click", this.linkClicked);
        document.removeEventListener("turbo:before-visit", this.willVisit);
    };
    LinkInterceptor.prototype.respondsToEventTarget = function (target) {
        var element = target instanceof Element
            ? target
            : target instanceof Node
                ? target.parentElement
                : null;
        return element && element.closest("turbo-frame, html") == this.element;
    };
    return LinkInterceptor;
}());
export { LinkInterceptor };
//# sourceMappingURL=link_interceptor.js.map