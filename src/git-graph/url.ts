// ?step=9&predict=1: `step` is the 1-based number shown in the timeline, `predict` turns on
// predict mode (each command first runs without showing what it does).

export interface UrlState {
    step?: number;
    predict?: boolean;
}

export function parseUrl(search: string): UrlState {
    const params = new URLSearchParams(search);
    const step = Number(params.get('step'));
    return {
        step: Number.isInteger(step) && step > 0 ? step : undefined,
        predict: params.get('predict') === '1' ? true : undefined,
    };
}

export function urlFor(index: number, predict: boolean): string {
    const params = new URLSearchParams();
    if (index > 0) params.set('step', String(index + 1));
    if (predict) params.set('predict', '1');
    const query = params.toString();
    return query ? `?${query}` : '';
}
