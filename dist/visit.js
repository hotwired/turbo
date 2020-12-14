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
import { FetchMethod, FetchRequest } from "./fetch_request";
import { Snapshot } from "./snapshot";
import { uuid } from "./util";
export var TimingMetric;
(function (TimingMetric) {
    TimingMetric["visitStart"] = "visitStart";
    TimingMetric["requestStart"] = "requestStart";
    TimingMetric["requestEnd"] = "requestEnd";
    TimingMetric["visitEnd"] = "visitEnd";
})(TimingMetric || (TimingMetric = {}));
export var VisitState;
(function (VisitState) {
    VisitState["initialized"] = "initialized";
    VisitState["started"] = "started";
    VisitState["canceled"] = "canceled";
    VisitState["failed"] = "failed";
    VisitState["completed"] = "completed";
})(VisitState || (VisitState = {}));
var defaultOptions = {
    action: "advance",
    historyChanged: false
};
export var SystemStatusCode;
(function (SystemStatusCode) {
    SystemStatusCode[SystemStatusCode["networkFailure"] = 0] = "networkFailure";
    SystemStatusCode[SystemStatusCode["timeoutFailure"] = -1] = "timeoutFailure";
    SystemStatusCode[SystemStatusCode["contentTypeMismatch"] = -2] = "contentTypeMismatch";
})(SystemStatusCode || (SystemStatusCode = {}));
var Visit = /** @class */ (function () {
    function Visit(delegate, location, restorationIdentifier, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.identifier = uuid();
        this.timingMetrics = {};
        this.followedRedirect = false;
        this.historyChanged = false;
        this.scrolled = false;
        this.snapshotCached = false;
        this.state = VisitState.initialized;
        // Scrolling
        this.performScroll = function () {
            if (!_this.scrolled) {
                if (_this.action == "restore") {
                    _this.scrollToRestoredPosition() || _this.scrollToTop();
                }
                else {
                    _this.scrollToAnchor() || _this.scrollToTop();
                }
                _this.scrolled = true;
            }
        };
        this.delegate = delegate;
        this.location = location;
        this.restorationIdentifier = restorationIdentifier || uuid();
        var _a = __assign(__assign({}, defaultOptions), options), action = _a.action, historyChanged = _a.historyChanged, referrer = _a.referrer, snapshotHTML = _a.snapshotHTML, response = _a.response;
        this.action = action;
        this.historyChanged = historyChanged;
        this.referrer = referrer;
        this.snapshotHTML = snapshotHTML;
        this.response = response;
    }
    Object.defineProperty(Visit.prototype, "adapter", {
        get: function () {
            return this.delegate.adapter;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Visit.prototype, "view", {
        get: function () {
            return this.delegate.view;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Visit.prototype, "history", {
        get: function () {
            return this.delegate.history;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Visit.prototype, "restorationData", {
        get: function () {
            return this.history.getRestorationDataForIdentifier(this.restorationIdentifier);
        },
        enumerable: false,
        configurable: true
    });
    Visit.prototype.start = function () {
        if (this.state == VisitState.initialized) {
            this.recordTimingMetric(TimingMetric.visitStart);
            this.state = VisitState.started;
            this.adapter.visitStarted(this);
            this.delegate.visitStarted(this);
        }
    };
    Visit.prototype.cancel = function () {
        if (this.state == VisitState.started) {
            if (this.request) {
                this.request.cancel();
            }
            this.cancelRender();
            this.state = VisitState.canceled;
        }
    };
    Visit.prototype.complete = function () {
        if (this.state == VisitState.started) {
            this.recordTimingMetric(TimingMetric.visitEnd);
            this.state = VisitState.completed;
            this.adapter.visitCompleted(this);
            this.delegate.visitCompleted(this);
        }
    };
    Visit.prototype.fail = function () {
        if (this.state == VisitState.started) {
            this.state = VisitState.failed;
            this.adapter.visitFailed(this);
        }
    };
    Visit.prototype.changeHistory = function () {
        if (!this.historyChanged) {
            var actionForHistory = this.location.isEqualTo(this.referrer) ? "replace" : this.action;
            var method = this.getHistoryMethodForAction(actionForHistory);
            this.history.update(method, this.location, this.restorationIdentifier);
            this.historyChanged = true;
        }
    };
    Visit.prototype.issueRequest = function () {
        if (this.hasPreloadedResponse()) {
            this.simulateRequest();
        }
        else if (this.shouldIssueRequest() && !this.request) {
            this.request = new FetchRequest(this, FetchMethod.get, this.location);
            this.request.perform();
        }
    };
    Visit.prototype.simulateRequest = function () {
        if (this.response) {
            this.startRequest();
            this.recordResponse();
            this.finishRequest();
        }
    };
    Visit.prototype.startRequest = function () {
        this.recordTimingMetric(TimingMetric.requestStart);
        this.adapter.visitRequestStarted(this);
    };
    Visit.prototype.recordResponse = function (response) {
        if (response === void 0) { response = this.response; }
        this.response = response;
        if (response) {
            var statusCode = response.statusCode;
            if (isSuccessful(statusCode)) {
                this.adapter.visitRequestCompleted(this);
            }
            else {
                this.adapter.visitRequestFailedWithStatusCode(this, statusCode);
            }
        }
    };
    Visit.prototype.finishRequest = function () {
        this.recordTimingMetric(TimingMetric.requestEnd);
        this.adapter.visitRequestFinished(this);
    };
    Visit.prototype.loadResponse = function () {
        var _this = this;
        if (this.response) {
            var _a = this.response, statusCode_1 = _a.statusCode, responseHTML_1 = _a.responseHTML;
            this.render(function () {
                _this.cacheSnapshot();
                if (isSuccessful(statusCode_1) && responseHTML_1 != null) {
                    _this.view.render({ snapshot: Snapshot.fromHTMLString(responseHTML_1) }, _this.performScroll);
                    _this.adapter.visitRendered(_this);
                    _this.complete();
                }
                else {
                    _this.view.render({ error: responseHTML_1 }, _this.performScroll);
                    _this.adapter.visitRendered(_this);
                    _this.fail();
                }
            });
        }
    };
    Visit.prototype.getCachedSnapshot = function () {
        var snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot();
        if (snapshot && (!this.location.anchor || snapshot.hasAnchor(this.location.anchor))) {
            if (this.action == "restore" || snapshot.isPreviewable()) {
                return snapshot;
            }
        }
    };
    Visit.prototype.getPreloadedSnapshot = function () {
        if (this.snapshotHTML) {
            return Snapshot.wrap(this.snapshotHTML);
        }
    };
    Visit.prototype.hasCachedSnapshot = function () {
        return this.getCachedSnapshot() != null;
    };
    Visit.prototype.loadCachedSnapshot = function () {
        var _this = this;
        var snapshot = this.getCachedSnapshot();
        if (snapshot) {
            var isPreview_1 = this.shouldIssueRequest();
            this.render(function () {
                _this.cacheSnapshot();
                _this.view.render({ snapshot: snapshot, isPreview: isPreview_1 }, _this.performScroll);
                _this.adapter.visitRendered(_this);
                if (!isPreview_1) {
                    _this.complete();
                }
            });
        }
    };
    Visit.prototype.followRedirect = function () {
        if (this.redirectedToLocation && !this.followedRedirect) {
            this.location = this.redirectedToLocation;
            this.history.replace(this.redirectedToLocation, this.restorationIdentifier);
            this.followedRedirect = true;
        }
    };
    // Fetch request delegate
    Visit.prototype.requestStarted = function () {
        this.startRequest();
    };
    Visit.prototype.requestPreventedHandlingResponse = function (request, response) {
    };
    Visit.prototype.requestSucceededWithResponse = function (request, response) {
        return __awaiter(this, void 0, void 0, function () {
            var responseHTML;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, response.responseHTML];
                    case 1:
                        responseHTML = _a.sent();
                        if (responseHTML == undefined) {
                            this.recordResponse({ statusCode: SystemStatusCode.contentTypeMismatch });
                        }
                        else {
                            this.redirectedToLocation = response.redirected ? response.location : undefined;
                            this.recordResponse({ statusCode: response.statusCode, responseHTML: responseHTML });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Visit.prototype.requestFailedWithResponse = function (request, response) {
        return __awaiter(this, void 0, void 0, function () {
            var responseHTML;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, response.responseHTML];
                    case 1:
                        responseHTML = _a.sent();
                        if (responseHTML == undefined) {
                            this.recordResponse({ statusCode: SystemStatusCode.contentTypeMismatch });
                        }
                        else {
                            this.recordResponse({ statusCode: response.statusCode, responseHTML: responseHTML });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Visit.prototype.requestErrored = function (request, error) {
        this.recordResponse({ statusCode: SystemStatusCode.networkFailure });
    };
    Visit.prototype.requestFinished = function () {
        this.finishRequest();
    };
    Visit.prototype.scrollToRestoredPosition = function () {
        var scrollPosition = this.restorationData.scrollPosition;
        if (scrollPosition) {
            this.view.scrollToPosition(scrollPosition);
            return true;
        }
    };
    Visit.prototype.scrollToAnchor = function () {
        if (this.location.anchor != null) {
            this.view.scrollToAnchor(this.location.anchor);
            return true;
        }
    };
    Visit.prototype.scrollToTop = function () {
        this.view.scrollToPosition({ x: 0, y: 0 });
    };
    // Instrumentation
    Visit.prototype.recordTimingMetric = function (metric) {
        this.timingMetrics[metric] = new Date().getTime();
    };
    Visit.prototype.getTimingMetrics = function () {
        return __assign({}, this.timingMetrics);
    };
    // Private
    Visit.prototype.getHistoryMethodForAction = function (action) {
        switch (action) {
            case "replace": return history.replaceState;
            case "advance":
            case "restore": return history.pushState;
        }
    };
    Visit.prototype.hasPreloadedResponse = function () {
        return typeof this.response == "object";
    };
    Visit.prototype.shouldIssueRequest = function () {
        return this.action == "restore"
            ? !this.hasCachedSnapshot()
            : true;
    };
    Visit.prototype.cacheSnapshot = function () {
        if (!this.snapshotCached) {
            this.view.cacheSnapshot();
            this.snapshotCached = true;
        }
    };
    Visit.prototype.render = function (callback) {
        var _this = this;
        this.cancelRender();
        this.frame = requestAnimationFrame(function () {
            delete _this.frame;
            callback.call(_this);
        });
    };
    Visit.prototype.cancelRender = function () {
        if (this.frame) {
            cancelAnimationFrame(this.frame);
            delete this.frame;
        }
    };
    return Visit;
}());
export { Visit };
function isSuccessful(statusCode) {
    return statusCode >= 200 && statusCode < 300;
}
//# sourceMappingURL=visit.js.map