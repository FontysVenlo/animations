<script lang="ts">
    import type { Step, Trace } from '../model/index.ts';

    let { step, trace, onselect }: { step: Step; trace: Trace; onselect: (call: number) => void } = $props();

    /** Calls appear as the run reaches them; what they return once they have. */
    const rows = $derived(
        trace.calls
            .map((call, i) => ({ ...call, i, running: step.call === i, found: step.seq >= call.foundSeq, returned: step.seq > call.lastSeq }))
            .filter((row) => row.firstSeq <= step.seq),
    );

    let body = $state<HTMLTableSectionElement>();

    $effect(() => {
        if (rows.length === 0) return;
        body?.querySelector('tr.running, tr:last-child')?.scrollIntoView({ block: 'nearest' });
    });
</script>

<div class="lookups">
    {#if trace.outcome === 'compile-error'}
        <p class="nothing">No method runs: the code does not compile.</p>
    {:else if trace.calls.length === 0}
        <p class="nothing">A cast calls no method: Java only checks the object's type.</p>
    {/if}
    {#if trace.calls.length > 0}
        <table>
            <thead>
                <tr>
                    <th scope="col">Call</th>
                    <th scope="col" title="The type the compiler checked">Static type</th>
                    <th scope="col" title="Where the compiler found the method">Declared in</th>
                    <th scope="col" title="Where the lookup started">Looked up from</th>
                    <th scope="col" title="The implementation that ran">Ran</th>
                    <th scope="col">Returned</th>
                </tr>
            </thead>
            <tbody bind:this={body}>
                {#each rows as row (row.i)}
                    <tr class:running={row.running} onclick={() => onselect(row.i)} title="Go to this call">
                        <td class="call" style:padding-left={`${8 + row.depth * 16}px`}><code>{row.label}</code></td>
                        <td><code>{row.staticType}</code></td>
                        <td><code>{row.declaredIn}</code></td>
                        <td><code>{row.startedAt}</code></td>
                        <td>{#if row.found}<code class="ran">{row.foundIn}</code>{:else}<span class="void">…</span>{/if}</td>
                        <td>
                            {#if !row.returned}<span class="void">…</span>{:else if row.result}<code>{row.result}</code>{:else}<span class="void">void</span>{/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
        <p class="hint">
            The compiler checks the <strong>static</strong> type; at runtime Java looks for the code from the <strong>dynamic</strong> type upwards. A call on
            <code>this</code> starts again at the dynamic type, <code>super</code> at the superclass.
        </p>
    {/if}
</div>

<style>
    .lookups {
        padding: 8px 12px 12px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
    }

    th {
        padding: 6px 8px;
        border-bottom: 1px solid var(--border);
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 600;
        text-align: left;
        white-space: nowrap;
    }

    td {
        padding: 5px 8px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
    }

    tbody tr {
        cursor: pointer;
    }

    tbody tr:hover {
        background: var(--surface-sunken);
    }

    tr.running {
        background: var(--accent-soft);
        box-shadow: inset 3px 0 0 var(--accent);
    }

    code {
        font-family: var(--font-mono);
        font-size: 0.8125rem;
    }

    .ran {
        color: var(--found);
        font-weight: 700;
    }

    .void,
    .nothing,
    .hint {
        color: var(--text-faint);
    }

    .nothing {
        margin: 0;
        padding: 8px 4px;
    }

    .hint {
        margin: 8px 0 0;
        font-size: 0.75rem;
    }
</style>
