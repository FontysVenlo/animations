<script lang="ts">
    import { SPEEDS, type Session } from '../../hashmap/session.svelte.ts';
    import Icon from './Icon.svelte';

    let { session, narration }: { session: Session; narration: string[] } = $props();

    const disabled = false;
    const atStart = $derived(session.index === 0);
    const atEnd = $derived(session.index >= session.lastIndex);
</script>

<footer class="timeline">
    <div class="inner">
        <p class="narration" aria-live={session.playing ? 'off' : 'polite'}>
            {#each narration as part, i (i)}
                {#if i > 0}<span class="sep" aria-hidden="true">·</span>{/if}<span class:call={i === 0 && narration.length > 1}>{part}</span>
            {/each}
        </p>

        <div class="row">
            <div class="transport">
                <button class="icon-button" onclick={session.first} disabled={disabled || atStart} title="First step (Home)" aria-label="First step">
                    <Icon name="first" />
                </button>
                <button class="icon-button" onclick={session.prevCall} disabled={disabled || atStart} title="Previous map call (↑ or W)" aria-label="Previous map call">
                    <Icon name="prev-call" />
                </button>
                <button class="icon-button" onclick={session.prev} disabled={disabled || atStart} title="Previous step (← or A)" aria-label="Previous step">
                    <Icon name="prev" />
                </button>
                <button
                    class="icon-button play"
                    onclick={session.togglePlay}
                    {disabled}
                    title={session.playing ? 'Pause (Space)' : 'Play (Space)'}
                    aria-label={session.playing ? 'Pause' : 'Play'}
                >
                    <Icon name={session.playing ? 'pause' : 'play'} />
                </button>
                <button class="icon-button" onclick={session.next} disabled={disabled || atEnd} title="Next step (→ or D)" aria-label="Next step">
                    <Icon name="next" />
                </button>
                <button class="icon-button" onclick={session.nextCall} disabled={disabled || atEnd} title="Next map call (↓ or S)" aria-label="Next map call">
                    <Icon name="next-call" />
                </button>
                <button class="icon-button" onclick={session.last} disabled={disabled || atEnd} title="Last step (End)" aria-label="Last step">
                    <Icon name="last" />
                </button>
            </div>

            <input
                class="scrubber"
                type="range"
                min="0"
                max={session.lastIndex}
                value={session.index}
                oninput={(e) => {
                    session.playing = false;
                    session.goTo(e.currentTarget.valueAsNumber);
                }}
                {disabled}
                aria-label="Step"
                aria-valuetext={`Step ${session.index + 1} of ${session.steps.length}`}
            />

            <span class="counter">
                Step <strong>{session.index + 1}</strong> of {session.steps.length}
            </span>

            <label class="speed">
                <span class="visually-hidden">Speed</span>
                <select class="field" bind:value={session.speed} title="Playback speed">
                    {#each SPEEDS as speed (speed)}
                        <option value={speed}>{speed} step{speed === 1 ? '' : 's'}/s</option>
                    {/each}
                </select>
            </label>
        </div>
    </div>
</footer>

<style>
    .timeline {
        border-top: 1px solid var(--border);
        background: var(--surface);
    }

    .inner {
        display: grid;
        gap: 6px;
        margin: 0 auto;
        padding: 10px 24px 12px;
    }

    .narration {
        min-height: 1.5em;
        margin: 0;
        overflow: hidden;
        font-weight: 500;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .sep {
        margin: 0 8px;
        color: var(--text-faint);
    }

    .call {
        font-family: var(--font-mono);
        font-size: 0.9375rem;
        font-weight: 600;
    }

    .row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .transport {
        display: flex;
        flex: none;
        gap: 2px;
    }

    .play:not(:disabled) {
        background: var(--accent);
        color: var(--on-accent);
    }

    .play:hover:not(:disabled) {
        background: var(--accent-hover);
    }

    .scrubber {
        flex: 1;
        min-width: 0;
        accent-color: var(--accent);
    }

    .counter {
        flex: none;
        min-width: 9.5em;
        color: var(--text-muted);
        font-size: 0.875rem;
        font-variant-numeric: tabular-nums;
        text-align: right;
    }

    .counter strong {
        color: var(--text);
    }

    .speed select {
        height: 32px;
        padding: 0 8px;
        font-size: 0.875rem;
    }

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }

    @media (max-width: 700px) {
        .inner {
            padding: 8px 16px 10px;
        }

        .narration {
            white-space: normal;
        }

        .row {
            flex-wrap: wrap;
            gap: 4px 8px;
        }

        .scrubber {
            order: 3;
            flex-basis: 100%;
        }

        .counter {
            flex: 1;
            min-width: 0;
        }
    }
</style>
