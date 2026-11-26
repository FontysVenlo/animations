import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import { SOURCES, type Selection, type Trace, allSelections, mainFile, simulate } from './index.ts';

// The golden test: compile and run the Java students see (the classes in java/inheritance and the
// Main.java generated for every selection) and check that javac and java print exactly what the
// animation's console shows. Batched so it stays fast: one javac run for all compile errors, and
// one javac and one JVM for everything that runs. Skipped when there is no JDK.

const run = promisify(execFile);

function hasJavac(): boolean {
    try {
        execFileSync('javac', ['-version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

const dirs: string[] = [];
afterAll(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function workspace(): { dir: string; classes: string[] } {
    const dir = mkdtempSync(join(tmpdir(), 'inheritance-golden-'));
    dirs.push(dir);
    const classes = Object.entries(SOURCES).map(([name, source]) => {
        writeFileSync(join(dir, `${name}.java`), source);
        return `${name}.java`;
    });
    return { dir, classes };
}

interface Case {
    id: number;
    selection: Selection;
    trace: Trace;
    file: string;
}

function cases(filter: (trace: Trace) => boolean, dir: string): Case[] {
    return allSelections()
        .map((selection, id) => ({ id, selection, trace: simulate(selection) }))
        .filter((c) => filter(c.trace))
        .map((c) => {
            const file = `Main_${c.id}.java`;
            writeFileSync(join(dir, file), mainFile(c.selection, `Main_${c.id}`).text);
            return { ...c, file };
        });
}

/** Identity hash codes differ per run: Object's toString and hashCode. */
function normalise(lines: readonly string[], selection: Selection): string[] {
    return lines.map((line, i) => {
        if (selection.mode === 'call' && selection.method === 'hashCode' && i === lines.length - 1) return '#';
        return line.replace(/@[0-9a-f]+\b/g, '@#');
    });
}

describe.skipIf(!hasJavac())('the real Java', () => {
    it('compiles the classes without warnings', async () => {
        const { dir, classes } = workspace();
        await run('javac', ['-Xlint:all', '-Werror', '-d', join(dir, 'out'), ...classes], { cwd: dir });
    });

    it('gives the compile errors the animation shows', async () => {
        const { dir, classes } = workspace();
        const failing = cases((t) => t.outcome === 'compile-error', dir);
        expect(failing.length).toBeGreaterThan(0);

        const result = await run('javac', ['-Xmaxerrs', '100000', '-d', join(dir, 'out'), ...classes, ...failing.map((c) => c.file)], { cwd: dir }).then(
            () => ({ stderr: '' }),
            (error: { stderr: string }) => ({ stderr: error.stderr }),
        );

        // The first error per file: its line and message, without the source line and the ^ under it.
        const first = new Map<string, { line: number; message: string[] }>();
        let current: { line: number; message: string[] } | undefined;
        for (const line of result.stderr.split('\n')) {
            const head = /^(Main_\d+\.java):(\d+): (error: .*)$/.exec(line);
            if (head) {
                current = first.has(head[1]) ? undefined : { line: Number(head[2]), message: [head[3]] };
                if (current) first.set(head[1], current);
            } else if (current && /^ {2}(symbol|location):/.test(line)) {
                current.message.push(line);
            }
        }

        for (const c of failing) {
            expect(first.get(c.file), `${c.file}: ${JSON.stringify(c.selection)}`).toEqual(c.trace.compileError);
        }
    });

    it('prints what the animation shows, or throws its ClassCastException', async () => {
        const { dir, classes } = workspace();
        const running = cases((t) => t.outcome !== 'compile-error', dir);
        const calls = running.map((c) => `        run(${c.id}, () -> Main_${c.id}.main(args));`).join('\n');
        writeFileSync(
            join(dir, 'RunAll.java'),
            `public class RunAll {

    public static void main(String[] args) {
${calls}
    }

    private static void run(int id, Runnable main) {
        System.out.println("=== " + id);
        try {
            main.run();
        } catch (ClassCastException e) {
            System.out.println("!! " + e.getMessage());
        }
    }
}
`,
        );
        // -cast: an upcast such as (Vehicle) vehicle is allowed, but javac calls it redundant.
        await run('javac', ['-Xlint:all,-cast', '-Werror', '-d', join(dir, 'out'), ...classes, ...running.map((c) => c.file), 'RunAll.java'], { cwd: dir });
        const { stdout } = await run('java', ['-cp', join(dir, 'out'), 'RunAll'], { cwd: dir, maxBuffer: 16 * 1024 * 1024 });

        const printed = new Map<number, string[]>();
        let lines: string[] = [];
        for (const line of stdout.trimEnd().split('\n')) {
            const marker = /^=== (\d+)$/.exec(line);
            if (marker) printed.set(Number(marker[1]), (lines = []));
            else lines.push(line);
        }

        for (const c of running) {
            const expected = c.trace.outcome === 'exception' ? [`!! ${c.trace.exception}`] : c.trace.console;
            expect(normalise(printed.get(c.id) ?? [], c.selection), JSON.stringify(c.selection)).toEqual(normalise(expected, c.selection));
        }
    });
});
