import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
export declare class FrameNavigationTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test frame navigation with descendant link"(): Promise<void>;
    "test frame navigation with exterior link"(): Promise<void>;
    trackFrameEvents(): Promise<void>;
    readDispatchedFrameEvents(): Promise<any>;
}
