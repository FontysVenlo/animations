<script lang="ts">
    import type { EditorView } from '@codemirror/view';
    import { onMount } from 'svelte';
    import { type CodeHighlights, createView, followLine, showCode } from '../codemirror.ts';

    let { source, highlights }: { source: string; highlights: CodeHighlights | null } = $props();

    let host: HTMLDivElement;
    let view = $state.raw<EditorView>();

    onMount(() => {
        const created = createView(host, source);
        view = created;
        return () => created.destroy();
    });

    $effect(() => {
        if (!view) return;
        showCode(view, source, highlights);
        // The running line, or else the call waiting in this file.
        const line = highlights?.current || highlights?.callers[highlights.callers.length - 1] || 0;
        // After CodeMirror has laid out the new state.
        const frame = requestAnimationFrame(() => followLine(view!, host, line));
        return () => cancelAnimationFrame(frame);
    });
</script>

<div class="code" bind:this={host}></div>

<style>
    .code {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
    }
</style>
