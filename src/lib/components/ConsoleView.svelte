<script lang="ts">
    import type { Step } from '../../model/index.ts';

    let { step, previous }: { step: Step; previous: Step | undefined } = $props();

    /** Lines printed since the previous step shown (with "step into" off, hashCode's line shows up after it). */
    const fresh = $derived(step.console.length - (previous?.console.length ?? 0));

    let box: HTMLOListElement | undefined = $state();

    // Keep the newest line in view.
    $effect(() => {
        void step.console.length;
        box?.lastElementChild?.scrollIntoView({ block: 'nearest' });
    });
</script>

<div class="console">
    {#if step.console.length === 0}
        <p class="nothing">Nothing printed yet.</p>
    {:else}
        <ol bind:this={box}>
            {#each step.console as line, i (i)}
                <li
                    class:fresh={i >= step.console.length - fresh}
                    class:hashcode={line.startsWith('Calling hashCode')}
                    class:equals={line.startsWith('Comparing to')}
                >
                    {line}
                </li>
            {/each}
        </ol>
    {/if}
    <p class="hint">What the program prints, as when you run it. The lines come from the print statements in Book and Main.</p>
</div>

<style>
    .console {
        padding: 8px 12px 12px;
    }

    ol {
        margin: 0;
        padding: 8px 0;
        border-radius: var(--radius-small);
        background: var(--surface-sunken);
        font-family: var(--font-mono);
        font-size: var(--console-font, 0.8125rem);
        list-style: none;
    }

    li {
        padding: 1px 12px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    li.hashcode {
        color: var(--syntax-function);
    }

    li.equals {
        color: var(--compare);
    }

    li.fresh {
        background: var(--accent-soft);
        box-shadow: inset 3px 0 0 var(--accent);
        font-weight: 700;
    }

    .nothing {
        margin: 0;
        padding: 8px 4px;
        color: var(--text-faint);
    }

    .hint {
        margin: 8px 0 0;
        color: var(--text-faint);
        font-size: 0.75rem;
    }
</style>
