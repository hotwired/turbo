export var PageStage;
(function (PageStage) {
    PageStage[PageStage["initial"] = 0] = "initial";
    PageStage[PageStage["loading"] = 1] = "loading";
    PageStage[PageStage["interactive"] = 2] = "interactive";
    PageStage[PageStage["complete"] = 3] = "complete";
    PageStage[PageStage["invalidated"] = 4] = "invalidated";
})(PageStage || (PageStage = {}));
var PageObserver = /** @class */ (function () {
    function PageObserver(delegate) {
        var _this = this;
        this.stage = PageStage.initial;
        this.started = false;
        this.interpretReadyState = function () {
            var readyState = _this.readyState;
            if (readyState == "interactive") {
                _this.pageIsInteractive();
            }
            else if (readyState == "complete") {
                _this.pageIsComplete();
            }
        };
        this.delegate = delegate;
    }
    PageObserver.prototype.start = function () {
        if (!this.started) {
            if (this.stage == PageStage.initial) {
                this.stage = PageStage.loading;
            }
            document.addEventListener("readystatechange", this.interpretReadyState, false);
            this.started = true;
        }
    };
    PageObserver.prototype.stop = function () {
        if (this.started) {
            document.removeEventListener("readystatechange", this.interpretReadyState, false);
            this.started = false;
        }
    };
    PageObserver.prototype.invalidate = function () {
        if (this.stage != PageStage.invalidated) {
            this.stage = PageStage.invalidated;
            this.delegate.pageInvalidated();
        }
    };
    PageObserver.prototype.pageIsInteractive = function () {
        if (this.stage == PageStage.loading) {
            this.stage = PageStage.interactive;
            this.delegate.pageBecameInteractive();
        }
    };
    PageObserver.prototype.pageIsComplete = function () {
        this.pageIsInteractive();
        if (this.stage == PageStage.interactive) {
            this.stage = PageStage.complete;
            this.delegate.pageLoaded();
        }
    };
    Object.defineProperty(PageObserver.prototype, "readyState", {
        get: function () {
            return document.readyState;
        },
        enumerable: false,
        configurable: true
    });
    return PageObserver;
}());
export { PageObserver };
//# sourceMappingURL=page_observer.js.map