import { FunctionalTestCase } from "../helpers/functional_test_case";
export declare class StreamTests extends FunctionalTestCase {
    setup(): Promise<void>;
    "test receiving a stream message"(): Promise<void>;
    createMessage(content: string): Promise<void>;
    post(path: string, params?: any): Promise<void>;
}
