import { type Commit, REFS, type Ref } from './history.ts';

// The repository as a graph G = (V, E): the commits are the vertices, and each commit has an edge
// to each of its parents.

export interface State {
    /** Every commit in the object store, reachable or not, in the order they were made. */
    readonly commits: readonly Commit[];
    readonly refs: Readonly<Record<Ref, string | null>>;
    readonly head: Ref;
}

export const EMPTY: State = { commits: [], refs: { main: null, feat1: null }, head: 'main' };

const byId = (commits: readonly Commit[]) => new Map(commits.map((c) => [c.id, c]));

/** Every commit you can reach from `starts` by following parent edges, the starts included. */
export function reach(commits: readonly Commit[], starts: readonly (string | null)[]): Set<string> {
    const map = byId(commits);
    const seen = new Set<string>();
    const stack = starts.filter((s): s is string => s !== null);
    while (stack.length > 0) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        stack.push(...(map.get(id)?.parents ?? []));
    }
    return seen;
}

/** What `git log --all` can see: everything reachable from a branch. */
export const reachable = (state: State): Set<string> => reach(state.commits, REFS.map((r) => state.refs[r]));

/** The commits that name `id` as a parent. */
export const children = (commits: readonly Commit[], id: string): string[] => commits.filter((c) => c.parents.includes(id)).map((c) => c.id);

export interface Stats {
    readonly vertices: number;
    readonly edges: number;
    /** No parents (out-degree 0). */
    readonly roots: readonly string[];
    /** More than one parent. */
    readonly merges: readonly string[];
    /** More than one child (in-degree > 1). */
    readonly forks: readonly string[];
    readonly unreachable: readonly string[];
}

export function stats(state: State): Stats {
    const { commits } = state;
    const seen = reachable(state);
    return {
        vertices: commits.length,
        edges: commits.reduce((n, c) => n + c.parents.length, 0),
        roots: commits.filter((c) => c.parents.length === 0).map((c) => c.id),
        merges: commits.filter((c) => c.parents.length > 1).map((c) => c.id),
        forks: commits.filter((c) => children(commits, c.id).length > 1).map((c) => c.id),
        unreachable: commits.filter((c) => !seen.has(c.id)).map((c) => c.id),
    };
}

export interface AdjacencyLine {
    readonly id: string;
    readonly parents: readonly string[];
    readonly reachable: boolean;
}

/** Commit → parents, newest (rightmost) first. */
export function adjacency(state: State): AdjacencyLine[] {
    const seen = reachable(state);
    return [...state.commits]
        .sort((a, b) => b.col - a.col || a.lane - b.lane)
        .map((c) => ({ id: c.id, parents: c.parents, reachable: seen.has(c.id) }));
}

/** A topological order: every commit comes before its parents. */
export function isTopological(commits: readonly Commit[], order: readonly string[]): boolean {
    const position = new Map(order.map((id, i) => [id, i]));
    return commits.every((c) => !position.has(c.id) || c.parents.every((p) => !position.has(p) || position.get(p)! > position.get(c.id)!));
}
