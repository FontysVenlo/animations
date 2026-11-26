import { StepSession } from '../lib/session.svelte.ts';
import { DEFAULT_SELECTION, EXAMPLES, type ExampleId, type Selection, type Step, findPreset, firstPreset, normalise, presetOf, simulate } from './model/index.ts';
import type { UrlState } from './url.ts';

export type LowerTab = 'console' | 'lookups' | 'stack';

/** The chosen example, types and method or cast, and the run they produce. */
export class Session extends StepSession<Step, LowerTab> {
    selection = $state<Selection>(DEFAULT_SELECTION);

    readonly example = $derived(EXAMPLES[this.selection.example]);
    /** The full run, with every lookup step. Deriveds aren't made deeply reactive. */
    readonly trace = $derived(simulate(this.selection));
    readonly allSteps = $derived(this.trace.steps);
    readonly calls = $derived(this.trace.calls);
    /** The preset this selection is, if any. */
    readonly preset = $derived(presetOf(this.selection));

    constructor() {
        super('inheritance-visualiser:', ['console', 'lookups', 'stack']);
    }

    /** Change part of the selection; the run starts again. */
    select = (change: Partial<Selection>): void => this.restart(() => (this.selection = normalise({ ...this.selection, ...change })));

    selectExample = (id: ExampleId): void => this.restart(() => (this.selection = firstPreset(id).selection));

    selectPreset = (id: string): void => {
        const preset = findPreset(id);
        if (preset) this.restart(() => (this.selection = preset.selection));
    };

    restore = (url: UrlState): void => {
        this.selection = normalise(url.selection);
        if (url.detail === false) this.detail = false;
        if (url.step) this.goTo(url.step - 1);
    };
}
