// The URL holds what a teacher needs to share a moment:
// ?book=generated&scenario=loans&step=42 (plus &seed=7 after ↻, &detail=0 without stepping into Book).
// `step` is the 1-based number shown in the timeline.

export interface UrlState {
    book?: string;
    scenario?: string;
    step?: number;
    seed?: number;
    detail?: boolean;
}

export const DEFAULT_SEED = 1;

export function parseUrl(search: string): UrlState {
    const params = new URLSearchParams(search);
    const step = Number(params.get('step'));
    const seed = Number(params.get('seed'));
    return {
        book: params.get('book') ?? undefined,
        scenario: params.get('scenario') ?? undefined,
        step: Number.isInteger(step) && step > 0 ? step : undefined,
        seed: params.has('seed') && Number.isInteger(seed) && seed > 0 ? seed : undefined,
        detail: params.get('detail') === '0' ? false : undefined,
    };
}

export function urlFor(state: { book: string; scenario: string; index: number; seed: number; detail: boolean }): string {
    const params = new URLSearchParams({ book: state.book, scenario: state.scenario });
    if (state.index > 0) params.set('step', String(state.index + 1));
    if (state.seed !== DEFAULT_SEED) params.set('seed', String(state.seed));
    if (!state.detail) params.set('detail', '0');
    return `?${params}`;
}
