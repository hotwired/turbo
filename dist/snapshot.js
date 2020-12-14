import { HeadDetails } from "./head_details";
import { Location } from "./location";
import { array } from "./util";
var Snapshot = /** @class */ (function () {
    function Snapshot(headDetails, bodyElement) {
        this.headDetails = headDetails;
        this.bodyElement = bodyElement;
    }
    Snapshot.wrap = function (value) {
        if (value instanceof this) {
            return value;
        }
        else if (typeof value == "string") {
            return this.fromHTMLString(value);
        }
        else {
            return this.fromHTMLElement(value);
        }
    };
    Snapshot.fromHTMLString = function (html) {
        var documentElement = new DOMParser().parseFromString(html, "text/html").documentElement;
        return this.fromHTMLElement(documentElement);
    };
    Snapshot.fromHTMLElement = function (htmlElement) {
        var headElement = htmlElement.querySelector("head");
        var bodyElement = htmlElement.querySelector("body") || document.createElement("body");
        var headDetails = HeadDetails.fromHeadElement(headElement);
        return new this(headDetails, bodyElement);
    };
    Snapshot.prototype.clone = function () {
        var bodyElement = Snapshot.fromHTMLString(this.bodyElement.outerHTML).bodyElement;
        return new Snapshot(this.headDetails, bodyElement);
    };
    Snapshot.prototype.getRootLocation = function () {
        var root = this.getSetting("root", "/");
        return new Location(root);
    };
    Snapshot.prototype.getCacheControlValue = function () {
        return this.getSetting("cache-control");
    };
    Snapshot.prototype.getElementForAnchor = function (anchor) {
        try {
            return this.bodyElement.querySelector("[id='" + anchor + "'], a[name='" + anchor + "']");
        }
        catch (_a) {
            return null;
        }
    };
    Snapshot.prototype.getPermanentElements = function () {
        return array(this.bodyElement.querySelectorAll("[id][data-turbo-permanent]"));
    };
    Snapshot.prototype.getPermanentElementById = function (id) {
        return this.bodyElement.querySelector("#" + id + "[data-turbo-permanent]");
    };
    Snapshot.prototype.getPermanentElementsPresentInSnapshot = function (snapshot) {
        return this.getPermanentElements().filter(function (_a) {
            var id = _a.id;
            return snapshot.getPermanentElementById(id);
        });
    };
    Snapshot.prototype.findFirstAutofocusableElement = function () {
        return this.bodyElement.querySelector("[autofocus]");
    };
    Snapshot.prototype.hasAnchor = function (anchor) {
        return this.getElementForAnchor(anchor) != null;
    };
    Snapshot.prototype.isPreviewable = function () {
        return this.getCacheControlValue() != "no-preview";
    };
    Snapshot.prototype.isCacheable = function () {
        return this.getCacheControlValue() != "no-cache";
    };
    Snapshot.prototype.isVisitable = function () {
        return this.getSetting("visit-control") != "reload";
    };
    Snapshot.prototype.getSetting = function (name, defaultValue) {
        var value = this.headDetails.getMetaValue("turbo-" + name);
        return value == null ? defaultValue : value;
    };
    return Snapshot;
}());
export { Snapshot };
//# sourceMappingURL=snapshot.js.map