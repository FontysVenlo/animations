<script lang="ts" module>
    export type IconName =
        | 'first'
        | 'prev'
        | 'play'
        | 'pause'
        | 'next'
        | 'last'
        | 'logo'
        | 'maximize'
        | 'restore'
        | 'fullscreen'
        | 'exit-fullscreen'
        | 'minimize'
        | 'expand'
        | 'prev-call'
        | 'next-call'
        | 'shuffle';
</script>

<script lang="ts">
    let { name, size = 18 }: { name: IconName; size?: number } = $props();
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
>
    {#if name === 'first'}
        <path d="M18 19 9 12l9-7z" fill="currentColor" /><path d="M6 5v14" />
    {:else if name === 'prev'}
        <path d="m15 18-6-6 6-6" />
    {:else if name === 'play'}
        <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    {:else if name === 'pause'}
        <path d="M8 5v14M16 5v14" stroke-width="3" />
    {:else if name === 'next'}
        <path d="m9 18 6-6-6-6" />
    {:else if name === 'last'}
        <path d="M6 5l9 7-9 7z" fill="currentColor" /><path d="M18 5v14" />
    {:else if name === 'prev-call'}
        <path d="m12 18-6-6 6-6M18 18l-6-6 6-6" />
    {:else if name === 'next-call'}
        <path d="m6 18 6-6-6-6M12 18l6-6-6-6" />
    {:else if name === 'shuffle'}
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
    {:else if name === 'logo'}
        <path d="M4 5h4M4 12h4M4 19h4M11 5h3M11 12h3M17 12h3" stroke-width="2.5" />
    {:else if name === 'maximize'}
        <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    {:else if name === 'restore'}
        <path d="M5 13h6v6M19 11h-6V5M13 11l7-7M4 20l7-7" />
    {:else if name === 'fullscreen'}
        <path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" />
    {:else if name === 'minimize'}
        <path d="M6 12h12" />
    {:else if name === 'expand'}
        <path d="m6 9 6 6 6-6" />
    {:else if name === 'exit-fullscreen'}
        <path d="M4 8h4V4M20 8h-4V4M8 20v-4H4M16 20v-4h4" />
    {/if}
</svg>
