<script lang="ts">
    import { type FileId, MAP_FILE, OBJECT_FILE, type Step, type Trace, type Variant, usesObject } from '../../model/index.ts';
    import type { CodeHighlights } from '../codemirror.ts';
    import CodePanel from './CodePanel.svelte';

    let { step, trace, variant }: { step: Step; trace: Trace; variant: Variant } = $props();

    interface File {
        id: FileId;
        name: string;
        detail: string;
        source: string;
        /** Share of the column's height. */
        weight: number;
    }

    const files = $derived<File[]>([
        { id: 'main', name: 'Main.java', detail: '', source: trace.main.text, weight: 1 },
        { id: 'map', name: 'HashMap.java', detail: 'simplified', source: MAP_FILE.text, weight: 1.15 },
        { id: 'book', name: 'Book.java', detail: variant.title, source: variant.file.text, weight: 1.5 },
        ...(usesObject(variant)
            ? [{ id: 'object' as const, name: 'Object.java', detail: 'from the JDK, shortened', source: OBJECT_FILE.text, weight: 0.6 }]
            : []),
    ]);

    function highlightsFor(file: FileId): CodeHighlights | null {
        const callers = step.frames
            .slice(0, -1)
            .filter((f) => f.file === file)
            .map((f) => f.line);
        const current = step.file === file ? step.line : 0;
        if (!current && callers.length === 0) return null;
        return { current, callers, note: current ? step.note : undefined };
    }

    const state = (file: FileId) => (step.file === file ? 'running' : step.frames.some((f) => f.file === file) ? 'waiting' : '');
</script>

<div class="files">
    {#each files as file (file.id)}
        {@const status = state(file.id)}
        <section class="file" class:running={status === 'running'} class:idle={status === ''} style:flex-grow={file.weight}>
            <header class="file-header">
                <code class="name">{file.name}</code>
                {#if file.detail}<span class="detail">{file.detail}</span>{/if}
                {#if status}<span class="status {status}">{status}</span>{/if}
            </header>
            <CodePanel source={file.source} highlights={highlightsFor(file.id)} />
        </section>
    {/each}
</div>

<style>
    .files {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        min-height: 0;
    }

    .file {
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        min-height: 96px;
    }

    .file + .file {
        border-top: 1px solid var(--border);
    }

    .file-header {
        display: flex;
        align-items: baseline;
        gap: 10px;
        padding: 6px 16px;
        background: var(--surface-sunken);
        font-size: 0.8125rem;
    }

    .name {
        font-weight: 700;
    }

    .detail {
        min-width: 0;
        overflow: hidden;
        color: var(--text-muted);
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .status {
        margin-left: auto;
        padding: 0 8px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .status.running {
        background: var(--accent);
        color: var(--on-accent);
    }

    .status.waiting {
        background: var(--border);
        color: var(--text-muted);
    }

    .file.idle :global(.cm-content) {
        opacity: 0.6;
    }

    @media (max-width: 960px), (max-height: 600px) {
        .file {
            flex: none;
            height: 280px;
        }
    }
</style>
