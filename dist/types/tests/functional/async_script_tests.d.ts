import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
export declare class AsyncScriptTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test does not emit turbo:load when loaded asynchronously after DOMContentLoaded"(): Promise<void>;
    "test following a link when loaded asynchronously after DOMContentLoaded"(): Promise<void>;
}
