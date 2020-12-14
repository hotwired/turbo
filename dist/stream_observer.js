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
import { StreamMessage } from "./stream_message";
var StreamObserver = /** @class */ (function () {
    function StreamObserver(delegate) {
        var _this = this;
        this.sources = new Set;
        this.started = false;
        this.prepareFetchRequest = function (event) {
            var _a;
            var fetchOptions = (_a = event.data) === null || _a === void 0 ? void 0 : _a.fetchOptions;
            if (fetchOptions) {
                var headers = fetchOptions.headers;
                headers.Accept = [StreamMessage.contentType, headers.Accept].join(", ");
            }
        };
        this.inspectFetchResponse = function (event) {
            var fetchResponse = fetchResponseFromEvent(event);
            if ((fetchResponse === null || fetchResponse === void 0 ? void 0 : fetchResponse.contentType) == StreamMessage.contentType) {
                event.preventDefault();
                _this.receiveMessageResponse(fetchResponse);
            }
        };
        this.receiveMessageEvent = function (event) {
            if (_this.started && typeof event.data == "string") {
                _this.receiveMessageHTML(event.data);
            }
        };
        this.delegate = delegate;
    }
    StreamObserver.prototype.start = function () {
        if (!this.started) {
            this.started = true;
            addEventListener("turbo:before-fetch-request", this.prepareFetchRequest, true);
            addEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
        }
    };
    StreamObserver.prototype.stop = function () {
        if (this.started) {
            this.started = false;
            removeEventListener("turbo:before-fetch-request", this.prepareFetchRequest, true);
            removeEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
        }
    };
    StreamObserver.prototype.connectStreamSource = function (source) {
        if (!this.streamSourceIsConnected(source)) {
            this.sources.add(source);
            source.addEventListener("message", this.receiveMessageEvent, false);
        }
    };
    StreamObserver.prototype.disconnectStreamSource = function (source) {
        if (this.streamSourceIsConnected(source)) {
            this.sources.delete(source);
            source.removeEventListener("message", this.receiveMessageEvent, false);
        }
    };
    StreamObserver.prototype.streamSourceIsConnected = function (source) {
        return this.sources.has(source);
    };
    StreamObserver.prototype.receiveMessageResponse = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var html;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, response.responseHTML];
                    case 1:
                        html = _a.sent();
                        if (html) {
                            this.receiveMessageHTML(html);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    StreamObserver.prototype.receiveMessageHTML = function (html) {
        this.delegate.receivedMessageFromStream(new StreamMessage(html));
    };
    return StreamObserver;
}());
export { StreamObserver };
function fetchResponseFromEvent(event) {
    var _a;
    if (((_a = event.data) === null || _a === void 0 ? void 0 : _a.fetchResponse) instanceof FetchResponse) {
        return event.data.fetchResponse;
    }
}
//# sourceMappingURL=stream_observer.js.map