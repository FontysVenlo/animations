import { SCENARIOS, type Step, VARIANTS, findScenario, findVariant, simulate } from './model/index.ts';
import { DEFAULT_SEED, type UrlState } from './url.ts';

export const SPEEDS = [1, 2, 4, 8, 16] as const;

export type LowerTab = 'console' | 'calls' | 'stack';
export type Collapsible = 'visual' | 'lower';

const PREFIX = 'hashmap-visualiser:';
const SPLIT_KEY = `${PREFIX}split`;
const COLUMNS_KEY = `${PREFIX}columns`;
const COLLAPSED_KEY = `${PREFIX}collapsed`;
const TAB_KEY = `${PREFIX}tab`;

/** Remembered per browser; storage can be unavailable (private mode, blocked site data). */
function stored(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function store(key: string, value: string | undefined): void {
    try {
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    } catch {
        // Not remembered, but the choice still applies for this visit.
    }
}

/** The visualiser's share of the right column, or undefined to size it to its content. */
export const MIN_SPLIT = 0.15;
export const MAX_SPLIT = 0.85;

/** The code column's share of the workspace width, or undefined for the default. */
export const MIN_COLUMNS = 0.2;
export const MAX_COLUMNS = 0.8;

function storedShare(key: string, min: number, max: number): number | undefined {
    const value = Number(stored(key));
    return stored(key) !== null && value >= min && value <= max ? value : undefined;
}

function storedCollapsed(): Record<Collapsible, boolean> {
    const value = stored(COLLAPSED_KEY) ?? '';
    return { visual: value.includes('visual'), lower: value.includes('lower') };
}

function storedTab(): LowerTab {
    const value = stored(TAB_KEY);
    return value === 'calls' || value === 'stack' ? value : 'console';
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Everything the UI shows: the chosen Book and scenario, the run, and the step being viewed. */
export class Session {
    variantId = $state(VARIANTS[0].id);
    scenarioId = $state(SCENARIOS[0].id);
    /** Seeds the identity hash codes and the random numbers. */
    seed = $state(DEFAULT_SEED);
    /** Whether to step through the lines of hashCode and equals too. */
    detail = $state(true);
    index = $state(0);
    playing = $state(false);
    /** Steps per second while playing. */
    speed = $state<number>(2);
    split = $state<number | undefined>(storedShare(SPLIT_KEY, MIN_SPLIT, MAX_SPLIT));
    columns = $state<number | undefined>(storedShare(COLUMNS_KEY, MIN_COLUMNS, MAX_COLUMNS));
    collapsed = $state<Record<Collapsible, boolean>>(storedCollapsed());
    tab = $state<LowerTab>(storedTab());
    /** Whether the last move was a single step (animated) or a jump (redrawn at once). */
    moved = $state<'step' | 'jump'>('jump');

    readonly variant = $derived(findVariant(this.variantId) ?? VARIANTS[0]);
    readonly scenario = $derived(findScenario(this.scenarioId) ?? SCENARIOS[0]);
    /** The full run, with every step inside hashCode and equals. Deriveds aren't made deeply reactive. */
    readonly trace = $derived(simulate(this.variant, this.scenario, this.seed));
    readonly steps = $derived(this.detail ? this.trace.steps : this.trace.steps.filter((s) => !s.inside));
    readonly step = $derived<Step | undefined>(this.steps[this.index]);
    readonly previous = $derived(this.index > 0 ? this.steps[this.index - 1] : undefined);
    readonly lastIndex = $derived(Math.max(0, this.steps.length - 1));
    readonly totals = $derived(this.trace.steps[this.trace.steps.length - 1].counters);

    /** The first shown step at or after a step of the full trace. */
    indexOfSeq = (seq: number): number => {
        const i = this.steps.findIndex((s) => s.seq >= seq);
        return i < 0 ? this.lastIndex : i;
    };

    /** Change the run but stay at the same map call, so runs can be compared call by call. */
    private keepCall(change: () => void): void {
        const call = this.step?.call;
        const index = this.index;
        this.playing = false;
        change();
        this.moved = 'jump';
        if (call !== undefined && this.trace.calls[call]) this.index = this.indexOfSeq(this.trace.calls[call].firstSeq);
        else this.index = Math.min(index, this.lastIndex);
    }

    selectVariant = (id: string): void => this.keepCall(() => (this.variantId = id));

    selectScenario = (id: string): void => {
        this.playing = false;
        this.scenarioId = id;
        this.moved = 'jump';
        this.index = 0;
    };

    /** New identity hash codes and random numbers. */
    reseed = (): void => this.keepCall(() => (this.seed = Math.floor(Math.random() * 1_000_000) + 2));

    setDetail = (detail: boolean): void => {
        const seq = this.step?.seq ?? 0;
        this.detail = detail;
        this.moved = 'jump';
        this.index = this.indexOfSeq(seq);
    };

    restore = (url: UrlState): void => {
        if (findVariant(url.book)) this.variantId = url.book!;
        if (findScenario(url.scenario)) this.scenarioId = url.scenario!;
        if (url.seed) this.seed = url.seed;
        if (url.detail === false) this.detail = false;
        if (url.step) this.goTo(url.step - 1);
    };

    goTo = (index: number): void => {
        const target = clamp(Math.round(index), 0, this.lastIndex);
        this.moved = Math.abs(target - this.index) > 1 ? 'jump' : 'step';
        this.index = target;
    };

    /** Jump to a map call (from the Calls table). */
    goToCall = (call: number): void => {
        this.playing = false;
        const first = this.trace.calls[call]?.firstSeq;
        if (first !== undefined) this.goTo(this.indexOfSeq(first));
    };

    next = (): void => {
        this.playing = false;
        this.goTo(this.index + 1);
    };

    prev = (): void => {
        this.playing = false;
        this.goTo(this.index - 1);
    };

    first = (): void => {
        this.playing = false;
        this.goTo(0);
    };

    last = (): void => {
        this.playing = false;
        this.goTo(this.lastIndex);
    };

    /** To the start of the next or previous map call. */
    nextCall = (): void => {
        this.playing = false;
        const seq = this.step?.seq ?? 0;
        const call = this.trace.calls.find((c) => c.firstSeq > seq);
        this.goTo(call ? this.indexOfSeq(call.firstSeq) : this.lastIndex);
    };

    prevCall = (): void => {
        this.playing = false;
        const seq = this.step?.seq ?? 0;
        const call = [...this.trace.calls].reverse().find((c) => c.firstSeq < seq);
        this.goTo(call ? this.indexOfSeq(call.firstSeq) : 0);
    };

    /** One step of playback; stops at the end. */
    tick = (): void => {
        if (this.index >= this.lastIndex) this.playing = false;
        else this.goTo(this.index + 1);
    };

    togglePlay = (): void => {
        if (!this.playing && this.index >= this.lastIndex) this.goTo(0);
        this.playing = !this.playing;
    };

    setTab = (tab: LowerTab): void => {
        this.tab = tab;
        store(TAB_KEY, tab);
    };

    setSplit = (split: number | undefined): void => {
        this.split = split === undefined ? undefined : clamp(split, MIN_SPLIT, MAX_SPLIT);
        store(SPLIT_KEY, this.split?.toFixed(3));
    };

    setColumns = (columns: number | undefined): void => {
        this.columns = columns === undefined ? undefined : clamp(columns, MIN_COLUMNS, MAX_COLUMNS);
        store(COLUMNS_KEY, this.columns?.toFixed(3));
    };

    toggleCollapsed = (card: Collapsible): void => {
        this.collapsed = { ...this.collapsed, [card]: !this.collapsed[card] };
        const names = (Object.keys(this.collapsed) as Collapsible[]).filter((c) => this.collapsed[c]);
        store(COLLAPSED_KEY, names.length > 0 ? names.join(',') : undefined);
    };
}
