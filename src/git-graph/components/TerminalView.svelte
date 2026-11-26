<script lang="ts">
    import { untrack } from 'svelte';
    import { type Step, promptAfter } from '../model/index.ts';

    let { step, animate }: { step: Step; animate: boolean } = $props();

    const blocks = $derived(step.view.terminal);
    const current = $derived(blocks[blocks.length - 1]);
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // On a single step to the next command, the command is typed out, then its output appears.
    let chars = $state(Infinity);
    let lastCall = -1;

    $effect(() => {
        const call = step.call ?? 0;
        const command = current.command;
        const type = animate && !reduced && call > untrack(() => lastCall);
        lastCall = call;
        if (!type) {
            chars = Infinity;
            return;
        }
        chars = 0;
        let timer = setTimeout(function next() {
            chars += 1;
            if (chars < command.length) timer = setTimeout(next, 22 + Math.random() * 30);
            else timer = setTimeout(() => (chars = Infinity), 180);
        }, 200);
        return () => clearTimeout(timer);
    });

    const typing = $derived(chars < Infinity);
    /** The prompt for the next command, once this one has run. */
    const waiting = $derived(current.output && !typing ? promptAfter(step.call ?? 0) : undefined);

    let box: HTMLOListElement | undefined = $state();

    // Keep the newest line in view, and the command that printed it if there is room for both.
    $effect(() => {
        void step.seq;
        void chars;
        box?.lastElementChild?.scrollIntoView({ block: 'nearest' });
        box?.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
    });

    let copied = $state(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(current.command);
            copied = true;
            setTimeout(() => (copied = false), 1400);
        } catch {
            // Not allowed (e.g. an insecure page): the command can still be selected by hand.
        }
    }
</script>

{#snippet prompt(path: string, branch: string | undefined)}
    <span class="path">{path}</span>{#if branch}{' '}<span class="branch">({branch})</span>{/if} ${' '}
{/snippet}

<div class="terminal">
    <ol bind:this={box} aria-live="polite">
        {#each blocks as block, i (i)}
            {@const last = i === blocks.length - 1}
            <li class:old={!last} class:current={last}>
                {@render prompt(block.path, block.branch)}<span class="command">{last ? block.command.slice(0, chars) : block.command}</span
                >{#if last && (typing || !block.output)}<span class="cursor" aria-hidden="true"></span>{/if}
            </li>
            {#if block.output && !(last && typing)}
                {#each block.output as line, j (j)}
                    <li class="output" class:old={!last}>{line}</li>
                {/each}
            {/if}
        {/each}
        {#if waiting}
            <li>{@render prompt(waiting.path, waiting.branch)}<span class="cursor" aria-hidden="true"></span></li>
        {/if}
    </ol>
    <div class="foot">
        <p class="hint">What you see when you type the commands in a terminal. Your hashes will differ: they depend on your name and the time.</p>
        <button class="button copy" onclick={copy} title="Copy the command to try it yourself">{copied ? 'Copied' : 'Copy command'}</button>
    </div>
</div>

<style>
    .terminal {
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

    li.old {
        opacity: 0.55;
    }

    .output {
        color: var(--text-muted);
    }

    .path {
        color: var(--accent);
        font-weight: 600;
    }

    .branch {
        color: var(--compare);
        font-weight: 600;
    }

    .command {
        font-weight: 700;
    }

    .cursor::after {
        content: '▋';
        animation: blink 1s steps(1) infinite;
    }

    @keyframes blink {
        50% {
            opacity: 0;
        }
    }

    .foot {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 8px;
    }

    .hint {
        flex: 1;
        margin: 0;
        color: var(--text-faint);
        font-size: 0.75rem;
    }

    .copy {
        flex: none;
        height: 26px;
        padding: 0 10px;
        font-size: 0.75rem;
    }

    @media (prefers-reduced-motion: reduce) {
        .cursor::after {
            animation: none;
        }
    }
</style>
