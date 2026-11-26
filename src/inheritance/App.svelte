<script lang="ts">
    import { findAnimation } from '../animations.ts';
    import { codeWidth } from '../lib/code.ts';
    import CallStack from '../lib/components/CallStack.svelte';
    import CodeColumn from '../lib/components/CodeColumn.svelte';
    import ConsoleView from '../lib/components/ConsoleView.svelte';
    import Shell from '../lib/components/Shell.svelte';
    import type { Frame } from '../lib/trace.ts';
    import Controls from './components/Controls.svelte';
    import HierarchyView from './components/HierarchyView.svelte';
    import LookupsTable from './components/LookupsTable.svelte';
    import { variableName } from './model/index.ts';
    import { Session } from './session.svelte.ts';
    import { parseUrl, urlFor } from './url.ts';

    const session = new Session();
    session.restore(parseUrl(location.search));

    const width = $derived(codeWidth(session.trace.files, session.trace.steps));
    const url = $derived(urlFor(session.selection, session.index, session.detail));

    const TABS = [
        { id: 'console', label: 'Console' },
        { id: 'lookups', label: 'Lookups' },
        { id: 'stack', label: 'Call stack' },
    ];

    const classOf = (frame: Frame) => (frame.file === 'main' ? 'Main' : frame.file);

    /** What javac and the JVM print when something goes wrong. */
    const consoleColour = (line: string) => (/^(Main\.java:|Exception in thread|\tat |\s{2}(symbol|location):|1 error$)/.test(line) ? 'var(--danger)' : undefined);
</script>

<Shell {session} animation={findAnimation('inheritance')} codeWidth={width} tabs={TABS} {url} callWord="method call">
    {#snippet controls()}
        <Controls {session} />
    {/snippet}

    {#snippet code()}
        <CodeColumn step={session.step!} files={session.trace.files} />
    {/snippet}

    {#snippet visualInfo()}
        <code>{variableName(session.selection)}</code>: static type <strong class="static">{session.selection.static}</strong>, object
        <strong class="dynamic">{session.selection.dynamic}</strong>
    {/snippet}

    {#snippet visual()}
        <div class="visual">
            <HierarchyView step={session.step!} example={session.example} />
        </div>
    {/snippet}

    {#snippet lower(tab: string)}
        {#if tab === 'console'}
            <ConsoleView
                step={session.step!}
                previous={session.previous}
                colourOf={consoleColour}
                hint="What you see when you compile and run Main: compile errors come from javac, a ClassCastException from the JVM."
            />
        {:else if tab === 'lookups'}
            <LookupsTable step={session.step!} trace={session.trace} onselect={session.goToCall} />
        {:else}
            <CallStack step={session.step!} previous={session.previous} {classOf} />
        {/if}
    {/snippet}
</Shell>

<style>
    .static {
        color: var(--accent);
    }

    .dynamic {
        color: var(--compare);
    }

    code {
        font-family: var(--font-mono);
    }

    /* The diagram fills the panel (see HierarchyView). */
    .visual {
        height: 100%;
    }
</style>
