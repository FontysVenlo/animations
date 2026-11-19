import { execFile, execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import { SCENARIOS, VARIANTS, mainFile, simulate } from './index.ts';

// The golden test: compile the Java that students see (HashMap.java, each Book.java and each
// generated Main.java), run it, and check that it prints exactly what the visualiser's console
// shows. Skipped when there is no JDK. (-overrides: the equals-only Book is meant to break that rule.)

const run = promisify(execFile);

function hasJavac(): boolean {
    try {
        execFileSync('javac', ['-version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

const root = new URL('../../java/', import.meta.url).pathname;
const dirs: string[] = [];

afterAll(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe.skipIf(!hasJavac())('the real Java', () => {
    const cases = VARIANTS.flatMap((variant) => SCENARIOS.map((scenario) => ({ variant, scenario })));

    it.concurrent.each(cases.map((c) => [`${c.variant.id} / ${c.scenario.id}`, c] as const))(
        'prints what the visualiser shows: %s',
        async (_name, { variant, scenario }) => {
            const dir = mkdtempSync(join(tmpdir(), 'hashmap-golden-'));
            dirs.push(dir);
            copyFileSync(join(root, 'HashMap.java'), join(dir, 'HashMap.java'));
            copyFileSync(join(root, 'book', `${variant.id}.java`), join(dir, 'Book.java'));
            writeFileSync(join(dir, 'Main.java'), mainFile(scenario).text);
            await run('javac', ['-Xlint:all,-overrides', '-Werror', '-d', join(dir, 'out'), 'HashMap.java', 'Book.java', 'Main.java'], { cwd: dir });
            const { stdout } = await run('java', ['-cp', join(dir, 'out'), 'Main'], { cwd: dir });
            const expected = simulate(variant, scenario, 1).console;
            expect(stdout.trimEnd().split('\n')).toEqual(expected);
        },
    );
});
