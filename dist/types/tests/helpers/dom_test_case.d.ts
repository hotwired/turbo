import { InternTestCase } from "./intern_test_case";
export declare class DOMTestCase extends InternTestCase {
    fixtureElement: HTMLElement;
    setup(): Promise<void>;
    teardown(): Promise<void>;
    append(node: Node): void;
    find(selector: string): Element | null;
    get fixtureHTML(): string;
    set fixtureHTML(html: string);
}
