import { Location } from "./location";
import { closest } from "./util";
var LinkClickObserver = /** @class */ (function () {
    function LinkClickObserver(delegate) {
        var _this = this;
        this.started = false;
        this.clickCaptured = function () {
            removeEventListener("click", _this.clickBubbled, false);
            addEventListener("click", _this.clickBubbled, false);
        };
        this.clickBubbled = function (event) {
            if (_this.clickEventIsSignificant(event)) {
                var link = _this.findLinkFromClickTarget(event.target);
                if (link) {
                    var location_1 = _this.getLocationForLink(link);
                    if (_this.delegate.willFollowLinkToLocation(link, location_1)) {
                        event.preventDefault();
                        _this.delegate.followedLinkToLocation(link, location_1);
                    }
                }
            }
        };
        this.delegate = delegate;
    }
    LinkClickObserver.prototype.start = function () {
        if (!this.started) {
            addEventListener("click", this.clickCaptured, true);
            this.started = true;
        }
    };
    LinkClickObserver.prototype.stop = function () {
        if (this.started) {
            removeEventListener("click", this.clickCaptured, true);
            this.started = false;
        }
    };
    LinkClickObserver.prototype.clickEventIsSignificant = function (event) {
        return !((event.target && event.target.isContentEditable)
            || event.defaultPrevented
            || event.which > 1
            || event.altKey
            || event.ctrlKey
            || event.metaKey
            || event.shiftKey);
    };
    LinkClickObserver.prototype.findLinkFromClickTarget = function (target) {
        if (target instanceof Element) {
            return closest(target, "a[href]:not([target^=_]):not([download])");
        }
    };
    LinkClickObserver.prototype.getLocationForLink = function (link) {
        return new Location(link.getAttribute("href") || "");
    };
    return LinkClickObserver;
}());
export { LinkClickObserver };
//# sourceMappingURL=link_click_observer.js.map