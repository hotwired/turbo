import { InternTestCase } from "./intern_test_case";
import { Element } from "@theintern/leadfoot";
export declare class BrowserTestCase extends InternTestCase {
    goToLocation(location: string): Promise<void>;
    goBack(): Promise<void>;
    goForward(): Promise<void>;
    hasSelector(selector: string): Promise<boolean>;
    querySelector(selector: string): Promise<Element>;
    clickSelector(selector: string): Promise<void>;
    get scrollPosition(): Promise<{
        x: number;
        y: number;
    }>;
    isScrolledToSelector(selector: string): Promise<boolean>;
    evaluate<T>(callback: () => T): Promise<T>;
    get head(): Promise<Element>;
    get body(): Promise<Element>;
    get location(): Promise<string>;
    get pathname(): Promise<string>;
    get hash(): Promise<string>;
}
//# sourceMappingURL=browser_test_case.d.ts.map