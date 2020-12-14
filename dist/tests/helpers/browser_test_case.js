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
import { InternTestCase } from "./intern_test_case";
var BrowserTestCase = /** @class */ (function (_super) {
    __extends(BrowserTestCase, _super);
    function BrowserTestCase() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BrowserTestCase.prototype.goToLocation = function (location) {
        return __awaiter(this, void 0, void 0, function () {
            var processedLocation;
            return __generator(this, function (_a) {
                processedLocation = location.match(/^\//) ? location.slice(1) : location;
                return [2 /*return*/, this.remote.get(processedLocation)];
            });
        });
    };
    BrowserTestCase.prototype.goBack = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.remote.goBack()];
            });
        });
    };
    BrowserTestCase.prototype.goForward = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.remote.goForward()];
            });
        });
    };
    BrowserTestCase.prototype.hasSelector = function (selector) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.remote.findAllByCssSelector(selector)];
                    case 1: return [2 /*return*/, (_a.sent()).length > 0];
                }
            });
        });
    };
    BrowserTestCase.prototype.querySelector = function (selector) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.remote.findByCssSelector(selector)];
            });
        });
    };
    BrowserTestCase.prototype.clickSelector = function (selector) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.remote.findByCssSelector(selector).click()];
            });
        });
    };
    Object.defineProperty(BrowserTestCase.prototype, "scrollPosition", {
        get: function () {
            return this.evaluate(function () { return ({ x: window.scrollX, y: window.scrollY }); });
        },
        enumerable: false,
        configurable: true
    });
    BrowserTestCase.prototype.isScrolledToSelector = function (selector) {
        return __awaiter(this, void 0, void 0, function () {
            var pageY, elementY, offset;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.scrollPosition];
                    case 1:
                        pageY = (_a.sent()).y;
                        return [4 /*yield*/, this.remote.findByCssSelector(selector).getPosition()];
                    case 2:
                        elementY = (_a.sent()).y;
                        offset = pageY - elementY;
                        return [2 /*return*/, offset > -1 && offset < 1];
                }
            });
        });
    };
    BrowserTestCase.prototype.evaluate = function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.remote.execute(callback)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Object.defineProperty(BrowserTestCase.prototype, "head", {
        get: function () {
            return this.evaluate(function () { return document.head; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BrowserTestCase.prototype, "body", {
        get: function () {
            return this.evaluate(function () { return document.body; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BrowserTestCase.prototype, "location", {
        get: function () {
            return this.evaluate(function () { return location.toString(); });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BrowserTestCase.prototype, "pathname", {
        get: function () {
            return this.evaluate(function () { return location.pathname; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(BrowserTestCase.prototype, "hash", {
        get: function () {
            return this.evaluate(function () { return location.hash; });
        },
        enumerable: false,
        configurable: true
    });
    return BrowserTestCase;
}(InternTestCase));
export { BrowserTestCase };
//# sourceMappingURL=browser_test_case.js.map