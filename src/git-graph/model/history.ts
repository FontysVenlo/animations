import scriptRaw from '../../../code/git-graph/gitexperiment.sh?raw';
import { lineOf, parseSource } from '../../lib/lines.ts';

// The git session students replay: one command per line of code/git-graph/gitexperiment.sh. The
// outputs and hashes are what git prints for it with a fixed author and dates (see git.test.ts,
// which runs the commands and checks every line and every hash). Based on a colleague's replay.

export const SCRIPT = parseSource(scriptRaw);
export const SCRIPT_NAME = 'gitexperiment.sh';

export type Ref = 'main' | 'feat1';
export const REFS: readonly Ref[] = ['main', 'feat1'];

/** The branch a commit was made on, which sets its colour. */
export type Branch = 'main' | 'feat';

export interface Commit {
    /** Its name in the explanations (A, B, …, M for the merge, EE for the amended E). */
    readonly id: string;
    /** The short hash git prints. */
    readonly hash: string;
    readonly message: string;
    /** Commit ids, first parent first. */
    readonly parents: readonly string[];
    readonly branch: Branch;
    /** Column (in time order) and lane (0: main's row, 1: the row below) in the diagram. */
    readonly col: number;
    readonly lane: 0 | 1;
}

export interface Command {
    /** Its marker in gitexperiment.sh. */
    readonly marker: string;
    /** What git prints. */
    readonly output: readonly string[];
    readonly title: string;
    /** "What git does" and "In graph terms" (with `code`, **bold** and *italic*). */
    readonly git: string;
    readonly theory: string;
    /** The new commit, if any. */
    readonly add?: Commit;
    /** Branches that move, to a commit id. */
    readonly refs?: Partial<Record<Ref, string>>;
    /** The branch HEAD names afterwards, when it changes. */
    readonly head?: Ref;
    /** Commits that move to another lane. */
    readonly lanes?: Readonly<Record<string, 0 | 1>>;
    /** The order in which the command prints the commits (log). */
    readonly topo?: readonly string[];
    /** Commits to ring. */
    readonly focus?: readonly string[];
    /** How to label an unreachable commit in focus. */
    readonly ghostLabel?: string;
    /** In predict mode, the question before the command runs. */
    readonly predict?: string;
}

const PREDICT_CHANGE = 'Which vertices and edges will this command add? Where will the branch labels and HEAD point?';
const PREDICT_READ = 'Does this command change the graph? What will it print?';

const commit = (id: string, hash: string, parents: string[], branch: Branch, col: number, lane: 0 | 1 = 0, message = id): Commit => ({
    id,
    hash,
    message,
    parents,
    branch,
    col,
    lane,
});

export const COMMANDS: readonly Command[] = [
    {
        marker: 'init',
        output: ['Initialized empty Git repository in /home/student/gitexperiment/.git/'],
        title: 'An empty repository',
        git: '`git init` creates the `.git` object store. HEAD already names `main`, but `main` does not exist yet: there is no commit for it to point at.',
        theory: 'The graph is empty: V = ∅ and E = ∅.',
        head: 'main',
    },
    {
        marker: 'a',
        output: ['[main (root-commit) ed8a842] A'],
        title: 'The first commit',
        git: '`--allow-empty` lets us commit without any files, because we only care about the shape of the history. Branch `main` is created and points at A.',
        theory: 'One vertex, no edges. A has no parent, so its out-degree is 0: A is the **root**. Every later commit will have a path to A.',
        add: commit('A', 'ed8a842', [], 'main', 0),
        refs: { main: 'A' },
    },
    {
        marker: 'b',
        output: ['[main db350be] B'],
        title: 'Adding an edge',
        git: 'Commit B records A as its parent. `main` moves forward to B. A itself does not change: commits are immutable.',
        theory: 'New edge B → A. Edges point from child to parent. A commit knows where it came from, never what comes after it.',
        add: commit('B', 'db350be', ['A'], 'main', 1),
        refs: { main: 'B' },
    },
    {
        marker: 'branch',
        output: ["Switched to a new branch 'feat1'"],
        title: 'A branch is only a label',
        git: 'Creating `feat1` copies nothing. It is a second name for commit B. HEAD now points at `feat1`, so the next commit will move `feat1`.',
        theory: 'V and E are unchanged. Branches are not part of the graph. They are named entry points into it.',
        refs: { feat1: 'B' },
        head: 'feat1',
    },
    {
        marker: 'c',
        output: ['[feat1 a2861c9] C'],
        title: 'Committing on the branch',
        git: 'C gets parent B. Only `feat1` moves; `main` still points at B.',
        theory: 'New edge C → B. The graph is still a simple path: A ← B ← C.',
        add: commit('C', 'a2861c9', ['B'], 'feat', 2, 1),
        refs: { feat1: 'C' },
    },
    {
        marker: 'checkout',
        output: ["Switched to branch 'main'"],
        title: 'Switching back',
        git: "HEAD moves back to `main`. C still exists, it just isn't in main's history.",
        theory: 'Nothing changes in the graph. Starting from `main` you can reach {B, A}. Starting from `feat1` you can reach {C, B, A}.',
        head: 'main',
    },
    {
        marker: 'd',
        output: ['[main 3c73ac8] D'],
        title: 'History diverges',
        git: 'D is committed on `main` with parent B. Now `main` and `feat1` each have a commit the other lacks.',
        theory: 'B now has in-degree 2: two commits name it as parent. That makes B a **fork point**. Up to here the graph is still a tree.',
        add: commit('D', '3c73ac8', ['B'], 'main', 3),
        refs: { main: 'D' },
    },
    {
        marker: 'merge',
        output: ["Merge made by the 'ort' strategy."],
        title: 'A merge: two parents',
        git:
            "`git merge` creates merge commit M with two parents: D, where `main` was, and C, the tip of `feat1`. In a terminal, git first opens your editor with the message “Merge branch 'feat1'”: save and close it to accept. " +
            '`main` moves to M; `feat1` stays on C.',
        theory:
            'M has out-degree 2. There are now two different paths from M to B (via D and via C), so the graph is no longer a tree. ' +
            'Yet following the arrows you can never return to where you started. That makes it a **directed acyclic graph**.',
        add: commit('M', 'db4f257', ['D', 'C'], 'main', 4, 0, "Merge branch 'feat1'"),
        refs: { main: 'M' },
    },
    {
        marker: 'e',
        output: ['[main 2966420] E'],
        title: 'Why cycles are impossible',
        git: 'Another ordinary commit on `main`.',
        theory:
            "A commit's hash is computed over its content, *including its parents' hashes*. So a commit can only point at commits that already exist. " +
            'You cannot draw an edge to the future, and therefore you can never close a cycle.',
        add: commit('E', '2966420', ['M'], 'main', 5),
        refs: { main: 'E' },
    },
    {
        marker: 'amend',
        output: ['[main 79295b0] EE', ' Date: Fri Nov 21 10:48:00 2025 +0100'],
        title: 'Amend makes a new vertex',
        git:
            'Commits are immutable, so `--amend` cannot edit E. It creates a new commit EE with the same parent (M) and moves `main` to it. E is left behind. ' +
            "(The `Date:` line is E's author date, which EE keeps.)",
        theory:
            "E is still a vertex in the object store, and its edge E → M still exists too, because E itself stores its parent's hash. " +
            'But no branch can reach E. It is **unreachable**, so `git log` will not show it. Garbage collection eventually deletes unreachable vertices.',
        add: commit('EE', '79295b0', ['M'], 'main', 5),
        refs: { main: 'EE' },
        lanes: { E: 1 },
    },
    {
        marker: 'log',
        output: [
            '* 79295b0 (HEAD -> main) EE',
            "*   db4f257 Merge branch 'feat1'",
            '|\\  ',
            '| * a2861c9 (feat1) C',
            '* | 3c73ac8 D',
            '|/  ',
            '* db350be B',
            '* ed8a842 A',
        ],
        title: 'git log is a graph traversal',
        git: '`git log --all` starts at every branch and walks the parent edges. E is missing because no branch reaches it.',
        theory: 'The output order is a **topological sort**: every commit is printed before its parents. The numbers on the vertices show the order in which log printed them.',
        topo: ['EE', 'M', 'C', 'D', 'B', 'A'],
        predict: PREDICT_READ,
    },
    {
        marker: 'reflog',
        output: [
            '79295b0 (HEAD -> main) HEAD@{0}: commit (amend): EE',
            '2966420 HEAD@{1}: commit: E',
            "db4f257 HEAD@{2}: merge feat1: Merge made by the 'ort' strategy.",
            '3c73ac8 HEAD@{3}: commit: D',
            'db350be HEAD@{4}: checkout: moving from feat1 to main',
            'a2861c9 (feat1) HEAD@{5}: commit: C',
            'db350be HEAD@{6}: checkout: moving from main to feat1',
            'db350be HEAD@{7}: commit: B',
            'ed8a842 HEAD@{8}: commit (initial): A',
        ],
        title: 'The reflog still knows E',
        git: 'The reflog lists every commit HEAD has pointed at. It still mentions `2966420`, so you can get E back with `git branch rescue 2966420`.',
        theory: "The reflog acts as an extra set of starting points for reachability. While E's reflog entry exists (30 days by default for unreachable commits), garbage collection keeps it.",
        focus: ['E'],
        ghostLabel: 'only in reflog',
        predict: PREDICT_READ,
    },
    {
        marker: 'fsck',
        output: [
            'Checking ref database: 100% (1/1), done.',
            'Checking object directories: 100% (256/256), done.',
            'unreachable commit 2966420f7847002a61b6e3afde46b132f6e2436f',
        ],
        title: 'Finding the zombie commits',
        git:
            '`git fsck` checks the whole object store. Without `--no-reflogs` it finds nothing unreachable here, because it counts reflog entries as roots, so E still looks reachable. With the flag, E shows up. ' +
            '`--dangling` lists only unreachable commits that no other unreachable commit points at, and `--lost-found` also copies them to `.git/lost-found`.',
        theory:
            'fsck is a reachability search over the whole graph: mark everything reachable from the roots (branches, tags, HEAD and optionally the reflog), then list what is left unmarked, V ∖ reachable. ' +
            'This is the same mark phase that `git gc` uses before it deletes anything.',
        focus: ['E'],
        ghostLabel: 'dangling',
        predict: PREDICT_READ,
    },
];

/** The command as typed: its line in the script. */
export const commandText = (command: Command): string => SCRIPT.text.split('\n')[lineOf(SCRIPT, command.marker) - 1];

export const predictQuestion = (command: Command): string => command.predict ?? PREDICT_CHANGE;
