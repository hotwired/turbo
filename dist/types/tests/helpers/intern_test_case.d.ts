/// <reference types="chai" />
import Test from "intern/lib/Test";
import { Tests } from "intern/lib/interfaces/object";
export declare class InternTestCase {
    readonly internTest: Test;
    static registerSuite(): void;
    static get tests(): Tests;
    static get testNames(): string[];
    static get testKeys(): string[];
    static runTest(internTest: Test): Promise<void>;
    constructor(internTest: Test);
    get testName(): string;
    runTest(): Promise<void>;
    get assert(): Chai.AssertStatic;
    setup(): Promise<void>;
    beforeTest(): Promise<void>;
    get test(): () => Promise<void>;
    afterTest(): Promise<void>;
    teardown(): Promise<void>;
}
