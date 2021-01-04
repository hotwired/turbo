import { FetchResponse } from "../../http/fetch_response";
import { FormSubmission } from "./form_submission";
import { Locatable, Location } from "../location";
import { Visit, VisitDelegate, VisitOptions } from "./visit";
export declare type NavigatorDelegate = VisitDelegate & {
    allowsVisitingLocation(location: Location): boolean;
    visitProposedToLocation(location: Location, options: Partial<VisitOptions>): void;
};
export declare class Navigator {
    readonly delegate: NavigatorDelegate;
    formSubmission?: FormSubmission;
    currentVisit?: Visit;
    constructor(delegate: NavigatorDelegate);
    proposeVisit(location: Location, options?: Partial<VisitOptions>): void;
    startVisit(location: Locatable, restorationIdentifier: string, options?: Partial<VisitOptions>): void;
    submitForm(form: HTMLFormElement, submitter?: HTMLElement): void;
    stop(): void;
    get adapter(): import("../native/adapter").Adapter;
    get view(): import("./view").View;
    get history(): import("./history").History;
    formSubmissionStarted(formSubmission: FormSubmission): void;
    formSubmissionSucceededWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): Promise<void>;
    formSubmissionFailedWithResponse(formSubmission: FormSubmission, fetchResponse: FetchResponse): Promise<void>;
    formSubmissionErrored(formSubmission: FormSubmission, error: Error): void;
    formSubmissionFinished(formSubmission: FormSubmission): void;
    visitStarted(visit: Visit): void;
    visitCompleted(visit: Visit): void;
    get location(): Location;
    get restorationIdentifier(): string;
}
