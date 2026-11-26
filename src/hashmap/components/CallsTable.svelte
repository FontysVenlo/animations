<script lang="ts">
    import type { Step, Trace } from '../model/index.ts';

    let { step, trace, onselect }: { step: Step; trace: Trace; onselect: (call: number) => void } = $props();

    /** Calls appear as the run reaches them; the running one shows its counts so far. */
    const rows = $derived(
        trace.calls
            .map((call, i) => {
                const running = step.call === i;
                const start = trace.steps[call.firstSeq].counters;
                return {
                    ...call,
                    i,
                    running,
                    hashCode: running ? step.counters.hashCode - start.hashCode : call.hashCode,
                    equals: running ? step.counters.equals - start.equals : call.equals,
                };
            })
            .filter((row) => row.firstSeq <= step.seq),
    );

    let body: HTMLTableSectionElement;

    $effect(() => {
        if (rows.length === 0) return;
        body.querySelector('tr.running, tr:last-child')?.scrollIntoView({ block: 'nearest' });
    });
</script>

<div class="wrap">
    <table>
        <thead>
            <tr>
                <th scope="col" class="call">map call</th>
                <th scope="col">list</th>
                <th scope="col">hashCode</th>
                <th scope="col">equals</th>
                <th scope="col" class="result">result</th>
            </tr>
        </thead>
        <tbody bind:this={body}>
            {#each rows as row (row.i)}
                <tr class:running={row.running}>
                    <th scope="row" class="call">
                        <button
                            onclick={(e) => {
                                // Don't keep focus, so Space and the arrows go back to playing and stepping.
                                e.currentTarget.blur();
                                onselect(row.i);
                            }}
                            title="Go to this call"
                        >
                            {row.label}
                        </button>
                    </th>
                    <td>{row.row ?? (row.running ? '' : '–')}</td>
                    <td>{row.hashCode}</td>
                    <td class:many={row.equals > 1}>{row.equals}</td>
                    <td class="result" class:null={row.result === 'null'}>{row.running ? '…' : row.result}</td>
                </tr>
            {/each}
        </tbody>
        <tfoot>
            <tr>
                <th scope="row" class="call">so far</th>
                <td></td>
                <td>{step.counters.hashCode}</td>
                <td>{step.counters.equals}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>
    <p class="hint">One row per map call: how often it called hashCode and equals. Click a call to go there; switch the Book to compare.</p>
</div>

<style>
    .wrap {
        padding: 8px 12px 12px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--calls-font, 0.875rem);
        font-variant-numeric: tabular-nums;
    }

    th,
    td {
        padding: 4px 8px;
        text-align: right;
        white-space: nowrap;
    }

    .call,
    .result {
        text-align: left;
    }

    thead th {
        position: sticky;
        top: 0;
        background: var(--surface);
        color: var(--text-faint);
        font-size: 0.75rem;
        font-weight: 600;
    }

    tbody tr {
        border-top: 1px solid var(--border);
    }

    tbody td {
        font-family: var(--font-mono);
    }

    td.many {
        color: var(--compare);
        font-weight: 700;
    }

    td.null {
        color: var(--danger);
        font-weight: 700;
    }

    tr.running {
        background: var(--accent-soft);
    }

    tfoot th,
    tfoot td {
        border-top: 2px solid var(--border-strong);
        color: var(--text-muted);
        font-family: var(--font-mono);
        font-weight: 700;
    }

    .call button {
        padding: 0;
        border: none;
        background: none;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: inherit;
        text-align: left;
        text-decoration: underline;
        text-decoration-color: var(--border-strong);
        text-underline-offset: 3px;
    }

    .call button:hover {
        color: var(--accent);
    }

    .hint {
        margin: 8px 0 0;
        color: var(--text-faint);
        font-size: 0.75rem;
    }
</style>
