<script lang="ts">
    import Rich from '../../lib/components/Rich.svelte';
    import type { Example, Step, Tone, TypeInfo } from '../model/index.ts';

    let { step, example }: { step: Step; example: Example } = $props();

    // The class diagram: a box per type, at the positions in hierarchy.ts (viewBox 900 × 600).
    const BOX_W = 250;
    const HEAD = 48;
    const ROW = 24;
    const PAD = 8;
    const heightOf = (t: TypeInfo) => HEAD + t.methods.length * ROW + PAD;

    const types = $derived(Object.values(example.types));
    const view = $derived(step.view);

    /** Just around the boxes (and the badges above them), so a narrow example isn't drawn small. */
    const bounds = $derived.by(() => {
        const x = Math.min(...types.map((t) => t.x)) - 12;
        const y = Math.min(...types.map((t) => t.y)) - 24;
        const right = Math.max(...types.map((t) => t.x + BOX_W)) + 12;
        const bottom = Math.max(...types.map((t) => t.y + heightOf(t))) + 6;
        return { x, y, width: right - x, height: bottom - y };
    });

    /** From the child to the parent: a line ending in a hollow triangle. */
    interface Edge {
        id: string;
        points: [number, number, number, number];
        realizes: boolean;
    }

    function edgePoints(child: TypeInfo, parent: TypeInfo): [number, number, number, number] {
        const ch = heightOf(child);
        const ph = heightOf(parent);
        if (parent.y + ph <= child.y - 10) {
            const cx = child.x + BOX_W / 2;
            const px = Math.min(Math.max(cx, parent.x + 20), parent.x + BOX_W - 20);
            return [cx, child.y, px, parent.y + ph];
        }
        return parent.x + BOX_W <= child.x
            ? [child.x, child.y + ch / 2, parent.x + BOX_W, parent.y + ph / 2]
            : [child.x + BOX_W, child.y + ch / 2, parent.x, parent.y + ph / 2];
    }

    const edges = $derived(
        types.flatMap((t): Edge[] => [
            ...(t.parent ? [{ id: `${t.name}-${t.parent}`, points: edgePoints(t, example.types[t.parent]), realizes: false }] : []),
            ...t.interfaces.map((i) => ({ id: `${t.name}-${i}`, points: edgePoints(t, example.types[i]), realizes: true })),
        ]),
    );

    const stereotype = (t: TypeInfo) => (t.kind === 'interface' ? '«interface»' : t.kind === 'abstract' ? '«abstract»' : '');

    const PHASES = { compile: 'Compile time', run: 'Runtime', error: 'Compile error', exception: 'Exception', done: 'Done' } as const;

    const TONES: Record<Tone, string> = { compile: 'var(--accent)', object: 'var(--compare)', found: 'var(--found)', error: 'var(--danger)' };
</script>

<div class="hierarchy">
    <div class="explain {view.phase}" aria-live="polite">
        <span class="phase">{PHASES[view.phase]}</span>
        <p><Rich text={view.explain} /></p>
    </div>

    <svg
        viewBox="{bounds.x} {bounds.y} {bounds.width} {bounds.height}"
        style:aspect-ratio="{bounds.width} / {bounds.height}"
        role="img"
        aria-label="Class diagram of the {example.title.toLowerCase()} example"
    >
        <defs>
            <marker id="hollow-triangle" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="16" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto">
                <path d="M0,0 L14,7 L0,14 z" class="arrowhead" />
            </marker>
        </defs>

        {#each edges as edge (edge.id)}
            {@const [x1, y1, x2, y2] = edge.points}
            <line {x1} {y1} {x2} {y2} class="edge" class:realizes={edge.realizes} marker-end="url(#hollow-triangle)" />
        {/each}

        {#each types as t (t.name)}
            {@const badge = view.badges[t.name]}
            {@const state = {
                dim: view.dim.includes(t.name),
                isa: view.isa.includes(t.name),
                scope: view.scope.includes(t.name),
                static: view.static === t.name,
                visited: view.visited.includes(t.name),
                lookup: view.lookup === t.name,
                found: view.found === t.name,
                error: view.error === t.name,
            }}
            <g
                class="box"
                class:dim={state.dim}
                class:isa={state.isa}
                class:scope={state.scope}
                class:static={state.static}
                class:visited={state.visited}
                class:lookup={state.lookup}
                class:found={state.found}
                class:error={state.error}
                transform="translate({t.x},{t.y})"
            >
                <rect class="frame" width={BOX_W} height={heightOf(t)} rx="6" />
                {#if stereotype(t)}
                    <text class="stereo" x={BOX_W / 2} y="16" text-anchor="middle">{stereotype(t)}</text>
                {/if}
                <text class="name" class:abstract={t.kind !== 'class'} x={BOX_W / 2} y={stereotype(t) ? 37 : 30} text-anchor="middle">{t.name}</text>
                <line class="divider" x1="0" x2={BOX_W} y1={HEAD - 4} y2={HEAD - 4} />
                {#each t.methods as m, i (m.name)}
                    {@const row = view.row?.type === t.name && view.row.method === m.name ? view.row.kind : undefined}
                    <g class="row" class:decl={row === 'decl'} class:hit={row === 'hit'}>
                        <rect x="3" y={HEAD + i * ROW - 1} width={BOX_W - 6} height={ROW} rx="3" />
                        <text x="10" y={HEAD + i * ROW + 16} class:abstract={m.abstract}>{m.sig}</text>
                    </g>
                {/each}
                {#if badge}
                    <text class="badge" x={BOX_W} y="-6" text-anchor="end" style:fill={TONES[badge.tone]}>{badge.text}</text>
                {/if}
            </g>
        {/each}
    </svg>

    <ul class="legend">
        <li><i class="swatch isa"></i>everything the object is</li>
        <li><i class="swatch scope"></i>compiler: static type and its supertypes</li>
        <li><i class="swatch lookup"></i>runtime: looking here now</li>
        <li><i class="swatch visited"></i>no implementation</li>
        <li><i class="swatch found"></i>implementation found</li>
    </ul>
</div>

<style>
    /*
     * Fills the panel: the explanation and the legend take what they need, the diagram the rest.
     * It is as large as the panel's width allows, and shrinks when the panel is lower.
     */
    .hierarchy {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 100%;
        min-height: 0;
        padding: 12px 16px 12px;
    }

    .explain,
    .legend {
        flex: none;
    }

    .explain {
        min-height: 4.6em;
        padding: 8px 12px;
        border-radius: var(--radius-small);
        background: var(--surface-sunken);
    }

    .explain p {
        display: inline;
        margin: 0;
        line-height: 1.55;
    }

    .phase {
        display: inline-block;
        margin-right: 8px;
        padding: 0 9px;
        border-radius: 999px;
        background: var(--border);
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 700;
        vertical-align: 1px;
    }

    .compile .phase {
        background: var(--accent-soft);
        color: var(--accent);
    }

    .run .phase {
        background: var(--compare-soft);
        color: var(--compare);
    }

    .error .phase,
    .exception .phase {
        background: var(--danger-soft);
        color: var(--danger);
    }

    .done .phase {
        background: var(--found-soft);
        color: var(--found);
    }

    svg {
        display: block;
        flex: 1 1 auto;
        width: 100%;
        height: auto;
        min-height: 200px;
    }

    /* Stacked on a small screen, the page scrolls: don't let a tall diagram fill all of it. */
    @media (max-width: 960px), (max-height: 600px) {
        svg {
            max-height: 75vh;
        }
    }

    .edge {
        fill: none;
        stroke: var(--text-faint);
        stroke-width: 1.6;
    }

    .edge.realizes {
        stroke-dasharray: 7 5;
    }

    .arrowhead {
        fill: var(--surface);
        stroke: var(--text-faint);
        stroke-width: 1.5;
    }

    .box {
        transition: opacity 0.25s;
    }

    .box .frame {
        fill: var(--surface);
        stroke: var(--border-strong);
        stroke-width: 1.5;
        transition:
            fill 0.25s,
            stroke 0.25s;
    }

    .box text {
        fill: var(--text);
        font-family: var(--font-mono);
    }

    .name {
        font-size: 17px;
        font-weight: 700;
    }

    .stereo {
        fill: var(--text-muted) !important;
        font-size: 12px;
    }

    .abstract {
        font-style: italic;
    }

    .divider {
        stroke: var(--border-strong);
    }

    .row text {
        font-size: 14px;
    }

    .row rect {
        fill: transparent;
        transition: fill 0.25s;
    }

    .row.decl rect {
        fill: var(--accent-soft);
    }

    .row.hit rect {
        fill: var(--found-soft);
    }

    .row.decl text,
    .row.hit text {
        font-weight: 700;
    }

    .badge {
        font-family: var(--font-sans) !important;
        font-size: 15px;
        font-weight: 700;
    }

    .box.dim {
        opacity: 0.3;
    }

    .box.isa .frame {
        stroke: var(--accent);
        stroke-dasharray: 6 4;
        stroke-width: 2.5;
    }

    .box.scope .frame {
        fill: var(--accent-soft);
        stroke: var(--accent);
        stroke-width: 3;
    }

    .box.static .frame {
        stroke-width: 4;
    }

    .box.visited .frame {
        fill: var(--surface-sunken);
        stroke: var(--text-faint);
        stroke-dasharray: 5 4;
    }

    .box.lookup .frame {
        fill: var(--compare-soft);
        stroke: var(--compare);
        stroke-dasharray: none;
        stroke-width: 4;
    }

    .box.found .frame {
        fill: var(--found-soft);
        stroke: var(--found);
        stroke-dasharray: none;
        stroke-width: 4;
    }

    .box.error .frame {
        fill: var(--danger-soft);
        stroke: var(--danger);
        stroke-dasharray: none;
        stroke-width: 4;
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
        width: 13px;
        height: 13px;
        margin-right: 6px;
        border: 2px solid;
        border-radius: 3px;
        vertical-align: -2px;
    }

    .swatch.isa {
        border-color: var(--accent);
        border-style: dashed;
    }

    .swatch.scope {
        border-color: var(--accent);
        background: var(--accent-soft);
    }

    .swatch.lookup {
        border-color: var(--compare);
        background: var(--compare-soft);
    }

    .swatch.visited {
        border-color: var(--text-faint);
        border-style: dashed;
        background: var(--surface-sunken);
    }

    .swatch.found {
        border-color: var(--found);
        background: var(--found-soft);
    }
</style>
