var ScrollObserver = /** @class */ (function () {
    function ScrollObserver(delegate) {
        var _this = this;
        this.started = false;
        this.onScroll = function () {
            _this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset });
        };
        this.delegate = delegate;
    }
    ScrollObserver.prototype.start = function () {
        if (!this.started) {
            addEventListener("scroll", this.onScroll, false);
            this.onScroll();
            this.started = true;
        }
    };
    ScrollObserver.prototype.stop = function () {
        if (this.started) {
            removeEventListener("scroll", this.onScroll, false);
            this.started = false;
        }
    };
    // Private
    ScrollObserver.prototype.updatePosition = function (position) {
        this.delegate.scrollPositionChanged(position);
    };
    return ScrollObserver;
}());
export { ScrollObserver };
//# sourceMappingURL=scroll_observer.js.map