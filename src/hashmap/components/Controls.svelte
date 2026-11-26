<script lang="ts">
    import { SCENARIOS, VARIANTS, usesSeed } from '../model/index.ts';
    import type { Session } from '../session.svelte.ts';
    import Icon from '../../lib/components/Icon.svelte';

    let { session }: { session: Session } = $props();
</script>

<div class="controls">
    <label class="control book">
        <span class="label">Book</span>
        <select class="field" value={session.variantId} onchange={(e) => session.selectVariant(e.currentTarget.value)}>
            {#each VARIANTS as variant (variant.id)}
                <option value={variant.id}>{variant.title}</option>
            {/each}
        </select>
    </label>

    <label class="control scenario">
        <span class="label">Scenario</span>
        <select class="field" value={session.scenarioId} onchange={(e) => session.selectScenario(e.currentTarget.value)}>
            {#each SCENARIOS as scenario (scenario.id)}
                <option value={scenario.id}>{scenario.title}</option>
            {/each}
        </select>
    </label>

    <label class="toggle" title="Also step through the lines of hashCode and equals">
        <input type="checkbox" checked={session.detail} onchange={(e) => session.setDetail(e.currentTarget.checked)} />
        <span>Step into hashCode and equals</span>
    </label>

    {#if usesSeed(session.variant)}
        <button
            class="button again"
            onclick={(e) => {
                e.currentTarget.blur();
                session.reseed();
            }}
            title={session.variant.hash === 'random' ? 'Run again with other random numbers' : 'Run again with other identity hash codes'}
        >
            <Icon name="shuffle" size={16} />
            {session.variant.hash === 'random' ? 'Other random numbers' : 'Other identities'}
        </button>
    {/if}

    <p class="hint">{session.variant.hint}</p>
</div>

<style>
    .controls {
        display: flex;
        /* Wraps below the title when the bar can't fit both. */
        flex: 1 1 560px;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 8px 16px;
        min-width: 0;
    }

    .control {
        display: grid;
        gap: 4px;
        min-width: 0;
    }

    .label {
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 600;
    }

    select {
        max-width: 100%;
    }

    .book select {
        min-width: 300px;
    }

    .toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 36px;
        font-size: 0.875rem;
        white-space: nowrap;
        cursor: pointer;
    }

    .toggle input {
        width: 16px;
        height: 16px;
        margin: 0;
        accent-color: var(--accent);
    }

    .again {
        font-size: 0.875rem;
    }

    /*
     * To the right of the controls, as high as a labelled field, so the bar stays one row. When
     * there isn't room for about three lines of it, it wraps to a row of its own.
     */
    .hint {
        display: flex;
        flex: 1 1 260px;
        align-items: center;
        align-self: stretch;
        min-width: 0;
        margin: 0;
        padding-left: 14px;
        border-left: 2px solid var(--border);
        color: var(--text-muted);
        font-size: 0.8125rem;
        line-height: 1.35;
        text-wrap: pretty;
    }

    @media (max-width: 600px) {
        .control,
        .control select {
            flex-basis: 100%;
            width: 100%;
            min-width: 0;
        }
    }
</style>
