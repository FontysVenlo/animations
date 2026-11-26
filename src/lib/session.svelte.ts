import type { BaseStep, CallStart } from './trace.ts';

export const SPEEDS = [1, 2, 4, 8, 16] as const;

export type Collapsible = 'visual' | 'lower';

/** The visualiser's share of the right column, or undefined to size it to its content. */
export const MIN_SPLIT = 0.15;
export const MAX_SPLIT = 0.85;

/** The code column's share of the workspace width, or undefined for the default. */
export const MIN_COLUMNS = 0.2;
export const MAX_COLUMNS = 0.8;

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

function storedShare(key: string, min: number, max: number): number | undefined {
    const value = Number(stored(key));
    return stored(key) !== null && value >= min && value <= max ? value : undefined;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * The step being viewed, playback and the layout: everything an animation that steps through
 * code shares. An animation extends it with what the user chooses and the run it produces
 * (`allSteps` and `calls`).
 */
export abstract class StepSession<S extends BaseStep = BaseStep, Tab extends string = string> {
    /** Every step of the run, including the ones "step into" can hide. */
    abstract readonly allSteps: readonly S[];
    /** Where each call starts, for ↑ and ↓. */
    abstract readonly calls: readonly CallStart[];

    /** Whether to show the detail steps (`inside`) too. */
    detail = $state(true);
    index = $state(0);
    playing = $state(false);
    /** Steps per second while playing. */
    speed = $state<number>(2);
    split = $state<number | undefined>();
    columns = $state<number | undefined>();
    collapsed = $state<Record<Collapsible, boolean>>({ visual: false, lower: false });
    tab = $state<Tab>() as Tab;
    /** Whether the last move was a single step (animated) or a jump (redrawn at once). */
    moved = $state<'step' | 'jump'>('jump');

    readonly steps = $derived.by(() => (this.detail ? this.allSteps : this.allSteps.filter((s) => !s.inside)));
    readonly step = $derived<S | undefined>(this.steps[this.index]);
    readonly previous = $derived(this.index > 0 ? this.steps[this.index - 1] : undefined);
    readonly lastIndex = $derived(Math.max(0, this.steps.length - 1));

    readonly #prefix: string;
    readonly #tabs: readonly Tab[];

    /**
     * @param prefix localStorage prefix for the layout, e.g. `hashmap-visualiser:`
     * @param tabs the lower panel's tabs; the first is the default
     */
    constructor(prefix: string, tabs: readonly Tab[]) {
        this.#prefix = prefix;
        this.#tabs = tabs;
        this.split = storedShare(this.#key('split'), MIN_SPLIT, MAX_SPLIT);
        this.columns = storedShare(this.#key('columns'), MIN_COLUMNS, MAX_COLUMNS);
        const collapsed = stored(this.#key('collapsed')) ?? '';
        this.collapsed = { visual: collapsed.includes('visual'), lower: collapsed.includes('lower') };
        const tab = stored(this.#key('tab'));
        this.tab = tabs.find((t) => t === tab) ?? tabs[0];
    }

    #key = (name: string) => `${this.#prefix}${name}`;

    /** The first shown step at or after a step of the full trace. */
    indexOfSeq = (seq: number): number => {
        const i = this.steps.findIndex((s) => s.seq >= seq);
        return i < 0 ? this.lastIndex : i;
    };

    /** Change the run but stay at the same call, so runs can be compared call by call. */
    protected keepCall(change: () => void): void {
        const call = this.step?.call;
        const index = this.index;
        this.playing = false;
        change();
        this.moved = 'jump';
        if (call !== undefined && this.calls[call]) this.index = this.indexOfSeq(this.calls[call].firstSeq);
        else this.index = Math.min(index, this.lastIndex);
    }

    /** Start a new run from its first step. */
    protected restart(change: () => void): void {
        this.playing = false;
        change();
        this.moved = 'jump';
        this.index = 0;
    }

    setDetail = (detail: boolean): void => {
        const seq = this.step?.seq ?? 0;
        this.detail = detail;
        this.moved = 'jump';
        this.index = this.indexOfSeq(seq);
    };

    goTo = (index: number): void => {
        const target = clamp(Math.round(index), 0, this.lastIndex);
        this.moved = Math.abs(target - this.index) > 1 ? 'jump' : 'step';
        this.index = target;
    };

    /** Jump to a call (e.g. from a table of calls). */
    goToCall = (call: number): void => {
        this.playing = false;
        const first = this.calls[call]?.firstSeq;
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

    /** To the start of the next or previous call. */
    nextCall = (): void => {
        this.playing = false;
        const seq = this.step?.seq ?? 0;
        const call = this.calls.find((c) => c.firstSeq > seq);
        this.goTo(call ? this.indexOfSeq(call.firstSeq) : this.lastIndex);
    };

    prevCall = (): void => {
        this.playing = false;
        const seq = this.step?.seq ?? 0;
        const call = [...this.calls].reverse().find((c) => c.firstSeq < seq);
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

    setTab = (tab: string): void => {
        const known = this.#tabs.find((t) => t === tab);
        if (known === undefined) return;
        this.tab = known;
        store(this.#key('tab'), known);
    };

    setSplit = (split: number | undefined): void => {
        this.split = split === undefined ? undefined : clamp(split, MIN_SPLIT, MAX_SPLIT);
        store(this.#key('split'), this.split?.toFixed(3));
    };

    setColumns = (columns: number | undefined): void => {
        this.columns = columns === undefined ? undefined : clamp(columns, MIN_COLUMNS, MAX_COLUMNS);
        store(this.#key('columns'), this.columns?.toFixed(3));
    };

    toggleCollapsed = (card: Collapsible): void => {
        this.collapsed = { ...this.collapsed, [card]: !this.collapsed[card] };
        const names = (Object.keys(this.collapsed) as Collapsible[]).filter((c) => this.collapsed[c]);
        store(this.#key('collapsed'), names.length > 0 ? names.join(',') : undefined);
    };
}
