import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
export declare class LoadingTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test eager loading within a details element"(): Promise<void>;
    "test lazy loading within a details element"(): Promise<void>;
    "test changing loading attribute from lazy to eager loads frame"(): Promise<void>;
    "test changing src attribute on a frame with loading=lazy defers navigation"(): Promise<void>;
    "test changing src attribute on a frame with loading=eager navigates"(): Promise<void>;
}
