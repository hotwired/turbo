import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
export declare class FormSubmissionTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test standard form submission with redirect response"(): Promise<void>;
    "test frame form submission with redirect response"(): Promise<void>;
    "test frame form submission with stream response"(): Promise<void>;
}
