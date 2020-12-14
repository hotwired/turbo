import { Location } from "./location";
var FetchResponse = /** @class */ (function () {
    function FetchResponse(response) {
        this.response = response;
    }
    Object.defineProperty(FetchResponse.prototype, "succeeded", {
        get: function () {
            return this.response.ok;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchResponse.prototype, "failed", {
        get: function () {
            return !this.succeeded;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchResponse.prototype, "redirected", {
        get: function () {
            return this.response.redirected;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchResponse.prototype, "location", {
        get: function () {
            return Location.wrap(this.response.url);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchResponse.prototype, "isHTML", {
        get: function () {
            return this.contentType && this.contentType.match(/^text\/html|^application\/xhtml\+xml/);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchResponse.prototype, "statusCode", {
        get: function () {
            return this.response.status;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchResponse.prototype, "contentType", {
        get: function () {
            return this.header("Content-Type");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchResponse.prototype, "responseText", {
        get: function () {
            return this.response.text();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchResponse.prototype, "responseHTML", {
        get: function () {
            if (this.isHTML) {
                return this.response.text();
            }
            else {
                return Promise.resolve(undefined);
            }
        },
        enumerable: false,
        configurable: true
    });
    FetchResponse.prototype.header = function (name) {
        return this.response.headers.get(name);
    };
    return FetchResponse;
}());
export { FetchResponse };
//# sourceMappingURL=fetch_response.js.map