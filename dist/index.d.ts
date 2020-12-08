import { Controller } from "./controller";
import { Locatable } from "./location";
import { VisitOptions } from "./visit";
export * from "./adapter";
export * from "./controller";
export * from "./fetch_request";
export * from "./fetch_response";
export * from "./form_submission";
export * from "./location";
export * from "./visit";
export declare const controller: Controller;
export declare const supported: boolean;
export declare function visit(location: Locatable, options?: Partial<VisitOptions>): void;
export declare function clearCache(): void;
export declare function setProgressBarDelay(delay: number): void;
export declare function start(): void;
//# sourceMappingURL=index.d.ts.map