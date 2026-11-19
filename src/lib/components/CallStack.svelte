<script lang="ts">
    import type { Frame, Step, Var } from '../../model/index.ts';

    let { step, previous }: { step: Step; previous: Step | undefined } = $props();

    const FILES = { main: 'Main', map: 'HashMap', book: 'Book', object: 'Object' } as const;
    const frames = $derived([...step.frames].reverse());

    /** Variables of the top frame that are new or changed since the previous step. */
    const changed = $derived.by(() => {
        const top = step.frames[step.frames.length - 1];
        const before = previous?.frames.find((f) => f.id === top.id);
        if (!before) return new Set<string>();
        return new Set(top.vars.filter((v) => before.vars.find((b) => b.name === v.name)?.text !== v.text).map((v) => v.name));
    });

    const colourOf = (v: Var) => (v.object === undefined ? undefined : `var(--object-${step.objects[v.object].group % 6})`);
</script>

{#snippet vars(frame: Frame, showChanges: boolean)}
    {#if frame.vars.length > 0}
        <table class="vars">
            <tbody>
                {#each frame.vars as v (v.name)}
                    <tr class:changed={showChanges && changed.has(v.name)}>
                        <th scope="row">{v.name}</th>
                        <td style:color={colourOf(v)} class:ref={v.object !== undefined}>{v.text}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
{/snippet}

<ol class="frames">
    {#each frames as frame, i (frame.id)}
        <li class="frame" class:current={i === 0}>
            {#if i === 0}
                <div class="head">
                    <code class="call">{FILES[frame.file]}.{frame.label}</code>
                    <span class="line">line {frame.line}</span>
                </div>
                {@render vars(frame, true)}
            {:else}
                <details>
                    <summary class="head">
                        <code class="call">{FILES[frame.file]}.{frame.label}</code>
                        <span class="line">line {frame.line}</span>
                    </summary>
                    {@render vars(frame, false)}
                </details>
            {/if}
        </li>
    {/each}
</ol>

<style>
    .frames {
        margin: 0;
        padding: 8px;
        list-style: none;
    }

    .frame {
        border-radius: var(--radius-small);
    }

    .frame + .frame {
        margin-top: 2px;
    }

    .frame.current {
        margin-bottom: 8px;
        padding-bottom: 4px;
        background: var(--surface-sunken);
    }

    .head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 8px;
        color: var(--text-muted);
    }

    .current .head {
        color: var(--text);
    }

    summary.head {
        cursor: pointer;
        list-style-position: inside;
        border-radius: var(--radius-small);
    }

    summary.head:hover {
        background: var(--surface-sunken);
    }

    .call {
        min-width: 0;
        overflow-wrap: anywhere;
        font-size: 0.875rem;
    }

    .current .call {
        font-weight: 600;
    }

    .line {
        flex: none;
        color: var(--text-faint);
        font-size: 0.75rem;
    }

    .vars {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--font-mono);
        font-size: 0.875rem;
    }

    .vars th,
    .vars td {
        padding: 3px 8px;
        text-align: left;
        vertical-align: top;
    }

    .vars th {
        width: 1%;
        padding-right: 24px;
        color: var(--text-muted);
        font-weight: 500;
        white-space: nowrap;
    }

    .vars td {
        overflow-wrap: anywhere;
    }

    .vars td.ref {
        font-weight: 600;
    }

    tr.changed td {
        color: var(--accent);
        font-weight: 700;
    }

    tr.changed th::after {
        content: ' •';
        color: var(--accent);
    }
</style>
