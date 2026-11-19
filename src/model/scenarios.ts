// The preset programs: a Main.java made from a list of statements.

export interface BookData {
    readonly isbn: string;
    readonly title: string;
    readonly author: string;
}

/** The books from the lesson's Main.java ("George" spelled correctly). */
export const BOOKS = {
    lotr: { isbn: '123-456', title: 'Lord of the Rings', author: 'J.R.R Tolkien' },
    got: { isbn: '123-457', title: 'Winds of winter', author: 'George R.R. Martin' },
    hgttg: { isbn: '123-458', title: 'Hitchhikers guide to the galaxy', author: 'Douglas Adams' },
    silmarillion: { isbn: '123-459', title: 'The Silmarillion', author: 'J.R.R Tolkien' },
} as const satisfies Record<string, BookData>;

export type BookId = keyof typeof BOOKS;

/** A key passed to the map: a variable, or a new Book written in the call. */
export type KeyRef = { readonly name: string } | { readonly copyOf: BookId };

export type Statement =
    | { readonly kind: 'book'; readonly name: string; readonly book: BookId }
    | { readonly kind: 'map' }
    | { readonly kind: 'print'; readonly text: string }
    | { readonly kind: 'blank' }
    | { readonly kind: 'put'; readonly key: KeyRef; readonly value: number }
    | { readonly kind: 'get'; readonly key: KeyRef }
    | { readonly kind: 'size' };

export interface Scenario {
    readonly id: string;
    readonly title: string;
    readonly statements: readonly Statement[];
}

export const MAP_NAME = 'loans';

export const SCENARIOS: readonly Scenario[] = [
    {
        id: 'loans',
        title: 'Loans (the lesson’s Main.java)',
        statements: [
            { kind: 'book', name: 'lotr', book: 'lotr' },
            { kind: 'book', name: 'got', book: 'got' },
            { kind: 'book', name: 'hgttg', book: 'hgttg' },
            { kind: 'book', name: 'got2', book: 'got' },
            { kind: 'book', name: 'silmarillion', book: 'silmarillion' },
            { kind: 'blank' },
            { kind: 'map' },
            { kind: 'print', text: 'Inserting loans' },
            { kind: 'put', key: { name: 'got' }, value: 1 },
            { kind: 'put', key: { name: 'lotr' }, value: 5 },
            { kind: 'put', key: { name: 'hgttg' }, value: 2 },
            { kind: 'put', key: { name: 'silmarillion' }, value: 0 },
            { kind: 'blank' },
            { kind: 'print', text: '---------------------' },
            { kind: 'print', text: 'Retrieving loans' },
            { kind: 'get', key: { name: 'got' } },
            { kind: 'get', key: { name: 'got2' } },
            { kind: 'get', key: { name: 'lotr' } },
            { kind: 'get', key: { name: 'silmarillion' } },
            { kind: 'get', key: { copyOf: 'silmarillion' } },
        ],
    },
    {
        id: 'overwrite',
        title: 'Overwrite or duplicate?',
        statements: [
            { kind: 'book', name: 'got', book: 'got' },
            { kind: 'book', name: 'got2', book: 'got' },
            { kind: 'blank' },
            { kind: 'map' },
            { kind: 'put', key: { name: 'got' }, value: 1 },
            { kind: 'put', key: { name: 'got' }, value: 2 },
            { kind: 'put', key: { name: 'got2' }, value: 3 },
            { kind: 'blank' },
            { kind: 'size' },
            { kind: 'get', key: { name: 'got' } },
            { kind: 'get', key: { name: 'got2' } },
        ],
    },
];

export const findScenario = (id: string | undefined): Scenario | undefined => SCENARIOS.find((s) => s.id === id);

const quote = (s: string) => `"${s}"`;

export const newBookText = (book: BookData): string =>
    `new Book(${[book.isbn, book.title, book.author].map(quote).join(', ')})`;

export const keyText = (key: KeyRef): string => ('name' in key ? key.name : newBookText(BOOKS[key.copyOf]));

/** The Java line of a statement, without indentation. */
export function statementText(s: Statement): string {
    switch (s.kind) {
        case 'book':
            return `Book ${s.name} = ${newBookText(BOOKS[s.book])};`;
        case 'map':
            return `HashMap<Book, Integer> ${MAP_NAME} = new HashMap<>();`;
        case 'print':
            return `System.out.println(${quote(s.text)});`;
        case 'blank':
            return '';
        case 'put':
            return `${MAP_NAME}.put(${keyText(s.key)}, ${s.value});`;
        case 'get':
            return `System.out.println(${MAP_NAME}.get(${keyText(s.key)}));`;
        case 'size':
            return `System.out.println(${MAP_NAME}.size());`;
    }
}

export interface MainFile {
    readonly text: string;
    /** 1-based line of each statement, in order. */
    readonly lines: readonly number[];
    readonly header: number;
    readonly end: number;
}

/** Main.java for a scenario. */
export function mainFile(scenario: Scenario): MainFile {
    const out = ['public class Main {', '', '    public static void main(String[] args) {'];
    const header = out.length;
    const lines: number[] = [];
    for (const s of scenario.statements) {
        const text = statementText(s);
        out.push(text ? `        ${text}` : '');
        lines.push(out.length);
    }
    out.push('    }');
    const end = out.length;
    out.push('}');
    return { text: out.join('\n'), lines, header, end };
}
