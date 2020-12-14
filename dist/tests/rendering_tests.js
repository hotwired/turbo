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
var RenderingTests = /** @class */ (function (_super) {
    __extends(RenderingTests, _super);
    function RenderingTests() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RenderingTests.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.goToLocation("/fixtures/rendering.html")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test triggers before-render and render events"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var newBody, h1, _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        this.clickSelector("#same-origin-link");
                        return [4 /*yield*/, this.nextEventNamed("turbo:before-render")];
                    case 1:
                        newBody = (_f.sent()).newBody;
                        return [4 /*yield*/, this.querySelector("h1")];
                    case 2:
                        h1 = _f.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, h1.getVisibleText()];
                    case 3:
                        _b.apply(_a, [_f.sent(), "One"]);
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 4:
                        _f.sent();
                        _c = this.assert;
                        _e = (_d = newBody).equals;
                        return [4 /*yield*/, this.body];
                    case 5: return [4 /*yield*/, _e.apply(_d, [_f.sent()])];
                    case 6:
                        _c.apply(this, [_f.sent()]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test triggers before-render and render events for error pages"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var newBody, _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        this.clickSelector("#nonexistent-link");
                        return [4 /*yield*/, this.nextEventNamed("turbo:before-render")];
                    case 1:
                        newBody = (_f.sent()).newBody;
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, newBody.getVisibleText()];
                    case 2:
                        _b.apply(_a, [_f.sent(), "404 Not Found: /nonexistent"]);
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 3:
                        _f.sent();
                        _c = this.assert;
                        _e = (_d = newBody).equals;
                        return [4 /*yield*/, this.body];
                    case 4: return [4 /*yield*/, _e.apply(_d, [_f.sent()])];
                    case 5:
                        _c.apply(this, [_f.sent()]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test reloads when tracked elements change"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#tracked-asset-change-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/tracked_asset_change.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test reloads when turbo-visit-control setting is reload"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.clickSelector("#visit-control-reload-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/visit_control_reload.html"]);
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test accumulates asset elements in head"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var originalElements, newElements, finalElements;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.assetElements];
                    case 1:
                        originalElements = _a.sent();
                        this.clickSelector("#additional-assets-link");
                        return [4 /*yield*/, this.nextBody];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.assetElements];
                    case 3:
                        newElements = _a.sent();
                        this.assert.notDeepEqual(newElements, originalElements);
                        this.goBack();
                        return [4 /*yield*/, this.nextBody];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.assetElements];
                    case 5:
                        finalElements = _a.sent();
                        this.assert.deepEqual(finalElements, newElements);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test replaces provisional elements in head"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var originalElements, _a, newElements, _b, finalElements, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.provisionalElements];
                    case 1:
                        originalElements = _d.sent();
                        _a = this.assert;
                        return [4 /*yield*/, this.hasSelector("meta[name=test]")];
                    case 2:
                        _a.apply(this, [!(_d.sent())]);
                        this.clickSelector("#same-origin-link");
                        return [4 /*yield*/, this.nextBody];
                    case 3:
                        _d.sent();
                        return [4 /*yield*/, this.provisionalElements];
                    case 4:
                        newElements = _d.sent();
                        this.assert.notDeepEqual(newElements, originalElements);
                        _b = this.assert;
                        return [4 /*yield*/, this.hasSelector("meta[name=test]")];
                    case 5:
                        _b.apply(this, [_d.sent()]);
                        this.goBack();
                        return [4 /*yield*/, this.nextBody];
                    case 6:
                        _d.sent();
                        return [4 /*yield*/, this.provisionalElements];
                    case 7:
                        finalElements = _d.sent();
                        this.assert.notDeepEqual(finalElements, newElements);
                        _c = this.assert;
                        return [4 /*yield*/, this.hasSelector("meta[name=test]")];
                    case 8:
                        _c.apply(this, [!(_d.sent())]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test evaluates head script elements once"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.headScriptEvaluationCount];
                    case 1:
                        _b.apply(_a, [_j.sent(), undefined]);
                        this.clickSelector("#head-script-link");
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 2:
                        _j.sent();
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.headScriptEvaluationCount];
                    case 3:
                        _d.apply(_c, [_j.sent(), 1]);
                        this.goBack();
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 4:
                        _j.sent();
                        _f = (_e = this.assert).equal;
                        return [4 /*yield*/, this.headScriptEvaluationCount];
                    case 5:
                        _f.apply(_e, [_j.sent(), 1]);
                        this.clickSelector("#head-script-link");
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 6:
                        _j.sent();
                        _h = (_g = this.assert).equal;
                        return [4 /*yield*/, this.headScriptEvaluationCount];
                    case 7:
                        _h.apply(_g, [_j.sent(), 1]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test evaluates body script elements on each render"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.bodyScriptEvaluationCount];
                    case 1:
                        _b.apply(_a, [_j.sent(), undefined]);
                        this.clickSelector("#body-script-link");
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 2:
                        _j.sent();
                        _d = (_c = this.assert).equal;
                        return [4 /*yield*/, this.bodyScriptEvaluationCount];
                    case 3:
                        _d.apply(_c, [_j.sent(), 1]);
                        this.goBack();
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 4:
                        _j.sent();
                        _f = (_e = this.assert).equal;
                        return [4 /*yield*/, this.bodyScriptEvaluationCount];
                    case 5:
                        _f.apply(_e, [_j.sent(), 1]);
                        this.clickSelector("#body-script-link");
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 6:
                        _j.sent();
                        _h = (_g = this.assert).equal;
                        return [4 /*yield*/, this.bodyScriptEvaluationCount];
                    case 7:
                        _h.apply(_g, [_j.sent(), 2]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test does not evaluate data-turbo-eval=false scripts"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.clickSelector("#eval-false-script-link");
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 1:
                        _c.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, this.bodyScriptEvaluationCount];
                    case 2:
                        _b.apply(_a, [_c.sent(), undefined]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test preserves permanent elements"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var permanentElement, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0: return [4 /*yield*/, this.permanentElement];
                    case 1:
                        permanentElement = _l.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, permanentElement.getVisibleText()];
                    case 2:
                        _b.apply(_a, [_l.sent(), "Rendering"]);
                        this.clickSelector("#permanent-element-link");
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 3:
                        _l.sent();
                        _c = this.assert;
                        _e = (_d = permanentElement).equals;
                        return [4 /*yield*/, this.permanentElement];
                    case 4: return [4 /*yield*/, _e.apply(_d, [_l.sent()])];
                    case 5:
                        _c.apply(this, [_l.sent()]);
                        _g = (_f = this.assert).equal;
                        return [4 /*yield*/, permanentElement.getVisibleText()];
                    case 6:
                        _g.apply(_f, [_l.sent(), "Rendering"]);
                        this.goBack();
                        return [4 /*yield*/, this.nextEventNamed("turbo:render")];
                    case 7:
                        _l.sent();
                        _h = this.assert;
                        _k = (_j = permanentElement).equals;
                        return [4 /*yield*/, this.permanentElement];
                    case 8: return [4 /*yield*/, _k.apply(_j, [_l.sent()])];
                    case 9:
                        _h.apply(this, [_l.sent()]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test before-cache event"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var body, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.beforeCache(function (body) { return body.innerHTML = "Modified"; });
                        this.clickSelector("#same-origin-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, this.goBack()];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, this.nextBody];
                    case 3:
                        body = _b.sent();
                        _a = this.assert;
                        return [4 /*yield*/, body.getVisibleText()];
                    case 4:
                        _a.apply(this, [_b.sent(), "Modified"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test mutation record as before-cache notification"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var body, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.modifyBodyAfterRemoval();
                        this.clickSelector("#same-origin-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, this.goBack()];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, this.nextBody];
                    case 3:
                        body = _b.sent();
                        _a = this.assert;
                        return [4 /*yield*/, body.getVisibleText()];
                    case 4:
                        _a.apply(this, [_b.sent(), "Modified"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    RenderingTests.prototype["test error pages"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var body, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.clickSelector("#nonexistent-link");
                        return [4 /*yield*/, this.nextBody];
                    case 1:
                        body = _c.sent();
                        _b = (_a = this.assert).equal;
                        return [4 /*yield*/, body.getVisibleText()];
                    case 2:
                        _b.apply(_a, [_c.sent(), "404 Not Found: /nonexistent"]);
                        return [4 /*yield*/, this.goBack()];
                    case 3:
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(RenderingTests.prototype, "assetElements", {
        get: function () {
            return filter(this.headElements, isAssetElement);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RenderingTests.prototype, "provisionalElements", {
        get: function () {
            var _this = this;
            return filter(this.headElements, function (element) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, isAssetElement(element)];
                    case 1: return [2 /*return*/, !(_a.sent())];
                }
            }); }); });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RenderingTests.prototype, "headElements", {
        get: function () {
            return this.evaluate(function () { return Array.from(document.head.children); });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RenderingTests.prototype, "permanentElement", {
        get: function () {
            return this.querySelector("#permanent");
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RenderingTests.prototype, "headScriptEvaluationCount", {
        get: function () {
            return this.evaluate(function () { return window.headScriptEvaluationCount; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RenderingTests.prototype, "bodyScriptEvaluationCount", {
        get: function () {
            return this.evaluate(function () { return window.bodyScriptEvaluationCount; });
        },
        enumerable: false,
        configurable: true
    });
    RenderingTests.prototype.modifyBodyBeforeCaching = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.remote.execute(function () { return addEventListener("turbo:before-cache", function eventListener(event) {
                        removeEventListener("turbo:before-cache", eventListener, false);
                        document.body.innerHTML = "Modified";
                    }, false); })];
            });
        });
    };
    RenderingTests.prototype.beforeCache = function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.remote.execute(function (callback) {
                        addEventListener("turbo:before-cache", function eventListener(event) {
                            removeEventListener("turbo:before-cache", eventListener, false);
                            callback(document.body);
                        }, false);
                    }, [callback])];
            });
        });
    };
    RenderingTests.prototype.modifyBodyAfterRemoval = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.remote.execute(function () {
                        var documentElement = document.documentElement, body = document.body;
                        var observer = new MutationObserver(function (records) {
                            for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
                                var record = records_1[_i];
                                if (Array.from(record.removedNodes).indexOf(body) > -1) {
                                    body.innerHTML = "Modified";
                                    observer.disconnect();
                                    break;
                                }
                            }
                        });
                        observer.observe(documentElement, { childList: true });
                    })];
            });
        });
    };
    return RenderingTests;
}(TurboTestCase));
export { RenderingTests };
function filter(promisedValues, predicate) {
    return __awaiter(this, void 0, void 0, function () {
        var values, matches;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, promisedValues];
                case 1:
                    values = _a.sent();
                    return [4 /*yield*/, Promise.all(values.map(function (value) { return predicate(value); }))];
                case 2:
                    matches = _a.sent();
                    return [2 /*return*/, matches.reduce(function (result, match, index) { return result.concat(match ? values[index] : []); }, [])];
            }
        });
    });
}
function isAssetElement(element) {
    return __awaiter(this, void 0, void 0, function () {
        var tagName, relValue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, element.getTagName()];
                case 1:
                    tagName = _a.sent();
                    return [4 /*yield*/, element.getAttribute("rel")];
                case 2:
                    relValue = _a.sent();
                    return [2 /*return*/, tagName == "script" || tagName == "style" || (tagName == "link" && relValue == "stylesheet")];
            }
        });
    });
}
RenderingTests.registerSuite();
//# sourceMappingURL=rendering_tests.js.map