import { Adapter } from "./adapter";
import { Session } from "../session";
import { Locatable } from "../location";
import { ProgressBar } from "../drive/progress_bar";
import { Visit, VisitOptions } from "../drive/visit";
export declare class BrowserAdapter implements Adapter {
    readonly session: Session;
    readonly progressBar: ProgressBar;
    progressBarTimeout?: number;
    constructor(session: Session);
    visitProposedToLocation(location: Locatable, options?: Partial<VisitOptions>): void;
    visitStarted(visit: Visit): void;
    visitRequestStarted(visit: Visit): void;
    visitRequestCompleted(visit: Visit): void;
    visitRequestFailedWithStatusCode(visit: Visit, statusCode: number): void;
    visitRequestFinished(visit: Visit): void;
    visitCompleted(visit: Visit): void;
    pageInvalidated(): void;
    visitFailed(visit: Visit): void;
    visitRendered(visit: Visit): void;
    showProgressBarAfterDelay(): void;
    showProgressBar: () => void;
    hideProgressBar(): void;
    reload(): void;
}
