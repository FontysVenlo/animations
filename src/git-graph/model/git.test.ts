import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COMMANDS, REFS, STATES, commandText } from './index.ts';

// The golden test: run the commands students see (code/git-graph/gitexperiment.sh) with real git
// and check that it prints exactly what the animation's terminal shows, and that after every
// command the branches, HEAD, hashes and parents are those the diagram draws. Skipped when there
// is no git.
//
// Fixed author, committer and dates make the hashes reproducible. Without a terminal git leaves
// out what it only prints for one, so the configuration asks for it: decorations such as
// `(HEAD -> main)` (log.decorate) and fsck's progress (--progress, keeping each line's last state).
// A git that prints fewer progress lines than the one the outputs were made with still passes.

function hasGit(): boolean {
    try {
        execFileSync('git', ['--version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

const HOME_SHOWN = '/home/student';
// As on the students' computers, the default branch is main (init.defaultBranch).
const CONFIG = { 'init.defaultBranch': 'main', 'log.decorate': 'short', 'color.ui': 'never', 'core.pager': 'cat' };

/** Command i is made at 10:40 + i minutes. */
function environment(home: string, i: number): NodeJS.ProcessEnv {
    const date = `2025-11-21T10:${String(40 + i).padStart(2, '0')}:00+01:00`;
    return {
        PATH: process.env.PATH,
        HOME: home,
        LC_ALL: 'C',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_EDITOR: 'true',
        GIT_AUTHOR_NAME: 'Student',
        GIT_AUTHOR_EMAIL: 'student@example.com',
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_NAME: 'Student',
        GIT_COMMITTER_EMAIL: 'student@example.com',
        GIT_COMMITTER_DATE: date,
        GIT_CONFIG_COUNT: String(Object.keys(CONFIG).length),
        ...Object.fromEntries(Object.entries(CONFIG).flatMap(([key, value], j) => [[`GIT_CONFIG_KEY_${j}`, key], [`GIT_CONFIG_VALUE_${j}`, value]])),
    };
}

const PROGRESS = /^[A-Z][a-z ]+: +\d+% \(\d+\/\d+\), done\.$/;

/** Each line as it ends up on the screen: after a carriage return, the rest overwrites it. */
function lines(output: string, home: string): string[] {
    if (output === '') return [];
    return output
        .replace(/\n$/, '')
        .split('\n')
        .map((line) => line.split('\r').pop()!.replaceAll(home, HOME_SHOWN));
}

interface Snapshot {
    output: string[];
    head: string;
    refs: Record<string, string>;
    /** Short hash to its parents' short hashes and its message, for every commit the model has. */
    commits: Record<string, { parents: string[]; message: string }>;
}

describe.skipIf(!hasGit())('the git session, run with git', () => {
    let home = '';
    const snapshots: Snapshot[] = [];

    beforeAll(() => {
        home = mkdtempSync(join(tmpdir(), 'git-graph-golden-'));
        const repo = join(home, 'gitexperiment');
        COMMANDS.forEach((command, i) => {
            const text = commandText(command);
            const run = text.startsWith('git fsck') ? `${text} --progress` : text;
            const result = spawnSync('sh', ['-c', `${run} 2>&1`], { cwd: i === 0 ? home : repo, env: environment(home, i), encoding: 'utf8' });
            if (result.status !== 0) throw new Error(`${text} failed:\n${result.stdout}`);
            const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, env: environment(home, i), encoding: 'utf8' }).trim();
            const refs = Object.fromEntries(
                git('for-each-ref', '--format=%(refname:short) %(objectname:short)')
                    .split('\n')
                    .filter((l) => l !== '')
                    .map((l) => l.split(' ')),
            );
            const commits = Object.fromEntries(
                STATES[i + 1].commits.map((c) => {
                    const [message, parents = ''] = git('log', '-1', '--format=%s%n%p', c.hash).split('\n');
                    return [c.hash, { parents: parents === '' ? [] : parents.split(' '), message }];
                }),
            );
            snapshots.push({ output: lines(result.stdout, home), head: git('symbolic-ref', '--short', 'HEAD'), refs, commits });
        });
    });

    afterAll(() => {
        if (home) rmSync(home, { recursive: true, force: true });
    });

    it.each(COMMANDS.map((c, i) => [commandText(c), i] as const))('prints what the terminal shows: %s', (_text, i) => {
        const shown = COMMANDS[i].output;
        const printed = snapshots[i].output;
        expect(printed.filter((l) => !PROGRESS.test(l))).toEqual(shown.filter((l) => !PROGRESS.test(l)));
        for (const line of printed.filter((l) => PROGRESS.test(l))) expect(shown).toContain(line);
    });

    it.each(COMMANDS.map((c, i) => [commandText(c), i] as const))('leaves the graph the diagram draws: %s', (_text, i) => {
        const state = STATES[i + 1];
        const hash = new Map(state.commits.map((c) => [c.id, c.hash]));
        const { head, refs, commits } = snapshots[i];
        expect(head).toBe(state.head);
        expect(refs).toEqual(Object.fromEntries(REFS.filter((r) => state.refs[r]).map((r) => [r, hash.get(state.refs[r]!)])));
        for (const c of state.commits) {
            expect(commits[c.hash]).toEqual({ parents: c.parents.map((p) => hash.get(p)), message: c.message });
        }
    });

    it('prints the log in the order the diagram numbers the commits', () => {
        const i = COMMANDS.findIndex((c) => c.marker === 'log');
        const hash = new Map(STATES[i + 1].commits.map((c) => [c.id, c.hash]));
        const printed = snapshots[i].output.flatMap((l) => /[0-9a-f]{7}/.exec(l) ?? []);
        expect(printed).toEqual(COMMANDS[i].topo!.map((id) => hash.get(id)));
    });

    it('agrees with what the explanations claim', () => {
        const i = COMMANDS.length - 1;
        const git = (...args: string[]) => execFileSync('git', args, { cwd: join(home, 'gitexperiment'), env: environment(home, i), encoding: 'utf8' }).trim();
        const e = STATES[i + 1].commits.find((c) => c.id === 'E')!.hash;
        // No branch reaches E, but the reflog does.
        expect(git('rev-list', '--all', '--abbrev-commit').split('\n')).not.toContain(e);
        expect(git('rev-list', '--all', '--reflog', '--abbrev-commit').split('\n')).toContain(e);
        // fsck finds nothing unreachable while it counts the reflog; E is dangling without it.
        expect(git('fsck', '--unreachable')).toBe('');
        expect(git('fsck', '--dangling', '--no-reflogs')).toMatch(new RegExp(`^dangling commit ${e}`));
    });
});
