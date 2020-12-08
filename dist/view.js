import { ErrorRenderer } from "./error_renderer";
import { Location } from "./location";
import { Snapshot } from "./snapshot";
import { SnapshotCache } from "./snapshot_cache";
import { SnapshotRenderer } from "./snapshot_renderer";
import { defer } from "./util";
var View = /** @class */ (function () {
    function View(delegate) {
        this.htmlElement = document.documentElement;
        this.snapshotCache = new SnapshotCache(10);
        this.delegate = delegate;
    }
    View.prototype.getRootLocation = function () {
        return this.getSnapshot().getRootLocation();
    };
    View.prototype.getElementForAnchor = function (anchor) {
        return this.getSnapshot().getElementForAnchor(anchor);
    };
    View.prototype.getSnapshot = function () {
        return Snapshot.fromHTMLElement(this.htmlElement);
    };
    View.prototype.clearSnapshotCache = function () {
        this.snapshotCache.clear();
    };
    View.prototype.shouldCacheSnapshot = function () {
        return this.getSnapshot().isCacheable();
    };
    View.prototype.cacheSnapshot = function () {
        var _this = this;
        if (this.shouldCacheSnapshot()) {
            this.delegate.viewWillCacheSnapshot();
            var snapshot_1 = this.getSnapshot();
            var location_1 = this.lastRenderedLocation || Location.currentLocation;
            defer(function () { return _this.snapshotCache.put(location_1, snapshot_1.clone()); });
        }
    };
    View.prototype.getCachedSnapshotForLocation = function (location) {
        return this.snapshotCache.get(location);
    };
    View.prototype.render = function (_a, callback) {
        var snapshot = _a.snapshot, error = _a.error, isPreview = _a.isPreview;
        this.markAsPreview(isPreview);
        if (snapshot) {
            this.renderSnapshot(snapshot, isPreview, callback);
        }
        else {
            this.renderError(error, callback);
        }
    };
    // Scrolling
    View.prototype.scrollToAnchor = function (anchor) {
        var element = this.getElementForAnchor(anchor);
        if (element) {
            this.scrollToElement(element);
        }
        else {
            this.scrollToPosition({ x: 0, y: 0 });
        }
    };
    View.prototype.scrollToElement = function (element) {
        element.scrollIntoView();
    };
    View.prototype.scrollToPosition = function (_a) {
        var x = _a.x, y = _a.y;
        window.scrollTo(x, y);
    };
    // Private
    View.prototype.markAsPreview = function (isPreview) {
        if (isPreview) {
            this.htmlElement.setAttribute("data-turbo-preview", "");
        }
        else {
            this.htmlElement.removeAttribute("data-turbo-preview");
        }
    };
    View.prototype.renderSnapshot = function (snapshot, isPreview, callback) {
        SnapshotRenderer.render(this.delegate, callback, this.getSnapshot(), snapshot, isPreview || false);
    };
    View.prototype.renderError = function (error, callback) {
        ErrorRenderer.render(this.delegate, callback, error || "");
    };
    return View;
}());
export { View };
//# sourceMappingURL=view.js.map