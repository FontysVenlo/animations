<script lang="ts">
    import { COMMANDS, commandText } from '../model/index.ts';
    import type { Session } from '../session.svelte.ts';

    let { session }: { session: Session } = $props();
</script>

<div class="controls">
    <label class="control">
        <span class="label">Command</span>
        <select class="field mono" value={session.step?.call ?? 0} onchange={(e) => session.goToCall(Number(e.currentTarget.value))}>
            {#each COMMANDS as command, i (command.marker)}
                <option value={i}>{i + 1}. {commandText(command)}</option>
            {/each}
        </select>
    </label>

    <label class="toggle" title="Each command first runs without showing what it does, so you can predict it (P)">
        <input type="checkbox" checked={session.predict} onchange={(e) => session.setPredict(e.currentTarget.checked)} />
        <span>Predict first</span>
    </label>
</div>

<style>
    .controls {
        display: flex;
        /* Wraps below the title when the bar can't fit both. */
        flex: 1 1 480px;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 8px 14px;
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

    .mono {
        font-family: var(--font-mono);
        font-size: 0.875rem;
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

    @media (max-width: 600px) {
        .control,
        .control select {
            flex-basis: 100%;
            width: 100%;
        }
    }
</style>
