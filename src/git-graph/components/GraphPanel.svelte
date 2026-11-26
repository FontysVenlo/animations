<script lang="ts">
    import type { Step } from '../model/index.ts';

    let { step }: { step: Step } = $props();

    const view = $derived(step.view);
    const s = $derived(view.stats);
    const list = (ids: readonly string[]) => (ids.length > 0 ? ids.join(', ') : '–');
    const width = $derived(Math.max(1, ...view.adjacency.map((l) => l.id.length)));
</script>

<div class="graph">
    <section>
        <h3>G = (V, E) as drawn</h3>
        <ul class="chips">
            <li>|V| = <b>{s.vertices}</b></li>
            <li>|E| = <b>{s.edges}</b></li>
            <li>roots <b>{list(s.roots)}</b></li>
            <li>merges <b>{list(s.merges)}</b></li>
            <li>forks <b>{list(s.forks)}</b></li>
            <li class:warn={s.unreachable.length > 0}>unreachable <b>{list(s.unreachable)}</b></li>
        </ul>
    </section>

    <section>
        <h3>Adjacency list (commit → parents)</h3>
        {#if view.adjacency.length === 0}
            <p class="nothing">(empty)</p>
        {:else}
            <ol class="adjacency">
                {#each view.adjacency as line (line.id)}
                    <li class:ghost={!line.reachable}>
                        {line.id.padEnd(width)} → {line.parents.length > 0 ? line.parents.join(', ') : '∅'}{#if !line.reachable}{'   '}(unreachable){/if}
                    </li>
                {/each}
            </ol>
        {/if}
    </section>
    {#if view.pending}
        <p class="hint">This is the graph before the command: predict what will change.</p>
    {/if}
</div>

<style>
    .graph {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px 24px;
        align-content: start;
        padding: 12px 16px;
    }

    h3 {
        margin: 0 0 6px;
        color: var(--text-muted);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .chips li {
        padding: 2px 10px;
        border: 1px solid var(--border-strong);
        border-radius: 999px;
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        font-variant-numeric: tabular-nums;
    }

    .chips li.warn {
        border-style: dashed;
        border-color: var(--text-faint);
    }

    .adjacency {
        margin: 0;
        padding: 8px 12px;
        border-radius: var(--radius-small);
        background: var(--surface-sunken);
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        list-style: none;
        white-space: pre;
    }

    .ghost {
        color: var(--text-faint);
    }

    .nothing,
    .hint {
        margin: 0;
        color: var(--text-faint);
        font-size: 0.8125rem;
    }

    .hint {
        grid-column: 1 / -1;
    }

    @media (max-width: 720px) {
        .graph {
            grid-template-columns: minmax(0, 1fr);
        }
    }
</style>
