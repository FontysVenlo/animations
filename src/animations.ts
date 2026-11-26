import type { IconName } from './lib/components/Icon.svelte';

// Every animation on the site. The index page lists them in this order, and the "Report a
// problem" button pre-fills the issue form with `name` (keep it in sync with the `animation`
// dropdown in .github/ISSUE_TEMPLATE/bug.yml and idea.yml).

export const REPOSITORY = 'https://github.com/FontysVenlo/animations';

export interface Animation {
    /** Also the folder: src/<id>, <id>/index.html and the URL path. */
    readonly id: string;
    /** In the page header and on the index card. */
    readonly title: string;
    /** As listed in the issue forms. */
    readonly name: string;
    /** Course and lesson it belongs to. */
    readonly topic: string;
    readonly description: string;
    readonly icon: IconName;
}

export const ANIMATIONS: readonly Animation[] = [
    {
        id: 'hashmap',
        title: 'HashMap Visualiser',
        name: 'HashMap',
        topic: 'Java · MOOC part 8: hash maps',
        description: 'Step through a HashMap and see when hashCode and equals are called, for seven Book implementations.',
        icon: 'logo',
    },
    {
        id: 'inheritance',
        title: 'Inheritance Visualiser',
        name: 'Inheritance',
        topic: 'Java · MOOC part 9: inheritance and interfaces',
        description:
            'Which method is executed? See what the compiler checks with the static type, and how Java looks up the method from the dynamic type at runtime.',
        icon: 'hierarchy',
    },
    {
        id: 'git-graph',
        title: 'Git Graph Visualiser',
        name: 'Git graph',
        topic: 'Git · commits, branches and merges as a graph',
        description:
            'Replay a git session: every commit becomes a vertex and every parent an edge. Branches are labels, a merge has two parents, and an amended commit stays behind, unreachable.',
        icon: 'git',
    },
];

export const findAnimation = (id: string): Animation => {
    const animation = ANIMATIONS.find((a) => a.id === id);
    if (!animation) throw new Error(`No animation ${id}`);
    return animation;
};

/** The bug form, with the animation and the page (including the step) filled in. */
export function reportUrl(animation: Animation, link: string): string {
    const params = new URLSearchParams({ template: 'bug.yml', animation: animation.name, link });
    return `${REPOSITORY}/issues/new?${params}`;
}

/** The page that lets you choose between the issue forms. */
export const ISSUES_URL = `${REPOSITORY}/issues/new/choose`;
