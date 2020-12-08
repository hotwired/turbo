export function array(values) {
    return Array.prototype.slice.call(values);
}
export var closest = (function () {
    var html = document.documentElement;
    var match = html.matches
        || html.webkitMatchesSelector
        || html.msMatchesSelector
        || html.mozMatchesSelector;
    var closest = html.closest || function (selector) {
        var element = this;
        while (element) {
            if (match.call(element, selector)) {
                return element;
            }
            else {
                element = element.parentElement;
            }
        }
    };
    return function (element, selector) {
        return closest.call(element, selector);
    };
})();
export function defer(callback) {
    setTimeout(callback, 1);
}
export function dispatch(eventName, _a) {
    var _b = _a === void 0 ? {} : _a, target = _b.target, cancelable = _b.cancelable, data = _b.data;
    var event = document.createEvent("Events");
    event.initEvent(eventName, true, cancelable == true);
    event.data = data || {};
    // Fix setting `defaultPrevented` when `preventDefault()` is called
    // http://stackoverflow.com/questions/23349191/event-preventdefault-is-not-working-in-ie-11-for-custom-events
    if (event.cancelable && !preventDefaultSupported) {
        var preventDefault_1 = event.preventDefault;
        event.preventDefault = function () {
            if (!this.defaultPrevented) {
                Object.defineProperty(this, "defaultPrevented", { get: function () { return true; } });
            }
            preventDefault_1.call(this);
        };
    }
    (target || document).dispatchEvent(event);
    return event;
}
var preventDefaultSupported = (function () {
    var event = document.createEvent("Events");
    event.initEvent("test", true, true);
    event.preventDefault();
    return event.defaultPrevented;
})();
export function unindent(strings) {
    var values = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        values[_i - 1] = arguments[_i];
    }
    var lines = trimLeft(interpolate(strings, values)).split("\n");
    var match = lines[0].match(/^\s+/);
    var indent = match ? match[0].length : 0;
    return lines.map(function (line) { return line.slice(indent); }).join("\n");
}
function trimLeft(string) {
    return string.replace(/^\n/, "");
}
function interpolate(strings, values) {
    return strings.reduce(function (result, string, i) {
        var value = values[i] == undefined ? "" : values[i];
        return result + string + value;
    }, "");
}
export function uuid() {
    return Array.apply(null, { length: 36 }).map(function (_, i) {
        if (i == 8 || i == 13 || i == 18 || i == 23) {
            return "-";
        }
        else if (i == 14) {
            return "4";
        }
        else if (i == 19) {
            return (Math.floor(Math.random() * 4) + 8).toString(16);
        }
        else {
            return Math.floor(Math.random() * 15).toString(16);
        }
    }).join("");
}
//# sourceMappingURL=util.js.map