import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
export declare class FormSubmissionTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test standard form submission with redirect response"(): Promise<void>;
    "test submitter form submission reads button attributes"(): Promise<void>;
    "test submitter GET submission from submitter with data-turbo-frame"(): Promise<void>;
    "test submitter POST submission from submitter with data-turbo-frame"(): Promise<void>;
    "test frame form GET submission from submitter with data-turbo-frame=_top"(): Promise<void>;
    "test frame form POST submission from submitter with data-turbo-frame=_top"(): Promise<void>;
    "test frame form GET submission from submitter referencing another frame"(): Promise<void>;
    "test frame form POST submission from submitter referencing another frame"(): Promise<void>;
    "test frame form submission with redirect response"(): Promise<void>;
    "test frame form submission with stream response"(): Promise<void>;
}
