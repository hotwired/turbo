import { Remote } from "intern/lib/executors/Node";
import { Tests } from "intern/lib/interfaces/object";
export declare class InternTestCase {
    readonly testName: string;
    readonly remote: Remote;
    static registerSuite(): void;
    static get tests(): Tests;
    static get testNames(): string[];
    static get testKeys(): string[];
    static runTest(testName: string, remote: Remote): Promise<void>;
    constructor(testName: string, remote: Remote);
    runTest(): Promise<void>;
    get assert(): Chai.AssertStatic;
    setup(): Promise<void>;
    beforeTest(): Promise<void>;
    get test(): () => Promise<void>;
    afterTest(): Promise<void>;
    teardown(): Promise<void>;
}
//# sourceMappingURL=intern_test_case.d.ts.map