<script lang="ts">
    // A bar between two panels: drag it, or focus it and use the arrow keys; double-click resets.

    let {
        orientation,
        label,
        value,
        min,
        max,
        area,
        onmove,
        onstep,
        onreset,
    }: {
        /** The bar's own direction: 'horizontal' between stacked panels, 'vertical' between columns. */
        orientation: 'horizontal' | 'vertical';
        label: string;
        /** The share it sets (0..1), or undefined while sized automatically. */
        value: number | undefined;
        min: number;
        max: number;
        /** Grid area, when the bar sits in a grid. */
        area?: string;
        /** Called while dragging. */
        onmove: (event: PointerEvent) => void;
        /** Called with ±0.05 for the arrow keys. */
        onstep: (delta: number) => void;
        onreset: () => void;
    } = $props();

    const keys = $derived(orientation === 'horizontal' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight']);
</script>

<!-- A focusable separator is an ARIA widget (a splitter), which Svelte's a11y check doesn't know. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
    class="splitter {orientation}"
    style:grid-area={area}
    role="separator"
    aria-orientation={orientation}
    aria-label="{label} (arrow keys, double-click to reset)"
    aria-valuemin={Math.round(min * 100)}
    aria-valuemax={Math.round(max * 100)}
    aria-valuenow={value === undefined ? undefined : Math.round(value * 100)}
    title="Drag to resize; double-click to reset"
    tabindex="0"
    onpointerdown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
    }}
    onpointermove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onmove(e);
    }}
    ondblclick={onreset}
    onkeydown={(e) => {
        const delta = e.key === keys[0] ? -0.05 : e.key === keys[1] ? 0.05 : 0;
        if (!delta) return;
        e.preventDefault();
        e.stopPropagation(); // not stepping or running again
        onstep(delta);
    }}
></div>

<style>
    .splitter {
        position: relative;
        flex: none;
        touch-action: none;
    }

    .splitter.horizontal {
        height: 16px;
        cursor: row-resize;
    }

    .splitter.vertical {
        width: 16px;
        cursor: col-resize;
    }

    .splitter::after {
        position: absolute;
        top: 50%;
        left: 50%;
        border-radius: 2px;
        background: var(--border-strong);
        content: '';
        transform: translate(-50%, -50%);
    }

    .horizontal::after {
        width: 48px;
        height: 4px;
    }

    .vertical::after {
        width: 4px;
        height: 48px;
    }

    .splitter:hover::after,
    .splitter:focus-visible::after {
        background: var(--accent);
    }

    .splitter:focus-visible {
        outline-offset: -2px;
    }

    /* Stacked layout: nothing to resize. */
    @media (max-width: 960px), (max-height: 600px) {
        .splitter {
            display: none;
        }
    }
</style>
