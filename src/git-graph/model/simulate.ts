import type { CodeFile } from '../../lib/code.ts';
import { lineOf } from '../../lib/lines.ts';
import type { BaseStep, CallStart } from '../../lib/trace.ts';
import { type AdjacencyLine, EMPTY, type State, type Stats, adjacency, reachable, stats } from './graph.ts';
import { COMMANDS, type Command, type Commit, REFS, type Ref, SCRIPT, SCRIPT_NAME, commandText, predictQuestion } from './history.ts';

// Replays the commands, one or two steps each:
// - in predict mode, first a step where the command is typed but hasn't run: the graph still shows
//   the state before it, and the explanation asks what will change (`inside`, hidden otherwise);
// - then the step where it has run: its output, the new graph and the explanation.

export type FileId = 'script';

/** One command in the terminal. */
export interface TerminalBlock {
    /** The prompt's directory and the branch it shows (none before the repository exists). */
    readonly path: string;
    readonly branch?: Ref;
    readonly command: string;
    /** What it printed; undefined while it hasn't run (predict mode). */
    readonly output?: readonly string[];
}

export interface View {
    /** Predict mode: the command is typed, the graph doesn't show it yet. */
    readonly pending: boolean;
    readonly title: string;
    readonly git: string;
    readonly theory: string;
    readonly predict: string;
    /** The graph as shown. */
    readonly commits: readonly Commit[];
    readonly refs: Readonly<Record<Ref, string | null>>;
    readonly head: Ref;
    /** Added by this command. */
    readonly fresh: readonly string[];
    readonly reachable: readonly string[];
    readonly focus: readonly string[];
    /** The order the command printed the commits in. */
    readonly topo: readonly string[];
    /** The label under each unreachable commit. */
    readonly ghosts: Readonly<Record<string, string>>;
    readonly stats: Stats;
    readonly adjacency: readonly AdjacencyLine[];
    readonly terminal: readonly TerminalBlock[];
}

export interface Step extends BaseStep<FileId> {
    readonly view: View;
}

export interface Trace {
    readonly steps: readonly Step[];
    /** Each command, for ↑ and ↓. */
    readonly calls: readonly CallStart[];
    readonly files: readonly CodeFile[];
}

export const FILES: readonly CodeFile[] = [{ id: 'script', name: SCRIPT_NAME, source: SCRIPT.text, language: 'shell', weight: 1 }];

/** The repository after a command. */
export function apply(state: State, command: Command): State {
    const lanes = command.lanes ?? {};
    const commits = [...state.commits, ...(command.add ? [command.add] : [])].map((c) => (c.id in lanes ? { ...c, lane: lanes[c.id] } : c));
    return { commits, refs: { ...state.refs, ...command.refs }, head: command.head ?? state.head };
}

/** The states before the first command and after each one. */
export const STATES: readonly State[] = COMMANDS.reduce<State[]>((states, c) => [...states, apply(states[states.length - 1], c)], [EMPTY]);

/** What changed, at the end of the command's line. */
export function changes(command: Command): string | undefined {
    const parts = [
        ...(command.add ? [`${command.add.id} ${command.add.hash}`] : []),
        ...REFS.filter((r) => command.refs?.[r]).map((r) => `${r} → ${command.refs![r]}`),
        ...(command.head ? [`HEAD → ${command.head}`] : []),
    ];
    return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** The prompt before command `i`: the directory, and the branch once there is a repository. */
const blockStart = (i: number): Pick<TerminalBlock, 'path' | 'branch'> => (i === 0 ? { path: '~' } : { path: '~/gitexperiment', branch: STATES[i].head });

export const promptText = (block: Pick<TerminalBlock, 'path' | 'branch'>): string => `${block.path}${block.branch ? ` (${block.branch})` : ''} $`;

/** The prompt waiting for the next command after command `i`. */
export const promptAfter = (i: number): Pick<TerminalBlock, 'path' | 'branch'> => ({ path: '~/gitexperiment', branch: STATES[i + 1].head });

function terminal(i: number, ran: boolean): TerminalBlock[] {
    return COMMANDS.slice(0, i + 1).map((c, j) => ({
        ...blockStart(j),
        command: commandText(c),
        output: j < i || ran ? c.output : undefined,
    }));
}

const flatten = (blocks: readonly TerminalBlock[]): string[] => blocks.flatMap((b) => [`${promptText(b)} ${b.command}`, ...(b.output ?? [])]);

function view(i: number, pending: boolean): View {
    const command = COMMANDS[i];
    const state = STATES[pending ? i : i + 1];
    const seen = reachable(state);
    const focus = pending ? [] : (command.focus ?? []);
    const unreachable = state.commits.filter((c) => !seen.has(c.id)).map((c) => c.id);
    return {
        pending,
        title: command.title,
        git: command.git,
        theory: command.theory,
        predict: predictQuestion(command),
        commits: state.commits,
        refs: state.refs,
        head: state.head,
        fresh: pending || !command.add ? [] : [command.add.id],
        reachable: [...seen],
        focus,
        topo: pending ? [] : (command.topo ?? []),
        ghosts: Object.fromEntries(unreachable.map((id) => [id, focus.includes(id) && command.ghostLabel ? command.ghostLabel : 'unreachable'])),
        stats: stats(state),
        adjacency: adjacency(state),
        terminal: terminal(i, !pending),
    };
}

export function simulate(): Trace {
    const steps: Step[] = [];
    const calls: CallStart[] = [];
    COMMANDS.forEach((command, i) => {
        const line = lineOf(SCRIPT, command.marker);
        const text = commandText(command);
        const frames = [{ id: 0, file: 'script' as const, label: SCRIPT_NAME, line, vars: [] }];
        const push = (pending: boolean) => {
            const v = view(i, pending);
            steps.push({
                seq: steps.length,
                file: 'script',
                line,
                note: pending ? undefined : changes(command),
                status: pending ? 'predict' : 'ran',
                frames,
                console: flatten(v.terminal),
                narration: [text, pending ? 'Predict: what will happen?' : command.title],
                inside: pending,
                call: i,
                done: false,
                view: v,
            });
        };
        calls.push({ firstSeq: steps.length });
        // Nothing to predict about the empty repository.
        if (i > 0) push(true);
        push(false);
    });
    steps[steps.length - 1] = { ...steps[steps.length - 1], done: true };
    return { steps, calls, files: FILES };
}

/** There is only one run. */
export const TRACE = simulate();
