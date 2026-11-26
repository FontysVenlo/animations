<script lang="ts">
    import { MAP_FILE, OBJECT_FILE, usesObject } from './model/index.ts';
    import CallStack from '../lib/components/CallStack.svelte';
    import CallsTable from './components/CallsTable.svelte';
    import CodeColumn from '../lib/components/CodeColumn.svelte';
    import ConsoleView from '../lib/components/ConsoleView.svelte';
    import Controls from './components/Controls.svelte';
    import Icon from '../lib/components/Icon.svelte';
    import ObjectsView from './components/ObjectsView.svelte';
    import Splitter from '../lib/components/Splitter.svelte';
    import TableView from './components/TableView.svelte';
    import Timeline from '../lib/components/Timeline.svelte';
    import { type Collapsible, type LowerTab, MAX_COLUMNS, MAX_SPLIT, MIN_COLUMNS, MIN_SPLIT, Session } from './session.svelte.ts';
    import { parseUrl, urlFor } from './url.ts';

    const session = new Session();
    session.restore(parseUrl(location.search));

    const step = $derived(session.step);
    const counters = $derived(step?.counters);

    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

    /**
     * Width (in rem) the code needs: its longest line, plus the value pill shown on it, over all
     * steps. Computed per run, so it never jumps while stepping. Code characters are ~0.525rem
     * (0.6em of 0.875rem), pill characters ~0.42rem.
     */
    const codeWidth = $derived.by(() => {
        const CHAR = 0.525;
        const NOTE_CHAR = 0.42;
        const sources = {
            main: session.trace.main.text,
            map: MAP_FILE.text,
            book: session.variant.file.text,
            object: usesObject(session.variant) ? OBJECT_FILE.text : '',
        };
        const lines = Object.fromEntries(Object.entries(sources).map(([file, text]) => [file, text.split('\n')]));
        let widest = Math.max(...Object.values(lines).flatMap((l) => l.map((line) => line.length))) * CHAR;
        for (const s of session.trace.steps) {
            if (s.note) widest = Math.max(widest, (lines[s.file][s.line - 1].length + 2) * CHAR + s.note.length * NOTE_CHAR + 1);
        }
        return widest + 4 * CHAR; // line-number digits and a little slack
    });

    // Keep the URL shareable.
    $effect(() => {
        const url = urlFor({
            book: session.variantId,
            scenario: session.scenarioId,
            index: session.index,
            seed: session.seed,
            detail: session.detail,
        });
        if (url !== location.search) history.replaceState(history.state, '', url);
    });

    // Playback.
    $effect(() => {
        if (!session.playing) return;
        const timer = setInterval(session.tick, 1000 / session.speed);
        return () => clearInterval(timer);
    });

    // Maximising a card: it fills the workspace (header and timeline stay) and scales up for the projector.
    type Card = 'code' | 'visual' | 'lower';
    let maximized = $state<Card>();

    function setMaximized(card: Card | undefined) {
        maximized = card;
        opened('card', card !== undefined);
    }

    const toggleMax = (card: Card) => setMaximized(maximized === card ? undefined : card);

    // Browser full screen for the whole app.
    const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
    let fullscreen = $state(false);

    /**
     * Keyboard Lock (Chrome, Edge) lets the page receive Esc in full screen, so Esc can close a
     * maximised card first; holding Esc still leaves full screen.
     */
    type KeyboardLock = { lock?(keys: string[]): Promise<void>; unlock?(): void };
    const keyboard = typeof navigator !== 'undefined' ? (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard : undefined;

    async function toggleFullscreen() {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }
        try {
            await document.documentElement.requestFullscreen();
            await keyboard?.lock?.(['Escape']);
        } catch {
            // Refused (e.g. not allowed in an embedded page): stay as we are.
        }
    }

    /** What Esc closes, most recently opened last. */
    let openedLast = $state<('card' | 'fullscreen')[]>([]);
    const opened = (layer: 'card' | 'fullscreen', on: boolean) =>
        (openedLast = [...openedLast.filter((l) => l !== layer), ...(on ? [layer] : [])]);

    function onfullscreenchange() {
        fullscreen = document.fullscreenElement !== null;
        if (!fullscreen) keyboard?.unlock?.();
        opened('fullscreen', fullscreen);
    }

    function escape() {
        const layer = openedLast[openedLast.length - 1];
        if (layer === 'card') setMaximized(undefined);
        else if (layer === 'fullscreen' && document.fullscreenElement) document.exitFullscreen();
    }

    // The bars between code and the right column, and between visualiser and the lower panel.
    const SPLITTER = 16;
    let side: HTMLDivElement;
    let codePanel: HTMLElement;
    let visualPanel: HTMLElement;

    function rowsAt(event: PointerEvent) {
        const box = side.getBoundingClientRect();
        session.setSplit((event.clientY - box.top - SPLITTER / 2) / (box.height - SPLITTER));
    }

    function currentSplit(): number {
        if (session.split !== undefined) return session.split;
        return visualPanel.getBoundingClientRect().height / (side.getBoundingClientRect().height - SPLITTER);
    }

    function columnsAt(event: PointerEvent) {
        const left = codePanel.getBoundingClientRect().left;
        const right = side.getBoundingClientRect().right;
        session.setColumns((event.clientX - left - SPLITTER / 2) / (right - left - SPLITTER));
    }

    function currentColumns(): number {
        if (session.columns !== undefined) return session.columns;
        const code = codePanel.getBoundingClientRect();
        return code.width / (side.getBoundingClientRect().right - code.left - SPLITTER);
    }

    /** Collapsed cards show only their header; the other card takes the room. */
    const isCollapsed = (card: Collapsible) => session.collapsed[card] && maximized !== card;
    const rowBar = $derived(!maximized && !isCollapsed('visual') && !isCollapsed('lower'));
    const visualFlex = $derived.by(() => {
        if (maximized) return undefined;
        if (isCollapsed('visual')) return 'none';
        if (isCollapsed('lower')) return '1 1 auto';
        return session.split === undefined ? undefined : `0 1 calc(${session.split} * (100% - ${SPLITTER}px))`;
    });

    const TABS: { id: LowerTab; label: string }[] = [
        { id: 'console', label: 'Console' },
        { id: 'calls', label: 'Calls' },
        { id: 'stack', label: 'Call stack' },
    ];
    const tabLabel = $derived(TABS.find((t) => t.id === session.tab)!.label);

    function onkeydown(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target as HTMLElement;
        if (target.closest('input, select, textarea')) return;
        const onButton = target.closest('button, summary') !== null;
        const actions: Record<string, () => void> = {
            ArrowLeft: session.prev,
            a: session.prev,
            ArrowRight: session.next,
            d: session.next,
            ArrowUp: session.prevCall,
            w: session.prevCall,
            ArrowDown: session.nextCall,
            s: session.nextCall,
            Home: session.first,
            End: session.last,
        };
        if (openedLast.length > 0) actions.Escape = escape;
        if (event.key === ' ' && !onButton) actions[' '] = session.togglePlay;
        const action = actions[event.key];
        if (!action) return;
        event.preventDefault();
        action();
    }
</script>

<svelte:window {onkeydown} />
<svelte:document {onfullscreenchange} />

{#snippet minButton(card: Collapsible, name: string)}
    {#if maximized !== card}
        <button
            class="icon-button small"
            onclick={() => session.toggleCollapsed(card)}
            aria-pressed={session.collapsed[card]}
            aria-label={session.collapsed[card] ? `Show the ${name}` : `Minimise the ${name}`}
            title={session.collapsed[card] ? 'Show' : 'Minimise'}
        >
            <Icon name={session.collapsed[card] ? 'expand' : 'minimize'} size={16} />
        </button>
    {/if}
{/snippet}

{#snippet maxButton(card: Card, name: string)}
    <button
        class="icon-button small"
        onclick={() => toggleMax(card)}
        aria-pressed={maximized === card}
        aria-label={maximized === card ? `Restore the ${name}` : `Maximise the ${name}`}
        title={maximized === card ? 'Restore (Esc)' : 'Maximise'}
    >
        <Icon name={maximized === card ? 'restore' : 'maximize'} size={16} />
    </button>
{/snippet}

<div class="app">
    <header class="topbar">
        <div class="inner">
            <h1 class="brand"><Icon name="logo" size={22} /> HashMap Visualiser</h1>
            <Controls {session} />
            {#if canFullscreen}
                <button
                    class="icon-button fullscreen"
                    onclick={toggleFullscreen}
                    aria-label={fullscreen ? 'Leave full screen' : 'Full screen'}
                    title={fullscreen ? 'Leave full screen' : 'Full screen'}
                >
                    <Icon name={fullscreen ? 'exit-fullscreen' : 'fullscreen'} />
                </button>
            {/if}
        </div>
    </header>

    <div class="scroller">
        <main
            class="workspace"
            style:--code-rem={codeWidth}
            style:--code-column={session.columns === undefined
                ? undefined
                : `minmax(0, calc(${session.columns} * (100% - ${SPLITTER}px)))`}
            data-max={maximized}
        >
            <section class="panel code-panel" aria-labelledby="code-title" bind:this={codePanel}>
                <div class="panel-header">
                    <h2 class="panel-title" id="code-title">Code</h2>
                    {@render maxButton('code', 'code')}
                </div>
                {#if step}
                    <CodeColumn {step} trace={session.trace} variant={session.variant} />
                {/if}
            </section>

            {#if !maximized}
                <Splitter
                    orientation="vertical"
                    area="split"
                    label="Resize the code and the visualiser"
                    value={session.columns}
                    min={MIN_COLUMNS}
                    max={MAX_COLUMNS}
                    onmove={columnsAt}
                    onstep={(delta) => session.setColumns(currentColumns() + delta)}
                    onreset={() => session.setColumns(undefined)}
                />
            {/if}

            <div class="side" class:split={session.split !== undefined} class:no-bar={!rowBar && !maximized} bind:this={side}>
                <section
                    class="panel visual-panel"
                    class:collapsed={isCollapsed('visual')}
                    aria-labelledby="visual-title"
                    bind:this={visualPanel}
                    style:flex={visualFlex}
                >
                    <div class="panel-header">
                        <h2 class="panel-title" id="visual-title">Visualiser</h2>
                        {#if counters}
                            <span class="counters" title="Calls so far, out of the whole run">
                                <span class="count hashcode">{plural(counters.hashCode, 'hashCode call')}<span class="of">/{session.totals.hashCode}</span></span>
                                ·
                                <span class="count equals">{plural(counters.equals, 'equals call')}<span class="of">/{session.totals.equals}</span></span>
                            </span>
                        {/if}
                        {@render minButton('visual', 'visualiser')}
                        {@render maxButton('visual', 'visualiser')}
                    </div>
                    <div class="panel-body">
                        {#if step}
                            <ObjectsView {step} />
                            <TableView {step} />
                        {/if}
                    </div>
                </section>

                {#if rowBar}
                    <Splitter
                        orientation="horizontal"
                        label="Resize the visualiser and the lower panel"
                        value={session.split}
                        min={MIN_SPLIT}
                        max={MAX_SPLIT}
                        onmove={rowsAt}
                        onstep={(delta) => session.setSplit(currentSplit() + delta)}
                        onreset={() => session.setSplit(undefined)}
                    />
                {/if}

                <section class="panel lower-panel" class:collapsed={isCollapsed('lower')} aria-labelledby="lower-title">
                    <div class="panel-header">
                        <h2 class="panel-title visually-hidden" id="lower-title">{tabLabel}</h2>
                        <div class="segmented" role="group" aria-label="Show">
                            {#each TABS as tab (tab.id)}
                                <button aria-pressed={session.tab === tab.id} onclick={() => session.setTab(tab.id)}>{tab.label}</button>
                            {/each}
                        </div>
                        <span class="spacer"></span>
                        {@render minButton('lower', tabLabel.toLowerCase())}
                        {@render maxButton('lower', tabLabel.toLowerCase())}
                    </div>
                    <div class="panel-body">
                        {#if step}
                            {#if session.tab === 'console'}
                                <ConsoleView {step} previous={session.previous} />
                            {:else if session.tab === 'calls'}
                                <CallsTable {step} trace={session.trace} onselect={session.goToCall} />
                            {:else}
                                <CallStack {step} previous={session.previous} />
                            {/if}
                        {/if}
                    </div>
                </section>
            </div>
        </main>
    </div>

    <Timeline {session} narration={step?.narration ? [...step.narration] : []} />
</div>

<style>
    /*
     * On desktop everything fits the window: header and timeline keep their own rows and each
     * panel scrolls its own content. Narrow or short windows stack the panels and scroll the page.
     */
    .app {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        height: 100dvh;
    }

    .scroller {
        min-height: 0;
        overflow: hidden;
    }

    .topbar {
        border-bottom: 1px solid var(--border);
        background: var(--surface);
    }

    .topbar .inner {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 12px 32px;
        margin: 0 auto;
        padding: 14px 24px 12px;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 36px;
        margin: 18px 0 0;
        font-size: 1.0625rem;
        font-weight: 700;
        white-space: nowrap;
    }

    .brand :global(svg) {
        color: var(--accent);
    }

    .workspace {
        display: grid;
        grid-template-areas: 'code split side';
        /*
         * The code column fits the code (see codeWidth; 56px for line-number gutter, padding and
         * border), up to 50% of the row, unless resized (--code-column); the rest goes to the
         * visualiser. The 16px column is the bar between them.
         */
        --code-width: calc(var(--code-rem) * 1rem + 56px);
        grid-template-columns: var(--code-column, minmax(0, min(var(--code-width), 50%))) 16px minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr);
        width: 100%;
        height: 100%;
        margin: 0 auto;
        padding: 16px 24px;
    }

    .panel {
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
    }

    .panel-body {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
    }

    .code-panel {
        grid-area: code;
    }

    .side {
        display: flex;
        flex-direction: column;
        min-height: 0;
        grid-area: side;
    }

    /* Minimised: only the header. */
    .panel.collapsed > .panel-body {
        display: none;
    }

    .panel.collapsed > .panel-header {
        border-bottom: none;
    }

    .lower-panel.collapsed {
        flex: none;
        min-height: 0;
    }

    /* Without the bar, keep the cards apart. */
    .side.no-bar .lower-panel {
        margin-top: 16px;
    }

    .panel-title {
        margin-right: auto;
    }

    .spacer {
        flex: 1;
    }

    .fullscreen {
        flex: none;
        margin-top: 18px;
    }

    /* A maximised card fills the workspace and scales up for the projector. */
    .workspace[data-max] {
        grid-template-areas: 'only';
        grid-template-columns: minmax(0, 1fr);
    }

    .workspace[data-max] > *,
    .workspace[data-max] .visual-panel,
    .workspace[data-max] .lower-panel {
        grid-area: only;
    }

    .workspace[data-max='code'] .side,
    .workspace[data-max='visual'] .code-panel,
    .workspace[data-max='visual'] .lower-panel,
    .workspace[data-max='lower'] .code-panel,
    .workspace[data-max='lower'] .visual-panel {
        display: none;
    }

    .workspace[data-max='visual'] .visual-panel,
    .workspace[data-max='lower'] .lower-panel {
        flex: 1 1 auto;
    }

    .workspace[data-max='code'] {
        --code-font: 1.125rem;
    }

    .workspace[data-max='visual'] {
        --card-min: 220px;
        --card-font: 1rem;
        --pair-font: 1.0625rem;
        --row-height: 64px;
        --row-font: 1.125rem;
    }

    .workspace[data-max='lower'] .lower-panel .panel-body {
        zoom: 1.35;
    }

    /* The visualiser takes the height it needs (scrolling if that's more than fits); the lower panel the rest. */
    .visual-panel {
        flex: 0 1 auto;
    }

    .lower-panel {
        flex: 1 1 160px;
        min-height: 160px;
    }

    .side.split .lower-panel {
        min-height: 96px;
    }

    .visual-panel .panel-header,
    .lower-panel .panel-header {
        align-items: center;
        min-height: 47px;
        padding-block: 8px;
    }

    .counters {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        color: var(--text-muted);
        font-size: 0.8125rem;
        font-variant-numeric: tabular-nums;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .count {
        font-weight: 600;
    }

    .count.hashcode {
        color: var(--syntax-function);
    }

    .count.equals {
        color: var(--compare);
    }

    .counters .of {
        color: var(--text-faint);
        font-weight: 400;
    }

    .segmented {
        display: inline-flex;
        padding: 2px;
        border: 1px solid var(--border);
        border-radius: var(--radius-small);
        background: var(--surface-sunken);
    }

    .segmented button {
        height: 26px;
        padding: 0 10px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.8125rem;
        font-weight: 600;
    }

    .segmented button[aria-pressed='true'] {
        background: var(--surface);
        box-shadow: var(--shadow), 0 0 0 1px var(--border);
        color: var(--text);
    }

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }

    @media (max-width: 960px), (max-height: 600px) {
        .scroller {
            overflow-y: auto;
        }

        .workspace {
            grid-template-areas:
                'visual'
                'code'
                'lower';
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: auto;
            height: auto;
        }

        .side {
            display: contents;
        }

        .visual-panel {
            grid-area: visual;
        }

        .lower-panel {
            grid-area: lower;
            min-height: 0;
        }

        .panel-body {
            overflow: visible;
        }
    }

    @media (max-width: 960px) {
        .workspace {
            padding: 12px 16px 16px;
        }

        .topbar .inner {
            padding: 12px 16px;
        }
    }
</style>
