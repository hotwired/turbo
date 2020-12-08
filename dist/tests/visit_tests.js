var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
import { TurboTestCase } from "./helpers/turbo_test_case";
import { get } from "http";
var VisitTests = /** @class */ (function (_super) {
    __extends(VisitTests, _super);
    function VisitTests() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VisitTests.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.goToLocation("/fixtures/visit.html");
                return [2 /*return*/];
            });
        });
    };
    VisitTests.prototype["test programmatically visiting a same-origin location"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var urlBeforeVisit, urlAfterVisit, _a, _b, urlFromBeforeVisitEvent, urlFromVisitEvent, timing;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.location];
                    case 1:
                        urlBeforeVisit = _c.sent();
                        return [4 /*yield*/, this.visitLocation("/fixtures/one.html")];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, this.location];
                    case 3:
                        urlAfterVisit = _c.sent();
                        this.assert.notEqual(urlBeforeVisit, urlAfterVisit);
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 4:
                        _b.apply(_a, [_c.sent(), "advance"]);
                        return [4 /*yield*/, this.nextEventNamed("turbo:before-visit")];
                    case 5:
                        urlFromBeforeVisitEvent = (_c.sent()).url;
                        this.assert.equal(urlFromBeforeVisitEvent, urlAfterVisit);
                        return [4 /*yield*/, this.nextEventNamed("turbo:visit")];
                    case 6:
                        urlFromVisitEvent = (_c.sent()).url;
                        this.assert.equal(urlFromVisitEvent, urlAfterVisit);
                        return [4 /*yield*/, this.nextEventNamed("turbo:load")];
                    case 7:
                        timing = (_c.sent()).timing;
                        this.assert.ok(timing);
                        return [2 /*return*/];
                }
            });
        });
    };
    VisitTests.prototype["skip programmatically visiting a cross-origin location falls back to window.location"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var urlBeforeVisit, urlAfterVisit, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.location];
                    case 1:
                        urlBeforeVisit = _c.sent();
                        return [4 /*yield*/, this.visitLocation("about:blank")];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, this.location];
                    case 3:
                        urlAfterVisit = _c.sent();
                        this.assert.notEqual(urlBeforeVisit, urlAfterVisit);
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 4:
                        _b.apply(_a, [_c.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    VisitTests.prototype["test visiting a location served with a non-HTML content type"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var urlBeforeVisit, url, contentType, urlAfterVisit, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.location];
                    case 1:
                        urlBeforeVisit = _c.sent();
                        return [4 /*yield*/, this.visitLocation("/fixtures/svg")];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, this.remote.getCurrentUrl()];
                    case 3:
                        url = _c.sent();
                        return [4 /*yield*/, contentTypeOfURL(url)];
                    case 4:
                        contentType = _c.sent();
                        this.assert.equal(contentType, "image/svg+xml");
                        return [4 /*yield*/, this.location];
                    case 5:
                        urlAfterVisit = _c.sent();
                        this.assert.notEqual(urlBeforeVisit, urlAfterVisit);
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 6:
                        _b.apply(_a, [_c.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    VisitTests.prototype["test canceling a before-visit event prevents navigation"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var urlBeforeVisit, _a, urlAfterVisit;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.cancelNextVisit();
                        return [4 /*yield*/, this.location];
                    case 1:
                        urlBeforeVisit = _b.sent();
                        this.clickSelector("#same-origin-link");
                        return [4 /*yield*/, this.nextBeat];
                    case 2:
                        _b.sent();
                        _a = this.assert;
                        return [4 /*yield*/, this.changedBody];
                    case 3:
                        _a.apply(this, [!(_b.sent())]);
                        return [4 /*yield*/, this.location];
                    case 4:
                        urlAfterVisit = _b.sent();
                        this.assert.equal(urlAfterVisit, urlBeforeVisit);
                        return [2 /*return*/];
                }
            });
        });
    };
    VisitTests.prototype["test navigation by history is not cancelable"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.clickSelector("#same-origin-link");
                        return [4 /*yield*/, this.drainEventLog()];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, this.nextBeat];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, this.goBack()];
                    case 3:
                        _b.sent();
                        _a = this.assert;
                        return [4 /*yield*/, this.changedBody];
                    case 4:
                        _a.apply(this, [_b.sent()]);
                        return [2 /*return*/];
                }
            });
        });
    };
    VisitTests.prototype.visitLocation = function (location) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.remote.execute(function (location) { return window.Turbo.visit(location); }, [location]);
                return [2 /*return*/];
            });
        });
    };
    VisitTests.prototype.cancelNextVisit = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.remote.execute(function () { return addEventListener("turbo:before-visit", function eventListener(event) {
                    removeEventListener("turbo:before-visit", eventListener, false);
                    event.preventDefault();
                }, false); });
                return [2 /*return*/];
            });
        });
    };
    return VisitTests;
}(TurboTestCase));
export { VisitTests };
function contentTypeOfURL(url) {
    return new Promise(function (resolve) {
        get(url, function (_a) {
            var headers = _a.headers;
            return resolve(headers["content-type"]);
        });
    });
}
VisitTests.registerSuite();
//# sourceMappingURL=visit_tests.js.map