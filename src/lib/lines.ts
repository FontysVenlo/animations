// The code students see marks the lines the simulation stops on with an end-of-line comment, e.g.
//     int hash = key.hashCode(); // @put.hash
//     git commit -m "A" # @a
// The markers are removed from the code shown.

export interface SourceFile {
    /** The code as shown: without the markers. */
    readonly text: string;
    /** Marker name to 1-based line number. */
    readonly labels: ReadonlyMap<string, number>;
}

/** A Java (`// @name`) or shell (`# @name`) marker at the end of a line. */
const MARKER = /\s*(?:\/\/|#) @([\w.-]+)\s*$/;

export function parseSource(raw: string): SourceFile {
    const labels = new Map<string, number>();
    const lines = raw.replace(/\s+$/, '').split('\n').map((line, i) => {
        const match = MARKER.exec(line);
        if (!match) return line.replace(/\s+$/, '');
        if (labels.has(match[1])) throw new Error(`Marker @${match[1]} is used twice`);
        labels.set(match[1], i + 1);
        return line.slice(0, match.index);
    });
    return { text: lines.join('\n'), labels };
}

export function lineOf(file: SourceFile, label: string): number {
    const line = file.labels.get(label);
    if (line === undefined) throw new Error(`No marker @${label}`);
    return line;
}
