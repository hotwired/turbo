import { Locatable } from "../location";
import { Visit, VisitOptions } from "../drive/visit";
export interface Adapter {
    visitProposedToLocation(location: Locatable, options?: Partial<VisitOptions>): void;
    visitStarted(visit: Visit): void;
    visitCompleted(visit: Visit): void;
    visitFailed(visit: Visit): void;
    visitRequestStarted(visit: Visit): void;
    visitRequestCompleted(visit: Visit): void;
    visitRequestFailedWithStatusCode(visit: Visit, statusCode: number): void;
    visitRequestFinished(visit: Visit): void;
    visitRendered(visit: Visit): void;
    pageInvalidated(): void;
}
