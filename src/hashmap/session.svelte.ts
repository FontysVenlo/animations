import { StepSession } from '../lib/session.svelte.ts';
import { SCENARIOS, type Step, VARIANTS, findScenario, findVariant, simulate } from './model/index.ts';
import { DEFAULT_SEED, type UrlState } from './url.ts';

export type LowerTab = 'console' | 'calls' | 'stack';

/** The chosen Book and scenario, and the run they produce. */
export class Session extends StepSession<Step, LowerTab> {
    variantId = $state(VARIANTS[0].id);
    scenarioId = $state(SCENARIOS[0].id);
    /** Seeds the identity hash codes and the random numbers. */
    seed = $state(DEFAULT_SEED);

    readonly variant = $derived(findVariant(this.variantId) ?? VARIANTS[0]);
    readonly scenario = $derived(findScenario(this.scenarioId) ?? SCENARIOS[0]);
    /** The full run, with every step inside hashCode and equals. Deriveds aren't made deeply reactive. */
    readonly trace = $derived(simulate(this.variant, this.scenario, this.seed));
    readonly allSteps = $derived(this.trace.steps);
    readonly calls = $derived(this.trace.calls);
    readonly totals = $derived(this.trace.steps[this.trace.steps.length - 1].counters);

    constructor() {
        super('hashmap-visualiser:', ['console', 'calls', 'stack']);
    }

    selectVariant = (id: string): void => this.keepCall(() => (this.variantId = id));

    selectScenario = (id: string): void => this.restart(() => (this.scenarioId = id));

    /** New identity hash codes and random numbers. */
    reseed = (): void => this.keepCall(() => (this.seed = Math.floor(Math.random() * 1_000_000) + 2));

    restore = (url: UrlState): void => {
        if (findVariant(url.book)) this.variantId = url.book!;
        if (findScenario(url.scenario)) this.scenarioId = url.scenario!;
        if (url.seed) this.seed = url.seed;
        if (url.detail === false) this.detail = false;
        if (url.step) this.goTo(url.step - 1);
    };
}
