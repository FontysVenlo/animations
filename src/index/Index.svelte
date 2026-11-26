<script lang="ts">
    import { ANIMATIONS, ISSUES_URL, REPOSITORY } from '../animations.ts';
    import Icon from '../lib/components/Icon.svelte';

    const base = import.meta.env.BASE_URL;
</script>

<div class="page">
    <header class="hero">
        <h1>Animations</h1>
        <p>
            Step through real code, one line at a time, forwards and backwards. Each animation goes with a lesson and shows
            what is hard to see when you only read the code.
        </p>
    </header>

    <main>
        <ul class="cards">
            {#each ANIMATIONS as animation (animation.id)}
                <li>
                    <a class="card panel" href={`${base}${animation.id}/`}>
                        <span class="icon"><Icon name={animation.icon} size={28} /></span>
                        <span class="text">
                            <span class="topic">{animation.topic}</span>
                            <span class="title">{animation.title}</span>
                            <span class="description">{animation.description}</span>
                        </span>
                    </a>
                </li>
            {/each}
        </ul>

        <section class="help">
            <h2>Using the animations</h2>
            <ul>
                <li><kbd>←</kbd> <kbd>→</kbd> step back and forward, <kbd>↑</kbd> <kbd>↓</kbd> jump from call to call, <kbd>Space</kbd> plays.</li>
                <li>The address bar always holds the current step: copy it to share exactly what you see.</li>
                <li>
                    Something wrong, or unclear? Use <Icon name="report" size={15} /> in the animation, or
                    <a href={ISSUES_URL}>open an issue</a>.
                </li>
            </ul>
        </section>
    </main>

    <footer>
        <a href={ISSUES_URL}>Report a problem or suggest an idea</a>
        <span aria-hidden="true">·</span>
        <a href={REPOSITORY}>Source on GitHub</a>
        <span aria-hidden="true">·</span>
        <span>MIT License</span>
    </footer>
</div>

<style>
    .page {
        display: grid;
        gap: 32px;
        max-width: 960px;
        margin: 0 auto;
        padding: 48px 24px 32px;
    }

    main {
        display: grid;
        gap: 32px;
    }

    .hero h1 {
        margin: 0 0 8px;
        font-size: 2rem;
        letter-spacing: -0.01em;
    }

    .hero p {
        max-width: 62ch;
        margin: 0;
        color: var(--text-muted);
        font-size: 1.0625rem;
    }

    .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .card {
        display: flex;
        gap: 16px;
        height: 100%;
        padding: 20px;
        color: inherit;
        text-decoration: none;
        transition:
            border-color 0.15s,
            box-shadow 0.15s;
    }

    .card:hover,
    .card:focus-visible {
        border-color: var(--accent);
        box-shadow: var(--shadow), 0 0 0 1px var(--accent);
    }

    .icon {
        display: grid;
        flex: none;
        place-items: center;
        width: 52px;
        height: 52px;
        border-radius: var(--radius-small);
        background: var(--accent-soft);
        color: var(--accent);
    }

    .text {
        display: grid;
        gap: 4px;
        align-content: start;
    }

    .topic {
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
    }

    .title {
        font-size: 1.125rem;
        font-weight: 700;
    }

    .card:hover .title {
        color: var(--accent);
    }

    .description {
        color: var(--text-muted);
    }

    .help h2 {
        margin: 0 0 8px;
        font-size: 1rem;
    }

    .help ul {
        display: grid;
        gap: 6px;
        margin: 0;
        padding-left: 20px;
        color: var(--text-muted);
    }

    .help :global(svg) {
        vertical-align: -2px;
    }

    kbd {
        padding: 1px 6px;
        border: 1px solid var(--border-strong);
        border-radius: 4px;
        background: var(--surface);
        font-family: var(--font-mono);
        font-size: 0.8125rem;
    }

    a {
        color: var(--accent);
    }

    footer {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding-top: 16px;
        border-top: 1px solid var(--border);
        color: var(--text-faint);
        font-size: 0.875rem;
    }
</style>
