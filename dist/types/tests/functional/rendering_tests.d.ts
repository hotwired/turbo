import { TurboDriveTestCase } from "../helpers/turbo_drive_test_case";
import { Element } from "@theintern/leadfoot";
export declare class RenderingTests extends TurboDriveTestCase {
    setup(): Promise<void>;
    "test triggers before-render and render events"(): Promise<void>;
    "test triggers before-render and render events for error pages"(): Promise<void>;
    "test reloads when tracked elements change"(): Promise<void>;
    "test reloads when turbo-visit-control setting is reload"(): Promise<void>;
    "test accumulates asset elements in head"(): Promise<void>;
    "test replaces provisional elements in head"(): Promise<void>;
    "skip evaluates head script elements once"(): Promise<void>;
    "test evaluates body script elements on each render"(): Promise<void>;
    "test does not evaluate data-turbo-eval=false scripts"(): Promise<void>;
    "test preserves permanent elements"(): Promise<void>;
    "test before-cache event"(): Promise<void>;
    "test mutation record as before-cache notification"(): Promise<void>;
    "test error pages"(): Promise<void>;
    get assetElements(): Promise<Element[]>;
    get provisionalElements(): Promise<Element[]>;
    get headElements(): Promise<Element[]>;
    get permanentElement(): Promise<Element>;
    get headScriptEvaluationCount(): Promise<number | undefined>;
    get bodyScriptEvaluationCount(): Promise<number | undefined>;
    modifyBodyBeforeCaching(): Promise<any>;
    beforeCache(callback: (body: HTMLElement) => void): Promise<any>;
    modifyBodyAfterRemoval(): Promise<any>;
}
declare global {
    interface Window {
        headScriptEvaluationCount?: number;
        bodyScriptEvaluationCount?: number;
    }
}
