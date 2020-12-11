import { TurboTestCase } from "./helpers/turbo_test_case";
export declare class AsyncScriptTests extends TurboTestCase {
    setup(): Promise<void>;
    "test does not emit turbo:load when loaded asynchronously after DOMContentLoaded"(): Promise<void>;
    "test following a link when loaded asynchronously after DOMContentLoaded"(): Promise<void>;
}
//# sourceMappingURL=async_script_tests.d.ts.map