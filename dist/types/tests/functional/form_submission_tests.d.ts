import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
export declare class FormSubmissionTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test standard form submission with redirect response"(): Promise<void>;
    "test invalid form submission with unprocessable entity status"(): Promise<void>;
    "test invalid form submission with server error status"(): Promise<void>;
    "test submitter form submission reads button attributes"(): Promise<void>;
    "test frame form submission with redirect response"(): Promise<void>;
    "test invalid frame form submission with unprocessable entity status"(): Promise<void>;
    "test invalid frame form submission with internal server errror status"(): Promise<void>;
    "test frame form submission with stream response"(): Promise<void>;
    "test form submission with Turbo disabled on the form"(): Promise<void>;
    "test form submission with Turbo disabled on the submitter"(): Promise<void>;
    "test form submission skipped within method=dialog"(): Promise<void>;
    "test form submission skipped with submitter formmethod=dialog"(): Promise<void>;
    "test form submission skipped with form[target]"(): Promise<void>;
    "test form submission skipped with submitter button[formtarget]"(): Promise<void>;
    listenForFormSubmissions(): void;
    get turboFormSubmitted(): Promise<boolean>;
}
