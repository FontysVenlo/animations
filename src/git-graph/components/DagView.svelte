<script lang="ts">
    import { untrack } from 'svelte';
    import { type Commit, REFS, type Ref, type Step, type View, children, reach } from '../model/index.ts';

    let {
        step,
        animate,
        selected,
        onselect,
    }: {
        step: Step;
        /** A single step: move the commits and labels instead of redrawing at once. */
        animate: boolean;
        selected: string | undefined;
        onselect: (id: string | undefined) => void;
    } = $props();

    const view = $derived(step.view);

    // The diagram: commits left to right in time, main's lane on top. A fixed viewBox, so nothing
    // jumps while the history grows.
    const WIDTH = 760;
    const HEIGHT = 330;
    const LANE_Y = [130, 222];
    const X0 = 70;
    const DX = 118;
    const R = 22;

    interface Pos {
        x: number;
        y: number;
        /** Opacity, for fading in and out. */
        a: number;
    }

    type Label = Ref | 'HEAD';

    /** Where every commit and label goes: a branch above (main) or below (feat1) its commit, HEAD beyond it. */
    function targets(v: View): Record<string, Pos> {
        const t: Record<string, Pos> = {};
        for (const c of v.commits) t[c.id] = { x: X0 + c.col * DX, y: LANE_Y[c.lane], a: 1 };
        for (const ref of REFS) {
            const at = v.refs[ref];
            if (!at) continue;
            const p = t[at];
            const up = ref === 'main';
            t[`ref:${ref}`] = { x: p.x, y: p.y + (up ? -50 : 62), a: 1 };
            if (v.head === ref) t['ref:HEAD'] = { x: p.x, y: p.y + (up ? -82 : 94), a: 1 };
        }
        return t;
    }

    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // What is drawn now: on a single step it eases from where things were to their new place.
    let shown = $state.raw<Record<string, Pos>>({});

    $effect(() => {
        const to = targets(view);
        if (!animate || reduced) {
            shown = to;
            return;
        }
        const from: Record<string, Pos> = {};
        const goal: Record<string, Pos> = { ...to };
        const now = untrack(() => shown);
        for (const k of new Set([...Object.keys(now), ...Object.keys(to)])) from[k] = now[k] ?? { ...to[k], a: 0 };
        for (const k of Object.keys(from)) goal[k] ??= { ...from[k], a: 0 };
        const start = performance.now();
        let frame = requestAnimationFrame(function tick(time) {
            const k = Math.min(1, (time - start) / 520);
            const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
            if (k >= 1) {
                shown = to;
                return;
            }
            const next: Record<string, Pos> = {};
            for (const [id, g] of Object.entries(goal)) {
                const f = from[id];
                next[id] = { x: f.x + (g.x - f.x) * e, y: f.y + (g.y - f.y) * e, a: f.a + (g.a - f.a) * e };
            }
            shown = next;
            frame = requestAnimationFrame(tick);
        });
        return () => cancelAnimationFrame(frame);
    });

    const at = (id: string): Pos | undefined => shown[id];

    const reachable = $derived(new Set(view.reachable));
    const byId = $derived(new Map(view.commits.map((c) => [c.id, c])));
    const fresh = $derived(new Set(view.fresh));

    /** The clicked commit, while it is in the graph shown, and what it reaches. */
    const sel = $derived(selected && byId.has(selected) ? byId.get(selected) : undefined);
    const ancestors = $derived(sel ? reach(view.commits, [sel.id]) : undefined);
    const dim = (id: string) => (ancestors && !ancestors.has(id) ? 0.22 : 1);

    type Tone = 'main' | 'feat' | 'ghost';
    const tone = (c: Commit): Tone => (!reachable.has(c.id) ? 'ghost' : c.branch === 'feat' ? 'feat' : 'main');
    const COLOUR: Record<Tone, string> = { main: 'var(--accent)', feat: 'var(--compare)', ghost: 'var(--text-faint)' };

    interface Edge {
        id: string;
        d: string;
        tone: Tone;
        fresh: boolean;
        opacity: number;
        /** "parent 1" / "parent 2" on a merge's edges. */
        label?: { x: number; y: number; text: string };
    }

    const edges = $derived.by((): Edge[] =>
        view.commits.flatMap((c) =>
            c.parents.flatMap((pid, i): Edge[] => {
                const a = at(c.id);
                const b = at(pid);
                const parent = byId.get(pid);
                if (!a || !b || !parent) return [];
                const ghost = !reachable.has(c.id);
                const t: Tone = ghost ? 'ghost' : c.branch === 'feat' || parent.branch === 'feat' ? 'feat' : 'main';
                const [x1, y1, x2, y2] = [a.x - R, a.y, b.x + R + 2, b.y];
                const mx = (x1 + x2) / 2;
                // To another lane: an S-curve, or over more than one column (the merge's second
                // parent) a bend next to the child and then along the lane, clear of the commits between.
                const bend = x1 - x2 > DX ? x1 - DX * 0.8 : x2;
                const d =
                    Math.abs(y1 - y2) < 1
                        ? `M${x1},${y1} L${x2},${y2}`
                        : bend > x2
                          ? `M${x1},${y1} C${(x1 + bend) / 2},${y1} ${(x1 + bend) / 2},${y2} ${bend},${y2} L${x2},${y2}`
                          : `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
                const label =
                    c.parents.length > 1
                        ? i === 0 || Math.abs(y1 - y2) < 1
                            ? { x: mx, y: y1 - 8, text: `parent ${i + 1}` }
                            : { x: (bend + x2) / 2, y: y2 - 8, text: `parent ${i + 1}` }
                        : undefined;
                return [{ id: `${c.id}-${pid}`, d, tone: t, fresh: fresh.has(c.id) && !ghost, opacity: Math.min(a.a, b.a) * Math.min(dim(c.id), dim(pid)), label }];
            }),
        ),
    );

    const labels = $derived(
        (['main', 'feat1', 'HEAD'] as Label[]).flatMap((name) => {
            const p = at(`ref:${name}`);
            if (!p) return [];
            const head = name === 'HEAD';
            const up = name === 'main' || (head && view.head === 'main');
            const w = name.length * 8.4 + 18;
            const h = 22;
            // The line to what it names: a branch to its commit, HEAD to its branch.
            const to = head ? (up ? p.y + 32 - h / 2 : p.y - 32 + h / 2) : up ? p.y + 50 - R : p.y - 62 + R + 20;
            const from = up ? p.y + h / 2 : p.y - h / 2;
            const colour = head ? 'var(--text)' : name === 'main' ? 'var(--accent)' : 'var(--compare)';
            return [{ name, ...p, head, w, h, from, to, colour }];
        }),
    );

    function onkey(event: KeyboardEvent, id: string) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        // Not also play or pause.
        event.preventDefault();
        event.stopPropagation();
        onselect(id);
    }

    const info = $derived.by(() => {
        if (!sel || !ancestors) return undefined;
        const kids = children(view.commits, sel.id);
        const reached = view.commits.filter((c) => ancestors.has(c.id)).sort((a, b) => b.col - a.col || a.lane - b.lane);
        return { kids, reached: reached.map((c) => c.id) };
    });
</script>

<div class="dag">
    <div class="stage" class:pending={view.pending}>
        <svg viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="The commit graph">
            <defs>
                {#each Object.entries(COLOUR) as [name, colour] (name)}
                    <marker id="arrow-{name}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill={colour} />
                    </marker>
                {/each}
            </defs>

            {#if view.commits.length === 0}
                <text class="empty big" x={WIDTH / 2} y="150" text-anchor="middle">V = ∅   E = ∅</text>
                <text class="empty" x={WIDTH / 2} y="180" text-anchor="middle">HEAD → main (no commits yet)</text>
            {/if}

            {#each edges as edge (edge.id)}
                <path
                    d={edge.d}
                    fill="none"
                    stroke={COLOUR[edge.tone]}
                    stroke-width={edge.fresh ? 3.5 : 2.5}
                    stroke-dasharray={edge.tone === 'ghost' ? '5 4' : undefined}
                    marker-end="url(#arrow-{edge.tone})"
                    opacity={edge.opacity}
                />
                {#if edge.label}
                    <text class="parent" x={edge.label.x} y={edge.label.y} text-anchor="middle" opacity={edge.opacity}>{edge.label.text}</text>
                {/if}
            {/each}

            {#each view.commits as c (c.id)}
                {@const p = at(c.id)}
                {#if p}
                    {@const t = tone(c)}
                    {@const ring = view.focus.includes(c.id) || sel?.id === c.id}
                    {@const topo = view.topo.indexOf(c.id)}
                    <g
                        class="commit"
                        class:ghost={t === 'ghost'}
                        transform="translate({p.x},{p.y})"
                        opacity={p.a * dim(c.id)}
                        role="button"
                        tabindex="0"
                        aria-label="Commit {c.id} ({c.hash}): show what it reaches"
                        aria-pressed={sel?.id === c.id}
                        onclick={() => onselect(c.id)}
                        onkeydown={(e) => onkey(e, c.id)}
                    >
                        {#if fresh.has(c.id) || ring}
                            <circle r={R + 7} fill="none" stroke={ring ? 'var(--text)' : COLOUR[t]} stroke-width="2" opacity="0.55" />
                        {/if}
                        <circle class="node" r={R} fill={t === 'ghost' ? 'var(--surface)' : COLOUR[t]} stroke={COLOUR[t]} />
                        <text class="name" class:long={c.id.length > 1} y={c.id.length > 1 ? 5 : 6} text-anchor="middle" fill={t === 'ghost' ? 'var(--text-muted)' : 'var(--on-accent)'}
                            >{c.id}</text
                        >
                        <text class="hash" y={R + 17} text-anchor="middle">{c.hash}</text>
                        {#if t === 'ghost'}
                            <text class="ghost-label" y={R + 32} text-anchor="middle">{view.ghosts[c.id]}</text>
                        {/if}
                        {#if topo >= 0}
                            <g transform="translate({R - 2},{-R + 2})">
                                <circle r="10" fill="var(--text)" />
                                <text class="topo" y="4" text-anchor="middle">{topo + 1}</text>
                            </g>
                        {/if}
                    </g>
                {/if}
            {/each}

            {#each labels as l (l.name)}
                <g class="label" opacity={l.a}>
                    <line x1={l.x} y1={l.from} x2={l.x} y2={l.to} stroke={l.colour} stroke-width="1.5" stroke-dasharray={l.head ? '3 3' : undefined} />
                    <rect x={l.x - l.w / 2} y={l.y - l.h / 2} width={l.w} height={l.h} rx={l.head ? 4 : 11} fill={l.head ? 'var(--text)' : 'var(--surface)'} stroke={l.colour} stroke-width="1.5" />
                    <text x={l.x} y={l.y + 4.5} text-anchor="middle" fill={l.head ? 'var(--surface)' : l.colour}>{l.name}</text>
                </g>
            {/each}
        </svg>
    </div>

    <div class="foot">
        {#if sel && info}
            <p class="selection">
                <strong>{sel.id}</strong> <code>{sel.hash}</code> “{sel.message}” · out-degree {sel.parents.length} · in-degree {info.kids.length}{info.kids.length > 0
                    ? ` (${info.kids.join(', ')})`
                    : ''} · reaches {'{'}{info.reached.join(', ')}{'}'}: exactly what <code>git log {sel.hash}</code> prints.
            </p>
        {:else}
            <p class="hint">
                {view.pending ? "The graph doesn't show this command yet." : view.commits.length > 0 ? 'Click a commit to see what it can reach.' : ''}
            </p>
        {/if}
        <ul class="legend">
            <li><i class="swatch main"></i>commit on main</li>
            <li><i class="swatch feat"></i>commit on feat1</li>
            <li><i class="swatch ghost"></i>exists, but no branch reaches it</li>
        </ul>
    </div>
</div>

<style>
    /*
     * Fills the panel: the foot takes what it needs, the diagram the rest.
     * It is as large as the panel's width allows, and shrinks when the panel is lower.
     */
    .dag {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 100%;
        min-height: 0;
        padding: 12px 16px;
    }

    .foot {
        flex: none;
    }

    .stage {
        display: flex;
        flex: 1 1 auto;
        min-height: 200px;
        /* Leaves the terminal room for log's and reflog's output. */
        max-height: 40vh;
        aspect-ratio: 760 / 330;
        border: 2px solid var(--border);
        border-radius: var(--radius-small);
        /* Graph paper. */
        background-color: var(--surface);
        background-image:
            linear-gradient(var(--surface-sunken) 1px, transparent 1px), linear-gradient(90deg, var(--surface-sunken) 1px, transparent 1px);
        background-size: 24px 24px;
    }

    .stage.pending {
        border-color: var(--compare);
        border-style: dashed;
    }

    svg {
        display: block;
        width: 100%;
        height: 100%;
    }

    .commit {
        cursor: pointer;
        outline: none;
    }

    .commit:focus-visible .node {
        stroke: var(--text);
        stroke-width: 3;
    }

    .node {
        stroke-width: 2.5;
    }

    .ghost .node {
        stroke-dasharray: 5 4;
    }

    .name {
        font-family: var(--font-sans);
        font-size: 18px;
        font-weight: 700;
    }

    .name.long {
        font-size: 15px;
    }

    .hash,
    .parent,
    .topo,
    .label text,
    .empty {
        font-family: var(--font-mono);
    }

    .hash {
        fill: var(--text-muted);
        font-size: 11px;
    }

    .ghost-label {
        fill: var(--text-faint);
        font-size: 11px;
        font-style: italic;
    }

    .parent {
        fill: var(--text-muted);
        font-size: 10px;
    }

    .topo {
        fill: var(--surface);
        font-size: 11px;
        font-weight: 600;
    }

    .label text {
        font-size: 12.5px;
        font-weight: 600;
    }

    .empty {
        fill: var(--text-muted);
        font-size: 13px;
    }

    .empty.big {
        font-family: var(--font-sans);
        font-size: 22px;
        white-space: pre;
    }

    .foot {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        justify-content: space-between;
        gap: 4px 16px;
        font-size: 0.8125rem;
    }

    .selection,
    .hint {
        margin: 0;
    }

    .hint {
        color: var(--text-muted);
    }

    .selection code {
        padding: 0 4px;
        border-radius: 4px;
        background: var(--surface-sunken);
        font-family: var(--font-mono);
        font-size: 0.9em;
    }

    .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 16px;
        margin: 0;
        padding: 0;
        color: var(--text-muted);
        font-size: 0.75rem;
        list-style: none;
    }

    .swatch {
        display: inline-block;
        width: 11px;
        height: 11px;
        margin-right: 6px;
        border: 2px solid;
        border-radius: 50%;
        vertical-align: -1px;
    }

    .swatch.main {
        border-color: var(--accent);
        background: var(--accent);
    }

    .swatch.feat {
        border-color: var(--compare);
        background: var(--compare);
    }

    .swatch.ghost {
        border-color: var(--text-faint);
        border-style: dashed;
    }

    /* Stacked on a small screen, the page scrolls: don't let the diagram fill all of it. */
    @media (max-width: 960px), (max-height: 600px) {
        .stage {
            max-height: 75vh;
        }
    }
</style>
