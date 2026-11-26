<script lang="ts">
    import { findAnimation } from '../animations.ts';
    import { type CodeFile, codeWidth } from '../lib/code.ts';
    import CallStack from '../lib/components/CallStack.svelte';
    import CodeColumn from '../lib/components/CodeColumn.svelte';
    import ConsoleView from '../lib/components/ConsoleView.svelte';
    import Shell from '../lib/components/Shell.svelte';
    import type { Frame, Var } from '../lib/trace.ts';
    import CallsTable from './components/CallsTable.svelte';
    import Controls from './components/Controls.svelte';
    import ObjectsView from './components/ObjectsView.svelte';
    import TableView from './components/TableView.svelte';
    import { MAP_FILE, OBJECT_FILE, usesObject } from './model/index.ts';
    import { Session } from './session.svelte.ts';
    import { parseUrl, urlFor } from './url.ts';

    const session = new Session();
    session.restore(parseUrl(location.search));

    const counters = $derived(session.step?.counters);

    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

    const files = $derived<CodeFile[]>([
        { id: 'main', name: 'Main.java', source: session.trace.main.text, weight: 1 },
        { id: 'map', name: 'HashMap.java', detail: 'simplified', source: MAP_FILE.text, weight: 1.15 },
        { id: 'book', name: 'Book.java', detail: session.variant.title, source: session.variant.file.text, weight: 1.5 },
        ...(usesObject(session.variant)
            ? [{ id: 'object', name: 'Object.java', detail: 'from the JDK, shortened', source: OBJECT_FILE.text, weight: 0.6 }]
            : []),
    ]);

    const width = $derived(codeWidth(files, session.trace.steps));

    const url = $derived(
        urlFor({
            book: session.variantId,
            scenario: session.scenarioId,
            index: session.index,
            seed: session.seed,
            detail: session.detail,
        }),
    );

    const TABS = [
        { id: 'console', label: 'Console' },
        { id: 'calls', label: 'Calls' },
        { id: 'stack', label: 'Call stack' },
    ];

    const CLASSES: Record<string, string> = { main: 'Main', map: 'HashMap', book: 'Book', object: 'Object' };
    const classOf = (frame: Frame) => CLASSES[frame.file];
    const colourOf = (v: Var) => (v.object === undefined ? undefined : `var(--object-${session.step!.objects[v.object].group % 6})`);

    /** What Book's hashCode and equals print. */
    const consoleColour = (line: string) =>
        line.startsWith('Calling hashCode') ? 'var(--syntax-function)' : line.startsWith('Comparing to') ? 'var(--compare)' : undefined;
</script>

<Shell {session} animation={findAnimation('hashmap')} codeWidth={width} tabs={TABS} {url} callWord="map call">
    {#snippet controls()}
        <Controls {session} />
    {/snippet}

    {#snippet code()}
        <CodeColumn step={session.step!} {files} />
    {/snippet}

    {#snippet visualInfo()}
        {#if counters}
            <span title="Calls so far, out of the whole run">
                <span class="count hashcode">{plural(counters.hashCode, 'hashCode call')}<span class="of">/{session.totals.hashCode}</span></span>
                ·
                <span class="count equals">{plural(counters.equals, 'equals call')}<span class="of">/{session.totals.equals}</span></span>
            </span>
        {/if}
    {/snippet}

    {#snippet visual()}
        <div class="visual">
            <ObjectsView step={session.step!} />
            <TableView step={session.step!} />
        </div>
    {/snippet}

    {#snippet lower(tab: string)}
        {#if tab === 'console'}
            <ConsoleView
                step={session.step!}
                previous={session.previous}
                colourOf={consoleColour}
                hint="What the program prints, as when you run it. The lines come from the print statements in Book and Main."
            />
        {:else if tab === 'calls'}
            <CallsTable step={session.step!} trace={session.trace} onselect={session.goToCall} />
        {:else}
            <CallStack step={session.step!} previous={session.previous} {classOf} {colourOf} />
        {/if}
    {/snippet}
</Shell>

<style>
    .count {
        font-weight: 600;
    }

    .count.hashcode {
        color: var(--syntax-function);
    }

    .count.equals {
        color: var(--compare);
    }

    .of {
        color: var(--text-faint);
        font-weight: 400;
    }

    /* Maximised: bigger cards and rows for the projector. */
    :global(.workspace[data-max='visual']) .visual {
        --card-min: 220px;
        --card-font: 1rem;
        --pair-font: 1.0625rem;
        --row-height: 64px;
        --row-font: 1.125rem;
    }
</style>
