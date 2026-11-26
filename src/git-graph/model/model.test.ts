import { describe, expect, it } from 'vitest';
import { parseSource } from '../../lib/lines.ts';
import { COMMANDS, SCRIPT, STATES, TRACE, children, commandText, isTopological, reach, reachable, stats } from './index.ts';

const after = (marker: string) => STATES[COMMANDS.findIndex((c) => c.marker === marker) + 1];
const commitIn = (marker: string, id: string) => after(marker).commits.find((c) => c.id === id)!;

describe('the script', () => {
    it('reads shell markers', () => {
        const file = parseSource('# a comment\ngit init # @init\n');
        expect(file.labels.get('init')).toBe(2);
        expect(file.text).toBe('# a comment\ngit init');
    });

    it('has one line per command, without the markers', () => {
        expect(SCRIPT.labels.size).toBe(COMMANDS.length);
        expect(SCRIPT.text).not.toContain('# @');
        expect(COMMANDS.map(commandText)).toContain('git commit --amend --allow-empty -m "EE"');
    });
});

describe('the graph', () => {
    it('starts empty', () => {
        expect(STATES[0].commits).toHaveLength(0);
        expect(stats(STATES[1])).toMatchObject({ vertices: 0, edges: 0 });
    });

    it('has one root', () => {
        expect(stats(STATES[STATES.length - 1]).roots).toEqual(['A']);
    });

    it('forks at B and merges at M', () => {
        const merged = after('merge');
        expect(commitIn('merge', 'M').parents).toEqual(['D', 'C']);
        expect(stats(merged)).toMatchObject({ vertices: 5, edges: 5, merges: ['M'], forks: ['B'] });
        expect(children(merged.commits, 'B').sort()).toEqual(['C', 'D']);
    });

    it('only moves labels when branching and switching', () => {
        for (const marker of ['branch', 'switch', 'back']) {
            const i = COMMANDS.findIndex((c) => c.marker === marker);
            expect(STATES[i + 1].commits).toEqual(STATES[i].commits);
        }
        expect(after('branch').refs).toEqual({ main: 'B', feat1: 'B' });
        expect(after('branch').head).toBe('main');
        expect(after('switch').refs).toEqual({ main: 'B', feat1: 'B' });
        expect(after('switch').head).toBe('feat1');
        expect(after('back').head).toBe('main');
    });

    it('keeps E after the amend, unreachable but with its edge', () => {
        const amended = after('amend');
        expect(commitIn('amend', 'EE').parents).toEqual(['M']);
        expect(commitIn('amend', 'E').parents).toEqual(['M']);
        expect(stats(amended).unreachable).toEqual(['E']);
        expect(reachable(amended).has('E')).toBe(false);
        expect(reach(amended.commits, ['E'])).toEqual(new Set(['E', 'M', 'D', 'C', 'B', 'A']));
    });

    it('prints log in a topological order of what the branches reach', () => {
        const log = COMMANDS.find((c) => c.marker === 'log')!;
        const state = after('log');
        expect(isTopological(state.commits, log.topo!)).toBe(true);
        expect(new Set(log.topo)).toEqual(reachable(state));
        expect(isTopological(state.commits, ['A', 'B'])).toBe(false);
    });

    it('has a short hash for every commit, each different', () => {
        const hashes = STATES[STATES.length - 1].commits.map((c) => c.hash);
        expect(new Set(hashes).size).toBe(hashes.length);
        for (const hash of hashes) expect(hash).toMatch(/^[0-9a-f]{7}$/);
    });
});

describe('the trace', () => {
    const { steps, calls } = TRACE;

    it('is well-formed', () => {
        expect(steps[0].inside).toBe(false);
        expect(steps.filter((s) => s.done)).toEqual([steps[steps.length - 1]]);
        steps.forEach((step, i) => {
            expect(step.seq).toBe(i);
            expect(step.line).toBe(SCRIPT.labels.get(COMMANDS[step.call!].marker));
            expect(step.narration[0]).toBe(commandText(COMMANDS[step.call!]));
            if (i > 0) expect(step.console.slice(0, steps[i - 1].console.length)).toEqual(steps[i - 1].console);
        });
        expect(calls).toHaveLength(COMMANDS.length);
        calls.forEach((call, i) => expect(steps[call.firstSeq].call).toBe(i));
    });

    it('runs every command once, in order, without predict mode', () => {
        const run = steps.filter((s) => !s.inside);
        expect(run.map((s) => s.call)).toEqual(COMMANDS.map((_, i) => i));
        run.forEach((s, i) => {
            expect(s.view.commits).toEqual(STATES[i + 1].commits);
            expect(s.view.terminal[i].output).toEqual(COMMANDS[i].output);
        });
    });

    it('asks first in predict mode, before showing the output or the new graph', () => {
        const predict = steps.filter((s) => s.inside);
        expect(predict).toHaveLength(COMMANDS.length - 1);
        for (const s of predict) {
            const i = s.call!;
            expect(steps[s.seq + 1]).toMatchObject({ call: i, inside: false });
            expect(s.view.pending).toBe(true);
            expect(s.view.commits).toEqual(STATES[i].commits);
            expect(s.view.refs).toEqual(STATES[i].refs);
            expect(s.view.terminal[i].output).toBeUndefined();
            expect(s.view.fresh).toEqual([]);
            expect(s.view.topo).toEqual([]);
            expect(s.note).toBeUndefined();
        }
    });

    it('shows the prompt with the branch HEAD names', () => {
        const last = steps[steps.length - 1];
        expect(last.console[0]).toBe('~ $ mkdir gitexperiment && cd gitexperiment && git init');
        expect(last.console).toContain('~/gitexperiment (feat1) $ git commit --allow-empty -m "C"');
        expect(last.console).toContain('~/gitexperiment (main) $ git switch feat1');
        expect(last.console).toContain('~/gitexperiment (feat1) $ git switch main');
    });

    it('labels E as unreachable, only in the reflog, then dangling', () => {
        const label = (marker: string) => steps.find((s) => !s.inside && COMMANDS[s.call!].marker === marker)!.view.ghosts.E;
        expect(label('amend')).toBe('unreachable');
        expect(label('log')).toBe('unreachable');
        expect(label('reflog')).toBe('only in reflog');
        expect(label('fsck')).toBe('dangling');
    });

    it('notes what changed at the end of the line', () => {
        const note = (marker: string) => steps.find((s) => !s.inside && COMMANDS[s.call!].marker === marker)!.note;
        expect(note('a')).toBe('A ed8a842 · main → A');
        expect(note('branch')).toBe('feat1 → B');
        expect(note('switch')).toBe('HEAD → feat1');
        expect(note('log')).toBeUndefined();
    });
});
