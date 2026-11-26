import type { Language } from './codemirror.ts';
import type { BaseStep } from './trace.ts';

/** A file in the code column. */
export interface CodeFile {
    /** Matches `Frame.file` and `BaseStep.file`. */
    readonly id: string;
    readonly name: string;
    /** Shown next to the name, e.g. "simplified". */
    readonly detail?: string;
    readonly source: string;
    /** Default java. */
    readonly language?: Language;
    /** Share of the column's height. */
    readonly weight: number;
}

/**
 * Width (in rem) the code needs: its longest line, plus the value pill shown on it, over all
 * steps. Computed per run, so it never jumps while stepping. Code characters are ~0.525rem
 * (0.6em of 0.875rem), pill characters ~0.42rem.
 */
export function codeWidth(files: readonly CodeFile[], steps: readonly BaseStep[]): number {
    const CHAR = 0.525;
    const NOTE_CHAR = 0.42;
    const lines = new Map(files.map((f) => [f.id, f.source.split('\n')]));
    let widest = Math.max(...[...lines.values()].flatMap((l) => l.map((line) => line.length))) * CHAR;
    for (const s of steps) {
        const line = lines.get(s.file)?.[s.line - 1];
        if (s.note && line !== undefined) widest = Math.max(widest, (line.length + 2) * CHAR + s.note.length * NOTE_CHAR + 1);
    }
    return widest + 4 * CHAR; // line-number digits and a little slack
}
