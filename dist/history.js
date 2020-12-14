var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { Location } from "./location";
import { defer, uuid } from "./util";
var History = /** @class */ (function () {
    function History(delegate) {
        var _this = this;
        this.restorationData = {};
        this.started = false;
        this.pageLoaded = false;
        // Event handlers
        this.onPopState = function (event) {
            if (_this.shouldHandlePopState()) {
                var turbo = (event.state || {}).turbo;
                if (turbo) {
                    var location_1 = Location.currentLocation;
                    _this.location = location_1;
                    var restorationIdentifier = turbo.restorationIdentifier;
                    _this.restorationIdentifier = restorationIdentifier;
                    _this.delegate.historyPoppedToLocationWithRestorationIdentifier(location_1, restorationIdentifier);
                }
            }
        };
        this.onPageLoad = function (event) {
            defer(function () {
                _this.pageLoaded = true;
            });
        };
        this.delegate = delegate;
    }
    History.prototype.start = function () {
        if (!this.started) {
            this.previousScrollRestoration = history.scrollRestoration;
            history.scrollRestoration = "manual";
            addEventListener("popstate", this.onPopState, false);
            addEventListener("load", this.onPageLoad, false);
            this.started = true;
            this.replace(Location.currentLocation);
        }
    };
    History.prototype.stop = function () {
        var _a;
        if (this.started) {
            history.scrollRestoration = (_a = this.previousScrollRestoration) !== null && _a !== void 0 ? _a : "auto";
            removeEventListener("popstate", this.onPopState, false);
            removeEventListener("load", this.onPageLoad, false);
            this.started = false;
        }
    };
    History.prototype.push = function (location, restorationIdentifier) {
        this.update(history.pushState, location, restorationIdentifier);
    };
    History.prototype.replace = function (location, restorationIdentifier) {
        this.update(history.replaceState, location, restorationIdentifier);
    };
    History.prototype.update = function (method, location, restorationIdentifier) {
        if (restorationIdentifier === void 0) { restorationIdentifier = uuid(); }
        var state = { turbo: { restorationIdentifier: restorationIdentifier } };
        method.call(history, state, "", location.absoluteURL);
        this.location = location;
        this.restorationIdentifier = restorationIdentifier;
    };
    // Restoration data
    History.prototype.getRestorationDataForIdentifier = function (restorationIdentifier) {
        return this.restorationData[restorationIdentifier] || {};
    };
    History.prototype.updateRestorationData = function (additionalData) {
        var restorationIdentifier = this.restorationIdentifier;
        var restorationData = this.restorationData[restorationIdentifier];
        this.restorationData[restorationIdentifier] = __assign(__assign({}, restorationData), additionalData);
    };
    // Private
    History.prototype.shouldHandlePopState = function () {
        // Safari dispatches a popstate event after window's load event, ignore it
        return this.pageIsLoaded();
    };
    History.prototype.pageIsLoaded = function () {
        return this.pageLoaded || document.readyState == "complete";
    };
    return History;
}());
export { History };
//# sourceMappingURL=history.js.map