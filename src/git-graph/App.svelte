<script lang="ts">
    import { findAnimation } from '../animations.ts';
    import { codeWidth } from '../lib/code.ts';
    import CodeColumn from '../lib/components/CodeColumn.svelte';
    import Shell from '../lib/components/Shell.svelte';
    import Controls from './components/Controls.svelte';
    import DagView from './components/DagView.svelte';
    import Explanation from './components/Explanation.svelte';
    import GraphPanel from './components/GraphPanel.svelte';
    import TerminalView from './components/TerminalView.svelte';
    import { Session } from './session.svelte.ts';
    import { parseUrl, urlFor } from './url.ts';

    const session = new Session();
    session.restore(parseUrl(location.search));

    const width = codeWidth(session.trace.files, session.trace.steps);
    const url = $derived(urlFor(session.index, session.predict));
    const animate = $derived(session.moved === 'step');

    const TABS = [
        { id: 'terminal', label: 'Terminal' },
        { id: 'graph', label: 'Graph' },
    ];

    /** P turns predict mode on and off, as in the original replay. */
    function onkeydown(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.key.toLowerCase() !== 'p') return;
        if ((event.target as HTMLElement).closest('input, select, textarea')) return;
        event.preventDefault();
        session.togglePredict();
    }
</script>

<svelte:window {onkeydown} />

<Shell {session} animation={findAnimation('git-graph')} codeWidth={width} tabs={TABS} {url} callWord="command">
    {#snippet controls()}
        <Controls {session} />
    {/snippet}

    {#snippet code()}
        <CodeColumn step={session.step!} files={session.trace.files} />
        <Explanation step={session.step!} />
    {/snippet}

    {#snippet visualInfo()}
        {@const s = session.step!.view.stats}
        |V| = {s.vertices} · |E| = {s.edges} · HEAD → {session.step!.view.head}
    {/snippet}

    {#snippet visual()}
        <div class="visual">
            <DagView step={session.step!} {animate} selected={session.selected} onselect={session.select} />
        </div>
    {/snippet}

    {#snippet lower(tab: string)}
        {#if tab === 'terminal'}
            <TerminalView step={session.step!} {animate} />
        {:else}
            <GraphPanel step={session.step!} />
        {/if}
    {/snippet}
</Shell>

<style>
    /* The diagram fills the panel (see DagView). */
    .visual {
        height: 100%;
    }
</style>
