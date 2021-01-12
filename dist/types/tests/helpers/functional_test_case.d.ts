import { InternTestCase } from "./intern_test_case";
import { Element } from "@theintern/leadfoot";
export declare class FunctionalTestCase extends InternTestCase {
    get remote(): import("intern/lib/executors/Node").Remote;
    goToLocation(location: string): Promise<void>;
    goBack(): Promise<void>;
    goForward(): Promise<void>;
    reload(): Promise<void>;
    hasSelector(selector: string): Promise<boolean>;
    querySelector(selector: string): Promise<Element>;
    clickSelector(selector: string): Promise<void>;
    scrollToSelector(selector: string): Promise<void>;
    outerHTMLForSelector(selector: string): Promise<string>;
    innerHTMLForSelector(selector: string): Promise<string>;
    get scrollPosition(): Promise<{
        x: number;
        y: number;
    }>;
    isScrolledToSelector(selector: string): Promise<boolean>;
    get nextBeat(): Promise<void>;
    evaluate<T>(callback: (...args: any[]) => T, ...args: any[]): Promise<T>;
    get head(): Promise<Element>;
    get body(): Promise<Element>;
    get location(): Promise<string>;
    get origin(): Promise<string>;
    get pathname(): Promise<string>;
    get hash(): Promise<string>;
}
