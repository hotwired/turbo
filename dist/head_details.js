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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
import { array } from "./util";
var HeadDetails = /** @class */ (function () {
    function HeadDetails(children) {
        this.detailsByOuterHTML = children.reduce(function (result, element) {
            var _a;
            var outerHTML = element.outerHTML;
            var details = outerHTML in result
                ? result[outerHTML]
                : {
                    type: elementType(element),
                    tracked: elementIsTracked(element),
                    elements: []
                };
            return __assign(__assign({}, result), (_a = {}, _a[outerHTML] = __assign(__assign({}, details), { elements: __spreadArrays(details.elements, [element]) }), _a));
        }, {});
    }
    HeadDetails.fromHeadElement = function (headElement) {
        var children = headElement ? array(headElement.children) : [];
        return new this(children);
    };
    HeadDetails.prototype.getTrackedElementSignature = function () {
        var _this = this;
        return Object.keys(this.detailsByOuterHTML)
            .filter(function (outerHTML) { return _this.detailsByOuterHTML[outerHTML].tracked; })
            .join("");
    };
    HeadDetails.prototype.getScriptElementsNotInDetails = function (headDetails) {
        return this.getElementsMatchingTypeNotInDetails("script", headDetails);
    };
    HeadDetails.prototype.getStylesheetElementsNotInDetails = function (headDetails) {
        return this.getElementsMatchingTypeNotInDetails("stylesheet", headDetails);
    };
    HeadDetails.prototype.getElementsMatchingTypeNotInDetails = function (matchedType, headDetails) {
        var _this = this;
        return Object.keys(this.detailsByOuterHTML)
            .filter(function (outerHTML) { return !(outerHTML in headDetails.detailsByOuterHTML); })
            .map(function (outerHTML) { return _this.detailsByOuterHTML[outerHTML]; })
            .filter(function (_a) {
            var type = _a.type;
            return type == matchedType;
        })
            .map(function (_a) {
            var element = _a.elements[0];
            return element;
        });
    };
    HeadDetails.prototype.getProvisionalElements = function () {
        var _this = this;
        return Object.keys(this.detailsByOuterHTML).reduce(function (result, outerHTML) {
            var _a = _this.detailsByOuterHTML[outerHTML], type = _a.type, tracked = _a.tracked, elements = _a.elements;
            if (type == null && !tracked) {
                return __spreadArrays(result, elements);
            }
            else if (elements.length > 1) {
                return __spreadArrays(result, elements.slice(1));
            }
            else {
                return result;
            }
        }, []);
    };
    HeadDetails.prototype.getMetaValue = function (name) {
        var element = this.findMetaElementByName(name);
        return element
            ? element.getAttribute("content")
            : null;
    };
    HeadDetails.prototype.findMetaElementByName = function (name) {
        var _this = this;
        return Object.keys(this.detailsByOuterHTML).reduce(function (result, outerHTML) {
            var element = _this.detailsByOuterHTML[outerHTML].elements[0];
            return elementIsMetaElementWithName(element, name) ? element : result;
        }, undefined);
    };
    return HeadDetails;
}());
export { HeadDetails };
function elementType(element) {
    if (elementIsScript(element)) {
        return "script";
    }
    else if (elementIsStylesheet(element)) {
        return "stylesheet";
    }
}
function elementIsTracked(element) {
    return element.getAttribute("data-turbo-track") == "reload";
}
function elementIsScript(element) {
    var tagName = element.tagName.toLowerCase();
    return tagName == "script";
}
function elementIsStylesheet(element) {
    var tagName = element.tagName.toLowerCase();
    return tagName == "style" || (tagName == "link" && element.getAttribute("rel") == "stylesheet");
}
function elementIsMetaElementWithName(element, name) {
    var tagName = element.tagName.toLowerCase();
    return tagName == "meta" && element.getAttribute("name") == name;
}
//# sourceMappingURL=head_details.js.map