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
import { FormInterceptor } from "./form_interceptor";
import { FormSubmission } from "./form_submission";
import { FrameElement } from "./frame_element";
import { LinkInterceptor } from "./link_interceptor";
import { Location } from "./location";
import { nextAnimationFrame } from "./util";
var FrameController = /** @class */ (function () {
    function FrameController(element) {
        this.resolveVisitPromise = function () { };
        this.element = element;
        this.linkInterceptor = new LinkInterceptor(this, this.element);
        this.formInterceptor = new FormInterceptor(this, this.element);
    }
    FrameController.prototype.connect = function () {
        this.linkInterceptor.start();
        this.formInterceptor.start();
    };
    FrameController.prototype.disconnect = function () {
        this.linkInterceptor.stop();
        this.formInterceptor.stop();
    };
    FrameController.prototype.shouldInterceptLinkClick = function (element, url) {
        return this.shouldInterceptNavigation(element);
    };
    FrameController.prototype.linkClickIntercepted = function (element, url) {
        var frame = this.findFrameElement(element);
        frame.src = url;
    };
    FrameController.prototype.shouldInterceptFormSubmission = function (element) {
        return this.shouldInterceptNavigation(element);
    };
    FrameController.prototype.formSubmissionIntercepted = function (element) {
        if (this.formSubmission) {
            this.formSubmission.stop();
        }
        this.formSubmission = new FormSubmission(this, element);
        this.formSubmission.start();
    };
    FrameController.prototype.visit = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var location, request;
            var _this = this;
            return __generator(this, function (_a) {
                location = Location.wrap(url);
                request = new FetchRequest(this, FetchMethod.get, location);
                return [2 /*return*/, new Promise(function (resolve) {
                        _this.resolveVisitPromise = function () {
                            _this.resolveVisitPromise = function () { };
                            resolve();
                        };
                        request.perform();
                    })];
            });
        });
    };
    FrameController.prototype.additionalHeadersForRequest = function (request) {
        return { "X-Turbo-Frame": this.id };
    };
    FrameController.prototype.requestStarted = function (request) {
        this.element.setAttribute("busy", "");
    };
    FrameController.prototype.requestPreventedHandlingResponse = function (request, response) {
        this.resolveVisitPromise();
    };
    FrameController.prototype.requestSucceededWithResponse = function (request, response) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadResponse(response)];
                    case 1:
                        _a.sent();
                        this.resolveVisitPromise();
                        return [2 /*return*/];
                }
            });
        });
    };
    FrameController.prototype.requestFailedWithResponse = function (request, response) {
        console.error(response);
        this.resolveVisitPromise();
    };
    FrameController.prototype.requestErrored = function (request, error) {
        console.error(error);
        this.resolveVisitPromise();
    };
    FrameController.prototype.requestFinished = function (request) {
        this.element.removeAttribute("busy");
    };
    FrameController.prototype.formSubmissionStarted = function (formSubmission) {
    };
    FrameController.prototype.formSubmissionSucceededWithResponse = function (formSubmission, response) {
        var frame = this.findFrameElement(formSubmission.formElement);
        frame.controller.loadResponse(response);
    };
    FrameController.prototype.formSubmissionFailedWithResponse = function (formSubmission, fetchResponse) {
    };
    FrameController.prototype.formSubmissionErrored = function (formSubmission, error) {
    };
    FrameController.prototype.formSubmissionFinished = function (formSubmission) {
    };
    FrameController.prototype.findFrameElement = function (element) {
        var _a;
        var id = element.getAttribute("data-turbo-frame");
        return (_a = getFrameElementById(id)) !== null && _a !== void 0 ? _a : this.element;
    };
    FrameController.prototype.loadResponse = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var fragment, _a, element;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = fragmentFromHTML;
                        return [4 /*yield*/, response.responseHTML];
                    case 1:
                        fragment = _a.apply(void 0, [_b.sent()]);
                        return [4 /*yield*/, this.extractForeignFrameElement(fragment)];
                    case 2:
                        element = _b.sent();
                        if (!element) return [3 /*break*/, 5];
                        return [4 /*yield*/, nextAnimationFrame()];
                    case 3:
                        _b.sent();
                        this.loadFrameElement(element);
                        this.scrollFrameIntoView(element);
                        return [4 /*yield*/, nextAnimationFrame()];
                    case 4:
                        _b.sent();
                        this.focusFirstAutofocusableElement();
                        _b.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    FrameController.prototype.extractForeignFrameElement = function (container) {
        return __awaiter(this, void 0, void 0, function () {
            var element, id;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = CSS.escape(this.id);
                        if (element = activateElement(container.querySelector("turbo-frame#" + id))) {
                            return [2 /*return*/, element];
                        }
                        if (!(element = activateElement(container.querySelector("turbo-frame[src][recurse~=" + id + "]")))) return [3 /*break*/, 3];
                        return [4 /*yield*/, element.loaded];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.extractForeignFrameElement(element)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    FrameController.prototype.loadFrameElement = function (frameElement) {
        var _a;
        var destinationRange = document.createRange();
        destinationRange.selectNodeContents(this.element);
        destinationRange.deleteContents();
        var sourceRange = (_a = frameElement.ownerDocument) === null || _a === void 0 ? void 0 : _a.createRange();
        if (sourceRange) {
            sourceRange.selectNodeContents(frameElement);
            this.element.appendChild(sourceRange.extractContents());
        }
    };
    FrameController.prototype.focusFirstAutofocusableElement = function () {
        var element = this.firstAutofocusableElement;
        if (element) {
            element.focus();
            return true;
        }
        return false;
    };
    FrameController.prototype.scrollFrameIntoView = function (frame) {
        if (this.element.autoscroll || frame.autoscroll) {
            var element = this.element.firstElementChild;
            var block = readScrollLogicalPosition(this.element.getAttribute("data-autoscroll-block"), "end");
            if (element) {
                element.scrollIntoView({ block: block });
                return true;
            }
        }
        return false;
    };
    FrameController.prototype.shouldInterceptNavigation = function (element) {
        var id = element.getAttribute("data-turbo-frame") || this.element.getAttribute("links-target");
        if (!this.enabled || id == "top") {
            return false;
        }
        if (id) {
            var frameElement_1 = getFrameElementById(id);
            if (frameElement_1) {
                return !frameElement_1.disabled;
            }
        }
        return true;
    };
    Object.defineProperty(FrameController.prototype, "firstAutofocusableElement", {
        get: function () {
            var element = this.element.querySelector("[autofocus]");
            return element instanceof HTMLElement ? element : null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameController.prototype, "id", {
        get: function () {
            return this.element.id;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameController.prototype, "enabled", {
        get: function () {
            return !this.element.disabled;
        },
        enumerable: false,
        configurable: true
    });
    return FrameController;
}());
export { FrameController };
function getFrameElementById(id) {
    if (id != null) {
        var element = document.getElementById(id);
        if (element instanceof FrameElement) {
            return element;
        }
    }
}
function readScrollLogicalPosition(value, defaultValue) {
    if (value == "end" || value == "start" || value == "center" || value == "nearest") {
        return value;
    }
    else {
        return defaultValue;
    }
}
function fragmentFromHTML(html) {
    if (html === void 0) { html = ""; }
    var foreignDocument = document.implementation.createHTMLDocument();
    return foreignDocument.createRange().createContextualFragment(html);
}
function activateElement(element) {
    if (element && element.ownerDocument !== document) {
        element = document.importNode(element, true);
    }
    if (element instanceof FrameElement) {
        return element;
    }
}
//# sourceMappingURL=frame_controller.js.map