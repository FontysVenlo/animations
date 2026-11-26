<script lang="ts" module>
    export type Part = { kind: 'text' | 'code' | 'bold' | 'italic' | 'br'; text: string };

    /** `code`, **bold**, *italic* and new lines in an explanation. */
    export function parse(text: string): Part[] {
        return text
            .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\n)/)
            .filter((part) => part !== '')
            .map((part): Part => {
                if (part === '\n') return { kind: 'br', text: '' };
                if (part.startsWith('`')) return { kind: 'code', text: part.slice(1, -1) };
                if (part.startsWith('**')) return { kind: 'bold', text: part.slice(2, -2) };
                if (part.startsWith('*') && part.length > 2) return { kind: 'italic', text: part.slice(1, -1) };
                return { kind: 'text', text: part };
            });
    }
</script>

<script lang="ts">
    let { text }: { text: string } = $props();
</script>

{#each parse(text) as part, i (i)}{#if part.kind === 'code'}<code>{part.text}</code>{:else if part.kind === 'bold'}<strong>{part.text}</strong>{:else if part.kind === 'italic'}<em>{part.text}</em>{:else if part.kind === 'br'}<br />{:else}{part.text}{/if}{/each}

<style>
    /* On a sunken background (an explanation box); --rich-code sets another. */
    code {
        padding: 0 4px;
        border-radius: 4px;
        background: var(--rich-code, var(--surface));
        font-family: var(--font-mono);
        font-size: 0.875em;
    }
</style>
