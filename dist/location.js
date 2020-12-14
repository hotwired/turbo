var Location = /** @class */ (function () {
    function Location(url) {
        var linkWithAnchor = document.createElement("a");
        linkWithAnchor.href = url;
        this.absoluteURL = linkWithAnchor.href;
        var anchorLength = linkWithAnchor.hash.length;
        if (anchorLength < 2) {
            this.requestURL = this.absoluteURL;
        }
        else {
            this.requestURL = this.absoluteURL.slice(0, -anchorLength);
            this.anchor = linkWithAnchor.hash.slice(1);
        }
    }
    Object.defineProperty(Location, "currentLocation", {
        get: function () {
            return this.wrap(window.location.toString());
        },
        enumerable: false,
        configurable: true
    });
    Location.wrap = function (locatable) {
        if (typeof locatable == "string") {
            return new this(locatable);
        }
        else if (locatable != null) {
            return locatable;
        }
    };
    Location.prototype.getOrigin = function () {
        return this.absoluteURL.split("/", 3).join("/");
    };
    Location.prototype.getPath = function () {
        return (this.requestURL.match(/\/\/[^/]*(\/[^?;]*)/) || [])[1] || "/";
    };
    Location.prototype.getPathComponents = function () {
        return this.getPath().split("/").slice(1);
    };
    Location.prototype.getLastPathComponent = function () {
        return this.getPathComponents().slice(-1)[0];
    };
    Location.prototype.getExtension = function () {
        return (this.getLastPathComponent().match(/\.[^.]*$/) || [])[0] || "";
    };
    Location.prototype.isHTML = function () {
        return !!this.getExtension().match(/^(?:|\.(?:htm|html|xhtml))$/);
    };
    Location.prototype.isPrefixedBy = function (location) {
        var prefixURL = getPrefixURL(location);
        return this.isEqualTo(location) || stringStartsWith(this.absoluteURL, prefixURL);
    };
    Location.prototype.isEqualTo = function (location) {
        return location && this.absoluteURL === location.absoluteURL;
    };
    Location.prototype.toCacheKey = function () {
        return this.requestURL;
    };
    Location.prototype.toJSON = function () {
        return this.absoluteURL;
    };
    Location.prototype.toString = function () {
        return this.absoluteURL;
    };
    Location.prototype.valueOf = function () {
        return this.absoluteURL;
    };
    return Location;
}());
export { Location };
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
//# sourceMappingURL=location.js.map