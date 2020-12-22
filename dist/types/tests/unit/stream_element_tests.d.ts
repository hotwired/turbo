import { DOMTestCase } from "../helpers/dom_test_case";
export declare class StreamElementTests extends DOMTestCase {
    beforeTest(): Promise<void>;
    "test action=append"(): Promise<void>;
    "test action=prepend"(): Promise<void>;
    "test action=remove"(): Promise<void>;
    "test action=replace"(): Promise<void>;
    "test action=update"(): Promise<void>;
}
