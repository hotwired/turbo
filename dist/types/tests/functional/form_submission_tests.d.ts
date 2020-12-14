import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
export declare class FormSubmissionTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test standard form submission with redirect response"(): Promise<void>;
    "test submitter form submission reads button attributes"(): Promise<void>;
    "test frame form submission from submitter with data-turbo-frame"(): Promise<void>;
    "test frame form submission with redirect response"(): Promise<void>;
    "test frame form submission with stream response"(): Promise<void>;
}
