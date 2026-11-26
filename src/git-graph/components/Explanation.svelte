<script lang="ts">
    import Rich from '../../lib/components/Rich.svelte';
    import type { Step } from '../model/index.ts';

    let { step }: { step: Step } = $props();

    const view = $derived(step.view);
</script>

<!-- Under the script: what the command on the highlighted line does, or in predict mode the question. -->
<div class="explain" class:pending={view.pending} aria-live="polite">
    {#if view.pending}
        <p><span class="phase">Predict</span></p>
        <p><strong>{view.predict}</strong></p>
        <p class="sub">The diagram and the terminal show the repository before the command runs. Press → to check your prediction.</p>
    {:else}
        <h3>{view.title}</h3>
        <section>
            <span class="lbl">What git does</span>
            <p><Rich text={view.git} /></p>
        </section>
        <section>
            <span class="lbl">In graph terms</span>
            <p><Rich text={view.theory} /></p>
        </section>
    {/if}
</div>

<style>
    .explain {
        display: grid;
        flex: none;
        gap: 10px;
        align-content: start;
        /* Room for the longest explanation, so the code above doesn't move from step to step. */
        min-height: 17em;
        max-height: 65%;
        margin: 0 12px 12px;
        padding: 12px 14px;
        overflow: auto;
        border: 2px solid transparent;
        border-radius: var(--radius-small);
        background: var(--surface-sunken);
        font-size: var(--explain-font, 0.9375rem);
    }

    .explain.pending {
        border-color: var(--compare);
        border-style: dashed;
    }

    h3 {
        margin: 0;
        font-size: 1.0625rem;
    }

    .lbl {
        display: block;
        margin-bottom: 2px;
        color: var(--text-muted);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    p {
        margin: 0;
        line-height: 1.55;
    }

    .sub {
        color: var(--text-muted);
    }

    .phase {
        display: inline-block;
        padding: 0 9px;
        border-radius: 999px;
        background: var(--compare-soft);
        color: var(--compare);
        font-size: 0.75rem;
        font-weight: 700;
    }

    @media (max-width: 960px), (max-height: 600px) {
        .explain {
            min-height: 0;
            max-height: none;
        }
    }
</style>
