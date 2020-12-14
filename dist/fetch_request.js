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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { FetchResponse } from "./fetch_response";
import { dispatch } from "./util";
export var FetchMethod;
(function (FetchMethod) {
    FetchMethod[FetchMethod["get"] = 0] = "get";
    FetchMethod[FetchMethod["post"] = 1] = "post";
    FetchMethod[FetchMethod["put"] = 2] = "put";
    FetchMethod[FetchMethod["patch"] = 3] = "patch";
    FetchMethod[FetchMethod["delete"] = 4] = "delete";
})(FetchMethod || (FetchMethod = {}));
export function fetchMethodFromString(method) {
    switch (method.toLowerCase()) {
        case "get": return FetchMethod.get;
        case "post": return FetchMethod.post;
        case "put": return FetchMethod.put;
        case "patch": return FetchMethod.patch;
        case "delete": return FetchMethod.delete;
    }
}
var FetchRequest = /** @class */ (function () {
    function FetchRequest(delegate, method, location, body) {
        this.abortController = new AbortController;
        this.delegate = delegate;
        this.method = method;
        this.location = location;
        this.body = body;
    }
    Object.defineProperty(FetchRequest.prototype, "url", {
        get: function () {
            var url = this.location.absoluteURL;
            var query = this.params.toString();
            if (this.isIdempotent && query.length) {
                return [url, query].join(url.includes("?") ? "&" : "?");
            }
            else {
                return url;
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchRequest.prototype, "params", {
        get: function () {
            return this.entries.reduce(function (params, _a) {
                var name = _a[0], value = _a[1];
                params.append(name, value.toString());
                return params;
            }, new URLSearchParams);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchRequest.prototype, "entries", {
        get: function () {
            return this.body ? Array.from(this.body.entries()) : [];
        },
        enumerable: false,
        configurable: true
    });
    FetchRequest.prototype.cancel = function () {
        this.abortController.abort();
    };
    FetchRequest.prototype.perform = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fetchOptions, response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fetchOptions = this.fetchOptions;
                        dispatch("turbo:before-fetch-request", { data: { fetchOptions: fetchOptions } });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 6]);
                        this.delegate.requestStarted(this);
                        return [4 /*yield*/, fetch(this.url, fetchOptions)];
                    case 2:
                        response = _a.sent();
                        return [4 /*yield*/, this.receive(response)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        error_1 = _a.sent();
                        this.delegate.requestErrored(this, error_1);
                        throw error_1;
                    case 5:
                        this.delegate.requestFinished(this);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    FetchRequest.prototype.receive = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var fetchResponse, event;
            return __generator(this, function (_a) {
                fetchResponse = new FetchResponse(response);
                event = dispatch("turbo:before-fetch-response", { cancelable: true, data: { fetchResponse: fetchResponse } });
                if (event.defaultPrevented) {
                    this.delegate.requestPreventedHandlingResponse(this, fetchResponse);
                }
                else if (fetchResponse.succeeded) {
                    this.delegate.requestSucceededWithResponse(this, fetchResponse);
                }
                else {
                    this.delegate.requestFailedWithResponse(this, fetchResponse);
                }
                return [2 /*return*/, fetchResponse];
            });
        });
    };
    Object.defineProperty(FetchRequest.prototype, "fetchOptions", {
        get: function () {
            return {
                method: FetchMethod[this.method].toUpperCase(),
                credentials: "same-origin",
                headers: this.headers,
                redirect: "follow",
                body: this.isIdempotent ? undefined : this.body,
                signal: this.abortSignal
            };
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchRequest.prototype, "isIdempotent", {
        get: function () {
            return this.method == FetchMethod.get;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchRequest.prototype, "headers", {
        get: function () {
            return __assign({ "Accept": "text/html, application/xhtml+xml" }, this.additionalHeaders);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchRequest.prototype, "additionalHeaders", {
        get: function () {
            if (typeof this.delegate.additionalHeadersForRequest == "function") {
                return this.delegate.additionalHeadersForRequest(this);
            }
            else {
                return {};
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FetchRequest.prototype, "abortSignal", {
        get: function () {
            return this.abortController.signal;
        },
        enumerable: false,
        configurable: true
    });
    return FetchRequest;
}());
export { FetchRequest };
//# sourceMappingURL=fetch_request.js.map