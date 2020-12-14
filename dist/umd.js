import { start } from "./index";
import "./script_warning";
export * from "./index";
if (!isAMD() && !isCommonJS()) {
    start();
}
function isAMD() {
    return typeof define == "function" && define.amd;
}
function isCommonJS() {
    return typeof exports == "object" && typeof module != "undefined";
}
//# sourceMappingURL=umd.js.map