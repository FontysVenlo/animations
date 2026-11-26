import type { ExampleId, Mode, Selection } from './model/index.ts';

// ?example=vehicles&static=Vehicle&dynamic=Car&method=move&step=9, or &cast=Startable instead of
// &method, plus &detail=0 without stepping into the lookup. `step` is the 1-based number shown in
// the timeline.

export interface UrlState {
    selection: Partial<Selection>;
    step?: number;
    detail?: boolean;
}

export function parseUrl(search: string): UrlState {
    const params = new URLSearchParams(search);
    const step = Number(params.get('step'));
    const cast = params.get('cast');
    const mode: Mode = cast !== null ? 'cast' : 'call';
    return {
        selection: {
            example: (params.get('example') ?? undefined) as ExampleId | undefined,
            mode,
            static: params.get('static') ?? undefined,
            dynamic: params.get('dynamic') ?? undefined,
            method: params.get('method') ?? undefined,
            target: cast ?? undefined,
        },
        step: Number.isInteger(step) && step > 0 ? step : undefined,
        detail: params.get('detail') === '0' ? false : undefined,
    };
}

export function urlFor(selection: Selection, index: number, detail: boolean): string {
    const params = new URLSearchParams({ example: selection.example, static: selection.static, dynamic: selection.dynamic });
    if (selection.mode === 'cast') params.set('cast', selection.target);
    else params.set('method', selection.method);
    if (index > 0) params.set('step', String(index + 1));
    if (!detail) params.set('detail', '0');
    return `?${params}`;
}
