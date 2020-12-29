import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
export declare class VisitTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test programmatically visiting a same-origin location"(): Promise<void>;
    "skip programmatically visiting a cross-origin location falls back to window.location"(): Promise<void>;
    "test visiting a location served with a non-HTML content type"(): Promise<void>;
    "test canceling a before-visit event prevents navigation"(): Promise<void>;
    "test navigation by history is not cancelable"(): Promise<void>;
    visitLocation(location: string): Promise<void>;
    cancelNextVisit(): Promise<void>;
}
