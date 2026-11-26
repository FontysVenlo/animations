<script lang="ts">
    import { LISTS, MAP_NAME, type Outcome, type Step, objectName } from '../model/index.ts';

    let { step }: { step: Step } = $props();

    const focus = $derived(step.focus);
    const objects = $derived(step.objects);
    /** The map method's frame, while one runs. */
    const mapFrame = $derived(step.frames.find((f) => f.file === 'map'));
    const lookingFor = $derived.by(() => {
        if (!mapFrame || focus.key === undefined) return undefined;
        const hash = mapFrame.vars.find((v) => v.name === 'hash')?.text;
        return { key: objects[focus.key], hash };
    });

    const BADGES: Record<Outcome, string> = {
        checking: 'checking…',
        'hash-differs': 'other hash → skip',
        'same-object': '== same object',
        equals: 'calling equals…',
        equal: 'equals → true',
        'not-equal': 'equals → false',
    };

    function badge(pairId: number): { text: string; kind: string } | undefined {
        if (focus.added === pairId) return { text: 'new pair', kind: 'added' };
        if (focus.replaced?.pair === pairId) return { text: `value ${focus.replaced.from} → ${valueOf(pairId)}`, kind: 'replaced' };
        if (focus.pair === pairId && focus.outcome) return { text: BADGES[focus.outcome], kind: focus.outcome };
        if (focus.pair === pairId && mapFrame) return { text: 'found', kind: 'same-object' };
        return undefined;
    }

    const valueOf = (pairId: number) => step.table?.flat().find((p) => p.id === pairId)?.value;
</script>

<section class="table" aria-label="The map's lists">
    <div class="head">
        <h3 class="section-title">{MAP_NAME}: {LISTS} lists</h3>
        {#if step.table}
            <span class="size">size {step.size}</span>
        {/if}
        {#if lookingFor}
            <span class="looking">
                key <code style:color="var(--object-{lookingFor.key.group % 6})">{objectName(lookingFor.key)}</code>
                {#if lookingFor.hash !== undefined}· hash <code>{lookingFor.hash}</code>{/if}
            </span>
        {/if}
    </div>

    {#if !step.table}
        <p class="none">The map doesn’t exist yet.</p>
    {:else}
        <ol class="rows">
            {#each step.table as list, index (index)}
                <li class="row" class:picked={mapFrame && focus.row === index}>
                    <code class="index">[{index}]</code>
                    <div class="list">
                        {#if list.length === 0}
                            <span class="empty-list">empty</span>
                        {/if}
                        {#each list as pair (pair.id)}
                            {@const key = objects[pair.key]}
                            {@const b = badge(pair.id)}
                            <div
                                class="pair {b?.kind ?? ''}"
                                class:current={focus.pair === pair.id && mapFrame !== undefined}
                                style:--color="var(--object-{key.group % 6})"
                            >
                                <code class="key">{objectName(key)}</code>
                                <code class="hash">hash {pair.hash}</code>
                                <code class="value">value {pair.value}</code>
                                {#if b}<span class="badge">{b.text}</span>{/if}
                            </div>
                        {/each}
                    </div>
                    {#if mapFrame && focus.row === index && focus.rowNote}
                        <code class="row-note">← {focus.rowNote}</code>
                    {/if}
                </li>
            {/each}
        </ol>
    {/if}
</section>

<style>
    .table {
        padding: 8px 16px 16px;
    }

    .head {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 4px 16px;
        margin-bottom: 8px;
    }

    .section-title {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .size {
        color: var(--text-muted);
        font-size: 0.8125rem;
    }

    .looking {
        margin-left: auto;
        font-size: 0.875rem;
    }

    .looking code {
        font-weight: 700;
    }

    .none {
        margin: 0;
        color: var(--text-faint);
        font-size: 0.875rem;
    }

    .rows {
        display: grid;
        gap: 3px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .row {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: var(--row-height, 34px);
        padding: 3px 8px;
        border-radius: var(--radius-small);
        background: var(--surface-sunken);
        transition: background 0.15s;
    }

    .row.picked {
        background: var(--accent-soft);
        box-shadow: inset 3px 0 0 var(--accent);
    }

    .index {
        flex: none;
        width: 2.5em;
        color: var(--text-muted);
        font-size: var(--row-font, 0.875rem);
        font-weight: 700;
    }

    .picked .index {
        color: var(--accent);
    }

    .list {
        display: flex;
        flex: 1 1 auto;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 18px;
        min-width: 0;
    }

    .empty-list {
        color: var(--text-faint);
        font-size: 0.8125rem;
        font-style: italic;
    }

    .pair {
        position: relative;
        display: flex;
        align-items: baseline;
        gap: 10px;
        padding: 3px 10px;
        border: 1px solid var(--border-strong);
        border-left: 4px solid var(--color);
        border-radius: var(--radius-small);
        background: var(--surface);
        font-size: var(--pair-font, 0.8125rem);
        line-height: 1.35;
        transition:
            box-shadow 0.15s,
            opacity 0.15s;
    }

    /* The chain: an arrow to the next pair in the list. */
    .pair + .pair::before {
        position: absolute;
        top: 50%;
        left: -17px;
        color: var(--text-faint);
        content: '→';
        transform: translateY(-50%);
    }

    .key {
        color: var(--color);
        font-weight: 700;
        white-space: nowrap;
    }

    .hash,
    .value {
        color: var(--text-muted);
        font-size: 0.9em;
        white-space: nowrap;
    }

    .badge {
        padding: 0 6px;
        border-radius: 999px;
        font-family: var(--font-sans);
        font-size: 0.8em;
        font-weight: 700;
        white-space: nowrap;
    }

    .pair.current {
        box-shadow: 0 0 0 2px var(--compare);
    }

    .checking .badge,
    .equals .badge {
        background: var(--compare-soft);
        color: var(--compare);
    }

    .pair.hash-differs {
        box-shadow: 0 0 0 2px var(--border-strong);
    }

    .pair.hash-differs .hash {
        color: var(--danger);
        font-weight: 700;
    }

    .hash-differs .badge {
        background: var(--surface-sunken);
        color: var(--text-muted);
    }

    .pair.same-object,
    .pair.equal {
        box-shadow: 0 0 0 2px var(--found);
    }

    .same-object .badge,
    .equal .badge {
        background: var(--found-soft);
        color: var(--found);
    }

    .pair.not-equal {
        box-shadow: 0 0 0 2px var(--danger);
    }

    .not-equal .badge {
        background: var(--danger-soft);
        color: var(--danger);
    }

    .pair.added {
        box-shadow: 0 0 0 2px var(--write);
        animation: appear 0.35s ease-out;
    }

    .added .badge {
        background: var(--write-soft);
        color: var(--write);
    }

    .pair.replaced {
        box-shadow: 0 0 0 2px var(--swap);
    }

    .pair.replaced .value {
        color: var(--swap);
        font-weight: 700;
    }

    .replaced .badge {
        background: var(--swap-soft);
        color: var(--swap);
    }

    .row-note {
        flex: none;
        margin-left: auto;
        color: var(--accent);
        font-size: calc(var(--row-font, 0.875rem) * 0.93);
        font-weight: 600;
        white-space: nowrap;
    }

    @keyframes appear {
        from {
            opacity: 0;
            transform: translateX(-12px);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .pair.added {
            animation: none;
        }
    }
</style>
