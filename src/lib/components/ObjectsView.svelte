<script lang="ts">
    import { type Step, identityText } from '../../model/index.ts';

    let { step }: { step: Step } = $props();

    /** In equals, `this` and `obj`; in the map, the key and the key it is compared with. */
    const inEquals = $derived(step.frames[step.frames.length - 1].label.includes('.equals('));

    function role(id: number): string {
        const { key, other } = step.focus;
        if (id === key && id === other) return 'key, same object';
        if (id === key) return inEquals ? 'this' : 'key';
        if (id === other) return inEquals ? 'obj' : 'pair.key';
        return '';
    }
</script>

<section class="objects" aria-label="Book objects">
    <h3 class="section-title">Book objects</h3>
    {#if step.objects.length === 0}
        <p class="none">No Book objects yet.</p>
    {:else}
        <ul>
            {#each step.objects as object (object.id)}
                {@const r = role(object.id)}
                <li
                    class="card"
                    class:key={object.id === step.focus.key}
                    class:other={object.id === step.focus.other && object.id !== step.focus.key}
                    style:--color="var(--object-{object.group % 6})"
                >
                    <div class="top">
                        <code class="name">{object.name}<span class="tag">{object.tag}</span></code>
                        {#if r}<span class="role">{r}</span>{/if}
                        <code class="identity" title="The object itself: what == compares, and what Object’s hashCode is based on">
                            {identityText(object.identity)}
                        </code>
                    </div>
                    <div class="title">{object.book.title}</div>
                    <div class="meta">{object.book.author} · {object.book.isbn}</div>
                </li>
            {/each}
        </ul>
    {/if}
</section>

<style>
    .objects {
        padding: 12px 16px 4px;
    }

    .section-title {
        margin: 0 0 8px;
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .none {
        margin: 0 0 8px;
        color: var(--text-faint);
        font-size: 0.875rem;
    }

    ul {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-min, 200px)), 1fr));
        gap: 8px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .card {
        min-width: 0;
        padding: 4px 10px 5px;
        border: 1px solid var(--border);
        border-left: 4px solid var(--color);
        border-radius: var(--radius-small);
        background: var(--surface);
        font-size: var(--card-font, 0.8125rem);
        transition:
            box-shadow 0.15s,
            border-color 0.15s;
    }

    .card.key {
        border-color: var(--accent);
        border-left-color: var(--color);
        box-shadow: 0 0 0 2px var(--accent);
    }

    .card.other {
        border-color: var(--compare);
        border-left-color: var(--color);
        box-shadow: 0 0 0 2px var(--compare);
    }

    .top {
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
    }

    .name {
        color: var(--color);
        font-size: 1.05em;
        font-weight: 700;
        white-space: nowrap;
    }

    .tag {
        font-weight: 400;
    }

    .role {
        padding: 0 6px;
        border-radius: 999px;
        background: var(--accent);
        color: var(--on-accent);
        font-size: 0.75em;
        font-weight: 600;
        white-space: nowrap;
    }

    .other .role {
        background: var(--compare);
    }

    .identity {
        margin-left: auto;
        overflow: hidden;
        color: var(--text-muted);
        font-size: 0.85em;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .title {
        overflow: hidden;
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .meta {
        overflow: hidden;
        color: var(--text-muted);
        font-size: 0.9em;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
