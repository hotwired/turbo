'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var intern = require('intern');
var http = require('http');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var intern__default = /*#__PURE__*/_interopDefaultLegacy(intern);

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
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
}

var InternTestCase = (function () {
    function InternTestCase(testName, remote) {
        this.testName = testName;
        this.remote = remote;
    }
    InternTestCase.registerSuite = function () {
        return intern__default['default'].getInterface("object").registerSuite(this.name, { tests: this.tests });
    };
    Object.defineProperty(InternTestCase, "tests", {
        get: function () {
            var _this = this;
            return this.testNames.reduce(function (tests, testName) {
                var _a;
                return __assign(__assign({}, tests), (_a = {}, _a[testName] = function (_a) {
                    var remote = _a.remote;
                    return _this.runTest(testName, remote);
                }, _a));
            }, {});
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(InternTestCase, "testNames", {
        get: function () {
            return this.testKeys.map(function (key) { return key.slice(5); });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(InternTestCase, "testKeys", {
        get: function () {
            return Object.getOwnPropertyNames(this.prototype).filter(function (key) { return key.match(/^test /); });
        },
        enumerable: false,
        configurable: true
    });
    InternTestCase.runTest = function (testName, remote) {
        var testCase = new this(testName, remote);
        return testCase.runTest();
    };
    InternTestCase.prototype.runTest = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, , 5, 7]);
                        return [4, this.setup()];
                    case 1:
                        _a.sent();
                        return [4, this.beforeTest()];
                    case 2:
                        _a.sent();
                        return [4, this.test()];
                    case 3:
                        _a.sent();
                        return [4, this.afterTest()];
                    case 4:
                        _a.sent();
                        return [3, 7];
                    case 5: return [4, this.teardown()];
                    case 6:
                        _a.sent();
                        return [7];
                    case 7: return [2];
                }
            });
        });
    };
    Object.defineProperty(InternTestCase.prototype, "assert", {
        get: function () {
            return intern__default['default'].getPlugin("chai").assert;
        },
        enumerable: false,
        configurable: true
    });
    InternTestCase.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2];
            });
        });
    };
    InternTestCase.prototype.beforeTest = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2];
            });
        });
    };
    Object.defineProperty(InternTestCase.prototype, "test", {
        get: function () {
            var method = this["test " + this.testName];
            if (method != null && typeof method == "function") {
                return method;
            }
            else {
                throw new Error("No such test \"" + this.testName + "\"");
            }
        },
        enumerable: false,
        configurable: true
    });
    InternTestCase.prototype.afterTest = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2];
            });
        });
    };
    InternTestCase.prototype.teardown = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2];
            });
        });
    };
    return InternTestCase;
}());

var BrowserTestCase = (function (_super) {
    __extends(BrowserTestCase, _super);
    function BrowserTestCase() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BrowserTestCase.prototype.goToLocation = function (location) {
        return __awaiter(this, void 0, void 0, function () {
            var processedLocation;
            return __generator(this, function (_a) {
                processedLocation = location.match(/^\//) ? location.slice(1) : location;
                return [2, this.remote.get(processedLocation)];
            });
        });
    };
    BrowserTestCase.prototype.goBack = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, this.remote.goBack()];
            });
        });
    };
    BrowserTestCase.prototype.goForward = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, this.remote.goForward()];
            });
        });
    };
    BrowserTestCase.prototype.hasSelector = function (selector) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.remote.findAllByCssSelector(selector)];
                    case 1: return [2, (_a.sent()).length > 0];
                }
            });
        });
    };
    BrowserTestCase.prototype.querySelector = function (selector) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, this.remote.findByCssSelector(selector)];
            });
        });
    };
    BrowserTestCase.prototype.clickSelector = function (selector) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, this.remote.findByCssSelector(selector).click()];
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
                    case 0: return [4, this.scrollPosition];
                    case 1:
                        pageY = (_a.sent()).y;
                        return [4, this.remote.findByCssSelector(selector).getPosition()];
                    case 2:
                        elementY = (_a.sent()).y;
                        offset = pageY - elementY;
                        return [2, offset > -1 && offset < 1];
                }
            });
        });
    };
    BrowserTestCase.prototype.evaluate = function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.remote.execute(callback)];
                    case 1: return [2, _a.sent()];
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

var RemoteChannel = (function () {
    function RemoteChannel(remote, identifier) {
        this.index = 0;
        this.remote = remote;
        this.identifier = identifier;
    }
    RemoteChannel.prototype.read = function (length) {
        return __awaiter(this, void 0, void 0, function () {
            var records;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.newRecords];
                    case 1:
                        records = (_a.sent()).slice(0, length);
                        this.index += records.length;
                        return [2, records];
                }
            });
        });
    };
    RemoteChannel.prototype.drain = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.read()];
                    case 1:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    Object.defineProperty(RemoteChannel.prototype, "newRecords", {
        get: function () {
            return this.remote.execute(function (identifier, index) {
                var records = window[identifier];
                if (records != null && typeof records.slice == "function") {
                    return records.slice(index);
                }
                else {
                    return [];
                }
            }, [this.identifier, this.index]);
        },
        enumerable: false,
        configurable: true
    });
    return RemoteChannel;
}());

var TurboTestCase = (function (_super) {
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
                    case 0: return [4, this.drainEventLog()];
                    case 1:
                        _b.sent();
                        _a = this;
                        return [4, this.body];
                    case 2:
                        _a.lastBody = _b.sent();
                        return [2];
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
                        case 0: return [4, this.remote.getCurrentWindowHandle()];
                        case 1:
                            handle = _a.sent();
                            return [4, this.remote.getAllWindowHandles()];
                        case 2:
                            handles = _a.sent();
                            nextHandle = handles[handles.indexOf(handle) + 1];
                            _a.label = 3;
                        case 3:
                            if (!nextHandle) return [3, 0];
                            _a.label = 4;
                        case 4: return [2, nextHandle];
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
                        if (!!record) return [3, 2];
                        return [4, this.eventLogChannel.read(1)];
                    case 1:
                        records = _a.sent();
                        record = records.find(function (_a) {
                            var name = _a[0];
                            return name == eventName;
                        });
                        return [3, 0];
                    case 2: return [2, record[1]];
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
                        case 0: return [4, this.changedBody];
                        case 1:
                            body = _a.sent();
                            _a.label = 2;
                        case 2:
                            if (!body) return [3, 0];
                            _a.label = 3;
                        case 3: return [2, this.lastBody = body];
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
                        case 0: return [4, this.body];
                        case 1:
                            body = _a.sent();
                            if (!this.lastBody || this.lastBody.elementId != body.elementId) {
                                return [2, body];
                            }
                            return [2];
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

var AsyncScriptTests = (function (_super) {
    __extends(AsyncScriptTests, _super);
    function AsyncScriptTests() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AsyncScriptTests.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.goToLocation("/fixtures/async_script.html")];
                    case 1:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    AsyncScriptTests.prototype["test does not emit turbo:load when loaded asynchronously after DOMContentLoaded"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.eventLogChannel.read()];
                    case 1:
                        events = _a.sent();
                        this.assert.deepEqual(events, []);
                        return [2];
                }
            });
        });
    };
    AsyncScriptTests.prototype["test following a link when loaded asynchronously after DOMContentLoaded"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.clickSelector("#async-link");
                        return [4, this.nextBody];
                    case 1:
                        _c.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.visitAction];
                    case 2:
                        _b.apply(_a, [_c.sent(), "advance"]);
                        return [2];
                }
            });
        });
    };
    return AsyncScriptTests;
}(TurboTestCase));
AsyncScriptTests.registerSuite();

var NavigationTests = (function (_super) {
    __extends(NavigationTests, _super);
    function NavigationTests() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NavigationTests.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.goToLocation("/fixtures/navigation.html")];
                    case 1:
                        _a.sent();
                        return [2];
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
                        return [4, this.pathname];
                    case 1:
                        _b.apply(_a, [_e.sent(), "/fixtures/navigation.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 2:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "advance"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "replace"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "advance"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _h.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_h.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.hash];
                    case 3:
                        _d.apply(_c, [_h.sent(), "#element-id"]);
                        _f = (_e = this.assert).equal;
                        return [4, this.visitAction];
                    case 4:
                        _f.apply(_e, [_h.sent(), "advance"]);
                        _g = this.assert;
                        return [4, this.isScrolledToSelector("#element-id")];
                    case 5:
                        _g.apply(this, [_h.sent()]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _h.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_h.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.hash];
                    case 3:
                        _d.apply(_c, [_h.sent(), "#named-anchor"]);
                        _f = (_e = this.assert).equal;
                        return [4, this.visitAction];
                    case 4:
                        _f.apply(_e, [_h.sent(), "advance"]);
                        _g = this.assert;
                        return [4, this.isScrolledToSelector("[name=named-anchor]")];
                    case 5:
                        _g.apply(this, [_h.sent()]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.location];
                    case 2:
                        _b.apply(_a, [_e.sent(), "about:blank"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2];
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
                        return [4, this.nextWindowHandle];
                    case 1:
                        _b.apply(_a, [_g.sent()]);
                        _d = (_c = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _d.apply(_c, [_g.sent(), "/fixtures/one.html"]);
                        _f = (_e = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _f.apply(_e, [_g.sent(), "load"]);
                        return [2];
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
                        return [4, this.nextBeat];
                    case 1:
                        _f.sent();
                        _a = this.assert;
                        return [4, this.changedBody];
                    case 2:
                        _a.apply(this, [!(_f.sent())]);
                        _c = (_b = this.assert).equal;
                        return [4, this.pathname];
                    case 3:
                        _c.apply(_b, [_f.sent(), "/fixtures/navigation.html"]);
                        _e = (_d = this.assert).equal;
                        return [4, this.visitAction];
                    case 4:
                        _e.apply(_d, [_f.sent(), "load"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "advance"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.location];
                    case 2:
                        _b.apply(_a, [_e.sent(), "about:blank"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        return [4, this.goBack()];
                    case 2:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 3:
                        _b.apply(_a, [_e.sent(), "/fixtures/navigation.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 4:
                        _d.apply(_c, [_e.sent(), "restore"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        return [4, this.goBack()];
                    case 2:
                        _e.sent();
                        return [4, this.goForward()];
                    case 3:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 4:
                        _b.apply(_a, [_e.sent(), "/fixtures/one.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 5:
                        _d.apply(_c, [_e.sent(), "restore"]);
                        return [2];
                }
            });
        });
    };
    return NavigationTests;
}(TurboTestCase));
NavigationTests.registerSuite();

var RenderingTests = (function (_super) {
    __extends(RenderingTests, _super);
    function RenderingTests() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RenderingTests.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.goToLocation("/fixtures/rendering.html")];
                    case 1:
                        _a.sent();
                        return [2];
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
                        return [4, this.nextEventNamed("turbo:before-render")];
                    case 1:
                        newBody = (_f.sent()).newBody;
                        return [4, this.querySelector("h1")];
                    case 2:
                        h1 = _f.sent();
                        _b = (_a = this.assert).equal;
                        return [4, h1.getVisibleText()];
                    case 3:
                        _b.apply(_a, [_f.sent(), "One"]);
                        return [4, this.nextEventNamed("turbo:render")];
                    case 4:
                        _f.sent();
                        _c = this.assert;
                        _e = (_d = newBody).equals;
                        return [4, this.body];
                    case 5: return [4, _e.apply(_d, [_f.sent()])];
                    case 6:
                        _c.apply(this, [_f.sent()]);
                        return [2];
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
                        return [4, this.nextEventNamed("turbo:before-render")];
                    case 1:
                        newBody = (_f.sent()).newBody;
                        _b = (_a = this.assert).equal;
                        return [4, newBody.getVisibleText()];
                    case 2:
                        _b.apply(_a, [_f.sent(), "404 Not Found: /nonexistent"]);
                        return [4, this.nextEventNamed("turbo:render")];
                    case 3:
                        _f.sent();
                        _c = this.assert;
                        _e = (_d = newBody).equals;
                        return [4, this.body];
                    case 4: return [4, _e.apply(_d, [_f.sent()])];
                    case 5:
                        _c.apply(this, [_f.sent()]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/tracked_asset_change.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _e.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.pathname];
                    case 2:
                        _b.apply(_a, [_e.sent(), "/fixtures/visit_control_reload.html"]);
                        _d = (_c = this.assert).equal;
                        return [4, this.visitAction];
                    case 3:
                        _d.apply(_c, [_e.sent(), "load"]);
                        return [2];
                }
            });
        });
    };
    RenderingTests.prototype["test accumulates asset elements in head"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var originalElements, newElements, finalElements;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.assetElements];
                    case 1:
                        originalElements = _a.sent();
                        this.clickSelector("#additional-assets-link");
                        return [4, this.nextBody];
                    case 2:
                        _a.sent();
                        return [4, this.assetElements];
                    case 3:
                        newElements = _a.sent();
                        this.assert.notDeepEqual(newElements, originalElements);
                        this.goBack();
                        return [4, this.nextBody];
                    case 4:
                        _a.sent();
                        return [4, this.assetElements];
                    case 5:
                        finalElements = _a.sent();
                        this.assert.deepEqual(finalElements, newElements);
                        return [2];
                }
            });
        });
    };
    RenderingTests.prototype["test replaces provisional elements in head"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var originalElements, _a, newElements, _b, finalElements, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4, this.provisionalElements];
                    case 1:
                        originalElements = _d.sent();
                        _a = this.assert;
                        return [4, this.hasSelector("meta[name=test]")];
                    case 2:
                        _a.apply(this, [!(_d.sent())]);
                        this.clickSelector("#same-origin-link");
                        return [4, this.nextBody];
                    case 3:
                        _d.sent();
                        return [4, this.provisionalElements];
                    case 4:
                        newElements = _d.sent();
                        this.assert.notDeepEqual(newElements, originalElements);
                        _b = this.assert;
                        return [4, this.hasSelector("meta[name=test]")];
                    case 5:
                        _b.apply(this, [_d.sent()]);
                        this.goBack();
                        return [4, this.nextBody];
                    case 6:
                        _d.sent();
                        return [4, this.provisionalElements];
                    case 7:
                        finalElements = _d.sent();
                        this.assert.notDeepEqual(finalElements, newElements);
                        _c = this.assert;
                        return [4, this.hasSelector("meta[name=test]")];
                    case 8:
                        _c.apply(this, [!(_d.sent())]);
                        return [2];
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
                        return [4, this.headScriptEvaluationCount];
                    case 1:
                        _b.apply(_a, [_j.sent(), undefined]);
                        this.clickSelector("#head-script-link");
                        return [4, this.nextEventNamed("turbo:render")];
                    case 2:
                        _j.sent();
                        _d = (_c = this.assert).equal;
                        return [4, this.headScriptEvaluationCount];
                    case 3:
                        _d.apply(_c, [_j.sent(), 1]);
                        this.goBack();
                        return [4, this.nextEventNamed("turbo:render")];
                    case 4:
                        _j.sent();
                        _f = (_e = this.assert).equal;
                        return [4, this.headScriptEvaluationCount];
                    case 5:
                        _f.apply(_e, [_j.sent(), 1]);
                        this.clickSelector("#head-script-link");
                        return [4, this.nextEventNamed("turbo:render")];
                    case 6:
                        _j.sent();
                        _h = (_g = this.assert).equal;
                        return [4, this.headScriptEvaluationCount];
                    case 7:
                        _h.apply(_g, [_j.sent(), 1]);
                        return [2];
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
                        return [4, this.bodyScriptEvaluationCount];
                    case 1:
                        _b.apply(_a, [_j.sent(), undefined]);
                        this.clickSelector("#body-script-link");
                        return [4, this.nextEventNamed("turbo:render")];
                    case 2:
                        _j.sent();
                        _d = (_c = this.assert).equal;
                        return [4, this.bodyScriptEvaluationCount];
                    case 3:
                        _d.apply(_c, [_j.sent(), 1]);
                        this.goBack();
                        return [4, this.nextEventNamed("turbo:render")];
                    case 4:
                        _j.sent();
                        _f = (_e = this.assert).equal;
                        return [4, this.bodyScriptEvaluationCount];
                    case 5:
                        _f.apply(_e, [_j.sent(), 1]);
                        this.clickSelector("#body-script-link");
                        return [4, this.nextEventNamed("turbo:render")];
                    case 6:
                        _j.sent();
                        _h = (_g = this.assert).equal;
                        return [4, this.bodyScriptEvaluationCount];
                    case 7:
                        _h.apply(_g, [_j.sent(), 2]);
                        return [2];
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
                        return [4, this.nextEventNamed("turbo:render")];
                    case 1:
                        _c.sent();
                        _b = (_a = this.assert).equal;
                        return [4, this.bodyScriptEvaluationCount];
                    case 2:
                        _b.apply(_a, [_c.sent(), undefined]);
                        return [2];
                }
            });
        });
    };
    RenderingTests.prototype["test preserves permanent elements"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var permanentElement, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0: return [4, this.permanentElement];
                    case 1:
                        permanentElement = _l.sent();
                        _b = (_a = this.assert).equal;
                        return [4, permanentElement.getVisibleText()];
                    case 2:
                        _b.apply(_a, [_l.sent(), "Rendering"]);
                        this.clickSelector("#permanent-element-link");
                        return [4, this.nextEventNamed("turbo:render")];
                    case 3:
                        _l.sent();
                        _c = this.assert;
                        _e = (_d = permanentElement).equals;
                        return [4, this.permanentElement];
                    case 4: return [4, _e.apply(_d, [_l.sent()])];
                    case 5:
                        _c.apply(this, [_l.sent()]);
                        _g = (_f = this.assert).equal;
                        return [4, permanentElement.getVisibleText()];
                    case 6:
                        _g.apply(_f, [_l.sent(), "Rendering"]);
                        this.goBack();
                        return [4, this.nextEventNamed("turbo:render")];
                    case 7:
                        _l.sent();
                        _h = this.assert;
                        _k = (_j = permanentElement).equals;
                        return [4, this.permanentElement];
                    case 8: return [4, _k.apply(_j, [_l.sent()])];
                    case 9:
                        _h.apply(this, [_l.sent()]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _b.sent();
                        return [4, this.goBack()];
                    case 2:
                        _b.sent();
                        return [4, this.nextBody];
                    case 3:
                        body = _b.sent();
                        _a = this.assert;
                        return [4, body.getVisibleText()];
                    case 4:
                        _a.apply(this, [_b.sent(), "Modified"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        _b.sent();
                        return [4, this.goBack()];
                    case 2:
                        _b.sent();
                        return [4, this.nextBody];
                    case 3:
                        body = _b.sent();
                        _a = this.assert;
                        return [4, body.getVisibleText()];
                    case 4:
                        _a.apply(this, [_b.sent(), "Modified"]);
                        return [2];
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
                        return [4, this.nextBody];
                    case 1:
                        body = _c.sent();
                        _b = (_a = this.assert).equal;
                        return [4, body.getVisibleText()];
                    case 2:
                        _b.apply(_a, [_c.sent(), "404 Not Found: /nonexistent"]);
                        return [4, this.goBack()];
                    case 3:
                        _c.sent();
                        return [2];
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
                    case 0: return [4, isAssetElement(element)];
                    case 1: return [2, !(_a.sent())];
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
                return [2, this.remote.execute(function () { return addEventListener("turbo:before-cache", function eventListener(event) {
                        removeEventListener("turbo:before-cache", eventListener, false);
                        document.body.innerHTML = "Modified";
                    }, false); })];
            });
        });
    };
    RenderingTests.prototype.beforeCache = function (callback) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, this.remote.execute(function (callback) {
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
                return [2, this.remote.execute(function () {
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
function filter(promisedValues, predicate) {
    return __awaiter(this, void 0, void 0, function () {
        var values, matches;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, promisedValues];
                case 1:
                    values = _a.sent();
                    return [4, Promise.all(values.map(function (value) { return predicate(value); }))];
                case 2:
                    matches = _a.sent();
                    return [2, matches.reduce(function (result, match, index) { return result.concat(match ? values[index] : []); }, [])];
            }
        });
    });
}
function isAssetElement(element) {
    return __awaiter(this, void 0, void 0, function () {
        var tagName, relValue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, element.getTagName()];
                case 1:
                    tagName = _a.sent();
                    return [4, element.getAttribute("rel")];
                case 2:
                    relValue = _a.sent();
                    return [2, tagName == "script" || tagName == "style" || (tagName == "link" && relValue == "stylesheet")];
            }
        });
    });
}
RenderingTests.registerSuite();

var VisitTests = (function (_super) {
    __extends(VisitTests, _super);
    function VisitTests() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VisitTests.prototype.setup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.goToLocation("/fixtures/visit.html");
                return [2];
            });
        });
    };
    VisitTests.prototype["test programmatically visiting a same-origin location"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var urlBeforeVisit, urlAfterVisit, _a, _b, urlFromBeforeVisitEvent, urlFromVisitEvent, timing;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4, this.location];
                    case 1:
                        urlBeforeVisit = _c.sent();
                        return [4, this.visitLocation("/fixtures/one.html")];
                    case 2:
                        _c.sent();
                        return [4, this.location];
                    case 3:
                        urlAfterVisit = _c.sent();
                        this.assert.notEqual(urlBeforeVisit, urlAfterVisit);
                        _b = (_a = this.assert).equal;
                        return [4, this.visitAction];
                    case 4:
                        _b.apply(_a, [_c.sent(), "advance"]);
                        return [4, this.nextEventNamed("turbo:before-visit")];
                    case 5:
                        urlFromBeforeVisitEvent = (_c.sent()).url;
                        this.assert.equal(urlFromBeforeVisitEvent, urlAfterVisit);
                        return [4, this.nextEventNamed("turbo:visit")];
                    case 6:
                        urlFromVisitEvent = (_c.sent()).url;
                        this.assert.equal(urlFromVisitEvent, urlAfterVisit);
                        return [4, this.nextEventNamed("turbo:load")];
                    case 7:
                        timing = (_c.sent()).timing;
                        this.assert.ok(timing);
                        return [2];
                }
            });
        });
    };
    VisitTests.prototype["skip programmatically visiting a cross-origin location falls back to window.location"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var urlBeforeVisit, urlAfterVisit, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4, this.location];
                    case 1:
                        urlBeforeVisit = _c.sent();
                        return [4, this.visitLocation("about:blank")];
                    case 2:
                        _c.sent();
                        return [4, this.location];
                    case 3:
                        urlAfterVisit = _c.sent();
                        this.assert.notEqual(urlBeforeVisit, urlAfterVisit);
                        _b = (_a = this.assert).equal;
                        return [4, this.visitAction];
                    case 4:
                        _b.apply(_a, [_c.sent(), "load"]);
                        return [2];
                }
            });
        });
    };
    VisitTests.prototype["test visiting a location served with a non-HTML content type"] = function () {
        return __awaiter(this, void 0, void 0, function () {
            var urlBeforeVisit, url, contentType, urlAfterVisit, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4, this.location];
                    case 1:
                        urlBeforeVisit = _c.sent();
                        return [4, this.visitLocation("/fixtures/svg")];
                    case 2:
                        _c.sent();
                        return [4, this.remote.getCurrentUrl()];
                    case 3:
                        url = _c.sent();
                        return [4, contentTypeOfURL(url)];
                    case 4:
                        contentType = _c.sent();
                        this.assert.equal(contentType, "image/svg+xml");
                        return [4, this.location];
                    case 5:
                        urlAfterVisit = _c.sent();
                        this.assert.notEqual(urlBeforeVisit, urlAfterVisit);
                        _b = (_a = this.assert).equal;
                        return [4, this.visitAction];
                    case 6:
                        _b.apply(_a, [_c.sent(), "load"]);
                        return [2];
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
                        return [4, this.location];
                    case 1:
                        urlBeforeVisit = _b.sent();
                        this.clickSelector("#same-origin-link");
                        return [4, this.nextBeat];
                    case 2:
                        _b.sent();
                        _a = this.assert;
                        return [4, this.changedBody];
                    case 3:
                        _a.apply(this, [!(_b.sent())]);
                        return [4, this.location];
                    case 4:
                        urlAfterVisit = _b.sent();
                        this.assert.equal(urlAfterVisit, urlBeforeVisit);
                        return [2];
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
                        return [4, this.drainEventLog()];
                    case 1:
                        _b.sent();
                        return [4, this.nextBeat];
                    case 2:
                        _b.sent();
                        return [4, this.goBack()];
                    case 3:
                        _b.sent();
                        _a = this.assert;
                        return [4, this.changedBody];
                    case 4:
                        _a.apply(this, [_b.sent()]);
                        return [2];
                }
            });
        });
    };
    VisitTests.prototype.visitLocation = function (location) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.remote.execute(function (location) { return window.Turbo.visit(location); }, [location]);
                return [2];
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
                return [2];
            });
        });
    };
    return VisitTests;
}(TurboTestCase));
function contentTypeOfURL(url) {
    return new Promise(function (resolve) {
        http.get(url, function (_a) {
            var headers = _a.headers;
            return resolve(headers["content-type"]);
        });
    });
}
VisitTests.registerSuite();

exports.AsyncScriptTests = AsyncScriptTests;
exports.NavigationTests = NavigationTests;
exports.RenderingTests = RenderingTests;
exports.VisitTests = VisitTests;
//# sourceMappingURL=tests.js.map
