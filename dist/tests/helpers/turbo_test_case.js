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
import { BrowserTestCase } from "./browser_test_case";
import { RemoteChannel } from "./remote_channel";
var TurboTestCase = /** @class */ (function (_super) {
    __extends(TurboTestCase, _super);
    function TurboTestCase() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.eventLogChannel = new RemoteChannel(_this.remote, "eventLogs");
        return _this;
    }
    TurboTestCase.prototype.beforeTest = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.drainEventLog()];
                    case 1:
                        _b.sent();
                        _a = this;
                        return [4 /*yield*/, this.body];
                    case 2:
                        _a.lastBody = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(TurboTestCase.prototype, "nextWindowHandle", {
        get: function () {
            var _this = this;
            return (function (nextHandle) { return __awaiter(_this, void 0, void 0, function () {
                var handle, handles;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.remote.getCurrentWindowHandle()];
                        case 1:
                            handle = _a.sent();
                            return [4 /*yield*/, this.remote.getAllWindowHandles()];
                        case 2:
                            handles = _a.sent();
                            nextHandle = handles[handles.indexOf(handle) + 1];
                            _a.label = 3;
                        case 3:
                            if (!nextHandle) return [3 /*break*/, 0];
                            _a.label = 4;
                        case 4: return [2 /*return*/, nextHandle];
                    }
                });
            }); })();
        },
        enumerable: false,
        configurable: true
    });
    TurboTestCase.prototype.nextEventNamed = function (eventName) {
        return __awaiter(this, void 0, void 0, function () {
            var record, records;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!record) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.eventLogChannel.read(1)];
                    case 1:
                        records = _a.sent();
                        record = records.find(function (_a) {
                            var name = _a[0];
                            return name == eventName;
                        });
                        return [3 /*break*/, 0];
                    case 2: return [2 /*return*/, record[1]];
                }
            });
        });
    };
    Object.defineProperty(TurboTestCase.prototype, "nextBeat", {
        get: function () {
            return new Promise(function (resolve) { return setTimeout(resolve, 100); });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TurboTestCase.prototype, "nextBody", {
        get: function () {
            var _this = this;
            return (function () { return __awaiter(_this, void 0, void 0, function () {
                var body;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.changedBody];
                        case 1:
                            body = _a.sent();
                            _a.label = 2;
                        case 2:
                            if (!body) return [3 /*break*/, 0];
                            _a.label = 3;
                        case 3: return [2 /*return*/, this.lastBody = body];
                    }
                });
            }); })();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TurboTestCase.prototype, "changedBody", {
        get: function () {
            var _this = this;
            return (function () { return __awaiter(_this, void 0, void 0, function () {
                var body;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.body];
                        case 1:
                            body = _a.sent();
                            if (!this.lastBody || this.lastBody.elementId != body.elementId) {
                                return [2 /*return*/, body];
                            }
                            return [2 /*return*/];
                    }
                });
            }); })();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TurboTestCase.prototype, "visitAction", {
        get: function () {
            return this.evaluate(function () {
                try {
                    return window.Turbo.navigator.currentVisit.action;
                }
                catch (error) {
                    return "load";
                }
            });
        },
        enumerable: false,
        configurable: true
    });
    TurboTestCase.prototype.drainEventLog = function () {
        return this.eventLogChannel.drain();
    };
    return TurboTestCase;
}(BrowserTestCase));
export { TurboTestCase };
//# sourceMappingURL=turbo_test_case.js.map