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
import { FetchMethod } from "./fetch_request";
import { FormSubmission } from "./form_submission";
import { Visit } from "./visit";
var Navigator = /** @class */ (function () {
    function Navigator(delegate) {
        this.delegate = delegate;
    }
    Navigator.prototype.proposeVisit = function (location, options) {
        if (options === void 0) { options = {}; }
        if (this.delegate.allowsVisitingLocation(location)) {
            this.delegate.visitProposedToLocation(location, options);
        }
    };
    Navigator.prototype.startVisit = function (location, restorationIdentifier, options) {
        if (options === void 0) { options = {}; }
        this.stop();
        this.currentVisit = new Visit(this, location, restorationIdentifier, __assign({ referrer: this.location }, options));
        this.currentVisit.start();
    };
    Navigator.prototype.submitForm = function (form) {
        this.stop();
        this.formSubmission = new FormSubmission(this, form, true);
        this.formSubmission.start();
    };
    Navigator.prototype.stop = function () {
        if (this.formSubmission) {
            this.formSubmission.stop();
            delete this.formSubmission;
        }
        if (this.currentVisit) {
            this.currentVisit.cancel();
            delete this.currentVisit;
        }
    };
    Navigator.prototype.reload = function () {
    };
    Navigator.prototype.goBack = function () {
    };
    Object.defineProperty(Navigator.prototype, "adapter", {
        get: function () {
            return this.delegate.adapter;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Navigator.prototype, "view", {
        get: function () {
            return this.delegate.view;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Navigator.prototype, "history", {
        get: function () {
            return this.delegate.history;
        },
        enumerable: false,
        configurable: true
    });
    // Form submission delegate
    Navigator.prototype.formSubmissionStarted = function (formSubmission) {
    };
    Navigator.prototype.formSubmissionSucceededWithResponse = function (formSubmission, fetchResponse) {
        return __awaiter(this, void 0, void 0, function () {
            var responseHTML, statusCode, visitOptions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Form submission succeeded", formSubmission);
                        if (!(formSubmission == this.formSubmission)) return [3 /*break*/, 2];
                        return [4 /*yield*/, fetchResponse.responseHTML];
                    case 1:
                        responseHTML = _a.sent();
                        if (responseHTML) {
                            if (formSubmission.method != FetchMethod.get) {
                                console.log("Clearing snapshot cache after successful form submission");
                                this.view.clearSnapshotCache();
                            }
                            statusCode = fetchResponse.statusCode;
                            visitOptions = { response: { statusCode: statusCode, responseHTML: responseHTML } };
                            console.log("Visiting", fetchResponse.location, visitOptions);
                            this.proposeVisit(fetchResponse.location, visitOptions);
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Navigator.prototype.formSubmissionFailedWithResponse = function (formSubmission, fetchResponse) {
        console.error("Form submission failed", formSubmission, fetchResponse);
    };
    Navigator.prototype.formSubmissionErrored = function (formSubmission, error) {
        console.error("Form submission failed", formSubmission, error);
    };
    Navigator.prototype.formSubmissionFinished = function (formSubmission) {
    };
    // Visit delegate
    Navigator.prototype.visitStarted = function (visit) {
        this.delegate.visitStarted(visit);
    };
    Navigator.prototype.visitCompleted = function (visit) {
        this.delegate.visitCompleted(visit);
    };
    Object.defineProperty(Navigator.prototype, "location", {
        // Visits
        get: function () {
            return this.history.location;
        },
        enumerable: false,
        configurable: true
    });
    return Navigator;
}());
export { Navigator };
//# sourceMappingURL=navigator.js.map