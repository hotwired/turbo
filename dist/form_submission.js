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
import { FetchRequest, FetchMethod, fetchMethodFromString } from "./fetch_request";
import { Location } from "./location";
import { dispatch } from "./util";
export var FormSubmissionState;
(function (FormSubmissionState) {
    FormSubmissionState[FormSubmissionState["initialized"] = 0] = "initialized";
    FormSubmissionState[FormSubmissionState["requesting"] = 1] = "requesting";
    FormSubmissionState[FormSubmissionState["waiting"] = 2] = "waiting";
    FormSubmissionState[FormSubmissionState["receiving"] = 3] = "receiving";
    FormSubmissionState[FormSubmissionState["stopping"] = 4] = "stopping";
    FormSubmissionState[FormSubmissionState["stopped"] = 5] = "stopped";
})(FormSubmissionState || (FormSubmissionState = {}));
var FormSubmission = /** @class */ (function () {
    function FormSubmission(delegate, formElement, submitter, mustRedirect) {
        if (mustRedirect === void 0) { mustRedirect = false; }
        this.state = FormSubmissionState.initialized;
        this.delegate = delegate;
        this.formElement = formElement;
        this.formData = buildFormData(formElement, submitter);
        this.submitter = submitter;
        this.fetchRequest = new FetchRequest(this, this.method, this.location, this.formData);
        this.mustRedirect = mustRedirect;
    }
    Object.defineProperty(FormSubmission.prototype, "method", {
        get: function () {
            var _a;
            var method = ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute("formmethod")) || this.formElement.method;
            return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FormSubmission.prototype, "action", {
        get: function () {
            var _a;
            return ((_a = this.submitter) === null || _a === void 0 ? void 0 : _a.getAttribute("formaction")) || this.formElement.action;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FormSubmission.prototype, "location", {
        get: function () {
            return Location.wrap(this.action);
        },
        enumerable: false,
        configurable: true
    });
    // The submission process
    FormSubmission.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var initialized, requesting;
            return __generator(this, function (_a) {
                initialized = FormSubmissionState.initialized, requesting = FormSubmissionState.requesting;
                if (this.state == initialized) {
                    this.state = requesting;
                    return [2 /*return*/, this.fetchRequest.perform()];
                }
                return [2 /*return*/];
            });
        });
    };
    FormSubmission.prototype.stop = function () {
        var stopping = FormSubmissionState.stopping, stopped = FormSubmissionState.stopped;
        if (this.state != stopping && this.state != stopped) {
            this.state = stopping;
            this.fetchRequest.cancel();
            return true;
        }
    };
    // Fetch request delegate
    FormSubmission.prototype.additionalHeadersForRequest = function (request) {
        var headers = {};
        if (this.method != FetchMethod.get) {
            var token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token");
            if (token) {
                headers["X-CSRF-Token"] = token;
            }
        }
        return headers;
    };
    FormSubmission.prototype.requestStarted = function (request) {
        this.state = FormSubmissionState.waiting;
        dispatch("turbo:submit-start", { target: this.formElement, data: { formSubmission: this } });
        this.delegate.formSubmissionStarted(this);
    };
    FormSubmission.prototype.requestPreventedHandlingResponse = function (request, response) {
        this.result = { success: response.succeeded, fetchResponse: response };
    };
    FormSubmission.prototype.requestSucceededWithResponse = function (request, response) {
        if (this.requestMustRedirect(request) && !response.redirected) {
            var error = new Error("Form responses must redirect to another location");
            this.delegate.formSubmissionErrored(this, error);
        }
        else {
            this.state = FormSubmissionState.receiving;
            this.result = { success: true, fetchResponse: response };
            this.delegate.formSubmissionSucceededWithResponse(this, response);
        }
    };
    FormSubmission.prototype.requestFailedWithResponse = function (request, response) {
        this.result = { success: false, fetchResponse: response };
        this.delegate.formSubmissionFailedWithResponse(this, response);
    };
    FormSubmission.prototype.requestErrored = function (request, error) {
        this.result = { success: false, error: error };
        this.delegate.formSubmissionErrored(this, error);
    };
    FormSubmission.prototype.requestFinished = function (request) {
        this.state = FormSubmissionState.stopped;
        dispatch("turbo:submit-end", { target: this.formElement, data: __assign({ formSubmission: this }, this.result) });
        this.delegate.formSubmissionFinished(this);
    };
    FormSubmission.prototype.requestMustRedirect = function (request) {
        return !request.isIdempotent && this.mustRedirect;
    };
    return FormSubmission;
}());
export { FormSubmission };
function buildFormData(formElement, submitter) {
    var formData = new FormData(formElement);
    var name = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("name");
    var value = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("value");
    if (name && formData.get(name) != value)
        formData.append(name, value || "");
    return formData;
}
function getCookieValue(cookieName) {
    if (cookieName != null) {
        var cookies = document.cookie ? document.cookie.split("; ") : [];
        var cookie = cookies.find(function (cookie) { return cookie.startsWith(cookieName); });
        if (cookie) {
            var value = cookie.split("=").slice(1).join("=");
            return value ? decodeURIComponent(value) : undefined;
        }
    }
}
function getMetaContent(name) {
    var element = document.querySelector("meta[name=\"" + name + "\"]");
    return element && element.content;
}
//# sourceMappingURL=form_submission.js.map