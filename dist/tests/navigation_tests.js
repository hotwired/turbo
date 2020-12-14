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
var NavigationTests = /** @class */ (function (_super) {
    __extends(NavigationTests, _super);
    function NavigationTests() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NavigationTests.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.goToLocation("/fixtures/navigation.html")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test after loading the page"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 1:
                        _b.apply(_a, [_e.sent(), "/fixtures/navigation.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 2:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin unannotated link"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#same-origin-unannotated-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "advance"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin data-turbo-action=replace link"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#same-origin-replace-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "replace"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin data-turbo=false link"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#same-origin-false-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin unannotated link inside a data-turbo=false container"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#same-origin-unannotated-link-inside-false-container");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin data-turbo=true link inside a data-turbo=false container"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#same-origin-true-link-inside-false-container");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "advance"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin anchored link"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        this.clickSelector("#same-origin-anchored-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _h.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_h.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.hash];
                    case 3:
                        _d.apply(_c, [_h.sent(), "#element-id"]);
                        _f = (_e = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 4:
                        _f.apply(_e, [_h.sent(), "advance"]);
                        _g = this.assert;
                        return [4 /*yield*/, this.isScrolledToSelector("#element-id")];
                    case 5:
                        _g.apply(this, [_h.sent()]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin link to a named anchor"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        this.clickSelector("#same-origin-anchored-link-named");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _h.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_h.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.hash];
                    case 3:
                        _d.apply(_c, [_h.sent(), "#named-anchor"]);
                        _f = (_e = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 4:
                        _f.apply(_e, [_h.sent(), "advance"]);
                        _g = this.assert;
                        return [4 /*yield*/, this.isScrolledToSelector("[name=named-anchor]")];
                    case 5:
                        _g.apply(this, [_h.sent()]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a cross-origin unannotated link"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#cross-origin-unannotated-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.location];
                    case 2:
                        _b.apply(_a, [_e.sent(), "about:blank"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin [target] link"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        this.clickSelector("#same-origin-targeted-link");
                        _b = (_a = this.remote).switchToWindow;
                        return [4 /*yield*/, this.nextWindowHandle];
                    case 1:
                        _b.apply(_a, [_g.sent()]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _d.apply(_c, [_g.sent(), "/fixtures/one.html"]);
                        _f = (_e = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _f.apply(_e, [_g.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin [download] link"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        this.clickSelector("#same-origin-download-link");
                        return [4 /*yield*/, this.nextBeat];
                    case 1:
                        _f.sent();
                        _a = this.assert;
                        return [4 /*yield*/, this.changedBody];
                    case 2:
                        _a.apply(this, [!(_f.sent())]);
                        _c = (_b = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 3:
                        _c.apply(_b, [_f.sent(), "/fixtures/navigation.html"]);
                        _e = (_d = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 4:
                        _e.apply(_d, [_f.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a same-origin link inside an SVG element"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#same-origin-link-inside-svg-element");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "advance"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test following a cross-origin link inside an SVG element"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#cross-origin-link-inside-svg-element");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.location];
                    case 2:
                        _b.apply(_a, [_e.sent(), "about:blank"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test clicking the back button"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#same-origin-unannotated-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, this.goBack()];
                    case 2:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 3:
                        _b.apply(_a, [_e.sent(), "/fixtures/navigation.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 4:
                        _d.apply(_c, [_e.sent(), "restore"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    NavigationTests.prototype["test clicking the forward button"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#same-origin-unannotated-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, this.goBack()];
                    case 2:
                        _e.sent();
                        return [4 /*yield*/, this.goForward()];
                    case 3:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 4:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 5:
                        _d.apply(_c, [_e.sent(), "restore"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    return NavigationTests;
}(TurboTestCase));
export { NavigationTests };
NavigationTests.registerSuite();
//# sourceMappingURL=navigation_tests.js.map