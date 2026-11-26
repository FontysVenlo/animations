import { StepSession } from '../lib/session.svelte.ts';
import { type Step, TRACE } from './model/index.ts';
import type { UrlState } from './url.ts';

export type LowerTab = 'terminal' | 'graph';

/** The one replay, with or without the predict steps, and the commit clicked in the diagram. */
export class Session extends StepSession<Step, LowerTab> {
    readonly trace = TRACE;
    readonly allSteps = TRACE.steps;
    readonly calls = TRACE.calls;
    /** Shows its ancestors, while it is in the graph shown. */
    selected = $state<string>();

    constructor() {
        super('git-graph-visualiser:', ['terminal', 'graph']);
        // Predict mode shows the detail steps; it is off unless the link asks for it.
        this.detail = false;
    }

    /** Predict mode: each command first runs without showing what it does. */
    get predict(): boolean {
        return this.detail;
    }

    setPredict = (predict: boolean): void => this.setDetail(predict);

    togglePredict = (): void => this.setDetail(!this.detail);

    select = (id: string | undefined): void => {
        this.selected = this.selected === id ? undefined : id;
    };

    restore = (url: UrlState): void => {
        if (url.predict) this.detail = true;
        if (url.step) this.goTo(url.step - 1);
    };
}
