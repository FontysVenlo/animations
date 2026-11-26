<script lang="ts">
    import { EXAMPLES, type ExampleId, PRESETS, isConcrete } from '../model/index.ts';
    import type { Session } from '../session.svelte.ts';

    let { session }: { session: Session } = $props();

    const ex = $derived(session.example);
    const sel = $derived(session.selection);
    const types = $derived(Object.values(ex.types));
    /** In the dynamic type list: why a type can't be the object's class. */
    const label = (name: string) => {
        const kind = ex.types[name].kind;
        return kind === 'class' ? name : `${name} (${kind})`;
    };
</script>

<div class="controls">
    <label class="control scenario">
        <span class="label">Scenario</span>
        <select class="field" value={session.preset?.id ?? ''} onchange={(e) => session.selectPreset(e.currentTarget.value)}>
            {#if !session.preset}
                <option value="" disabled>Your own choice</option>
            {/if}
            {#each Object.values(EXAMPLES) as example (example.id)}
                <optgroup label={example.title}>
                    {#each PRESETS.filter((p) => p.selection.example === example.id) as preset (preset.id)}
                        <option value={preset.id}>{preset.title}</option>
                    {/each}
                </optgroup>
            {/each}
        </select>
    </label>

    <label class="control">
        <span class="label">Example</span>
        <select class="field" value={sel.example} onchange={(e) => session.selectExample(e.currentTarget.value as ExampleId)}>
            {#each Object.values(EXAMPLES) as example (example.id)}
                <option value={example.id}>{example.title}</option>
            {/each}
        </select>
    </label>

    <div class="control">
        <span class="label" id="mode-label">Mode</span>
        <div class="segmented" role="group" aria-labelledby="mode-label">
            <button aria-pressed={sel.mode === 'call'} onclick={() => session.select({ mode: 'call' })}>Method call</button>
            <button aria-pressed={sel.mode === 'cast'} onclick={() => session.select({ mode: 'cast' })}>Cast</button>
        </div>
    </div>

    <label class="control">
        <span class="label">Static type <span class="hint">variable</span></span>
        <select class="field mono" value={sel.static} onchange={(e) => session.select({ static: e.currentTarget.value })}>
            {#each types as t (t.name)}
                <option value={t.name}>{t.name}</option>
            {/each}
        </select>
    </label>

    <label class="control">
        <span class="label">Dynamic type <span class="hint">object</span></span>
        <select class="field mono" value={sel.dynamic} onchange={(e) => session.select({ dynamic: e.currentTarget.value })}>
            {#each types as t (t.name)}
                <option value={t.name} disabled={!isConcrete(ex, t.name)}>{label(t.name)}</option>
            {/each}
        </select>
    </label>

    {#if sel.mode === 'call'}
        <label class="control">
            <span class="label">Method</span>
            <select class="field mono" value={sel.method} onchange={(e) => session.select({ method: e.currentTarget.value })}>
                {#each ex.callable as m (m)}
                    <option value={m}>{m}()</option>
                {/each}
            </select>
        </label>
    {:else}
        <label class="control">
            <span class="label">Cast to</span>
            <select class="field mono" value={sel.target} onchange={(e) => session.select({ target: e.currentTarget.value })}>
                {#each types as t (t.name)}
                    <option value={t.name}>{t.name}</option>
                {/each}
            </select>
        </label>
    {/if}

    {#if sel.mode === 'call'}
        <label class="toggle" title="Also show each class the lookup checks on its way up">
            <input type="checkbox" checked={session.detail} onchange={(e) => session.setDetail(e.currentTarget.checked)} />
            <span>Step into the lookup</span>
        </label>
    {/if}
</div>

<style>
    .controls {
        display: flex;
        /* Wraps below the title when the bar can't fit both. */
        flex: 1 1 560px;
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

    .label .hint {
        color: var(--text-faint);
        font-weight: 400;
    }

    select {
        max-width: 100%;
    }

    .mono {
        font-family: var(--font-mono);
        font-size: 0.875rem;
    }

    .scenario select {
        min-width: 230px;
    }

    .segmented {
        display: inline-flex;
        height: 36px;
        padding: 2px;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-small);
        background: var(--surface-sunken);
    }

    .segmented button {
        padding: 0 12px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.875rem;
        font-weight: 600;
    }

    .segmented button[aria-pressed='true'] {
        background: var(--surface);
        box-shadow: var(--shadow), 0 0 0 1px var(--border);
        color: var(--text);
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
            min-width: 0;
        }
    }
</style>
