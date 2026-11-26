import mapRaw from '../../../java/hashmap/HashMap.java?raw';
import objectRaw from '../../../java/hashmap/Object.java?raw';
import { identityHash, identityText, listIndex, nextInt, seeded, step71, stringHashCode } from './javaInt.ts';
import { type JavaFile, lineOf, parseJava } from '../../lib/lines.ts';
import { BOOKS, type BookData, type BookId, type KeyRef, MAP_NAME, type MainFile, type Scenario, mainFile } from './scenarios.ts';
import type { Variant } from './variants.ts';

// Runs a scenario with a Book variant through the simplified HashMap (java/HashMap.java) and
// records an immutable snapshot at every step. This follows the Java code by hand rather than
// interpreting it; the golden test (java.test.ts) checks that the console output matches what
// the real Java prints.

export type FileId = 'main' | 'map' | 'book' | 'object';

export const MAP_FILE = parseJava(mapRaw);
export const OBJECT_FILE = parseJava(objectRaw);
/** The number of lists in the map, as in `new ArrayList[8]`. */
export const LISTS = 8;

export interface BookObject {
    readonly id: number;
    /** The variable that refers to it, or `new Book(…)` for one written in a call. */
    readonly name: string;
    readonly book: BookData;
    /** Colour: objects with the same contents share one. */
    readonly group: number;
    /** ᵃ, ᵇ, … when other objects have the same contents, else ''. */
    readonly tag: string;
    /** What Object.hashCode() returns for it. */
    readonly identity: number;
}

export interface Pair {
    readonly id: number;
    readonly hash: number;
    /** Id of the key's BookObject. */
    readonly key: number;
    readonly value: number;
}

/** What happens to the pair being checked. */
export type Outcome = 'checking' | 'hash-differs' | 'same-object' | 'equals' | 'equal' | 'not-equal';

export interface Focus {
    /** The list the key's hash code picked. */
    readonly row?: number;
    /** How it was picked, e.g. Math.abs(-31495198 % 8) = 6. */
    readonly rowNote?: string;
    readonly pair?: number;
    readonly outcome?: Outcome;
    readonly added?: number;
    readonly replaced?: { readonly pair: number; readonly from: number };
    /** The key being stored or looked up. */
    readonly key?: number;
    /** The key it is compared with. */
    readonly other?: number;
}

export interface Var {
    readonly name: string;
    readonly text: string;
    /** The BookObject it refers to. */
    readonly object?: number;
}

export interface Frame {
    readonly id: number;
    readonly file: FileId;
    /** e.g. put(got, 1) or got2.equals(got). */
    readonly label: string;
    readonly line: number;
    readonly vars: readonly Var[];
}

export interface Counters {
    readonly hashCode: number;
    readonly equals: number;
}

export interface Step {
    /** Position in the full trace (with the steps inside hashCode and equals). */
    readonly seq: number;
    readonly file: FileId;
    readonly line: number;
    /** Shown at the end of the current line. */
    readonly note?: string;
    /** Bottom (main) to top (the running method). */
    readonly frames: readonly Frame[];
    readonly objects: readonly BookObject[];
    /** The map's lists, once the map exists. */
    readonly table?: readonly (readonly Pair[])[];
    readonly size: number;
    readonly focus: Focus;
    /** Everything printed so far. */
    readonly console: readonly string[];
    readonly counters: Counters;
    /** The map call (if any), then what this step does. */
    readonly narration: readonly string[];
    /** Inside Book's or Object's hashCode/equals: hidden when not stepping into them. */
    readonly inside: boolean;
    /** Index into Trace.calls. */
    readonly call?: number;
    readonly done: boolean;
}

export interface CallSummary {
    /** e.g. loans.get(got2) */
    readonly label: string;
    readonly row?: number;
    readonly hashCode: number;
    readonly equals: number;
    /** e.g. "added", "replaced 1 → 3", "1", "null". */
    readonly result: string;
    readonly firstSeq: number;
}

export interface Trace {
    readonly steps: readonly Step[];
    readonly calls: readonly CallSummary[];
    readonly main: MainFile;
    readonly console: readonly string[];
}

interface MutableFrame {
    id: number;
    file: FileId;
    label: string;
    line: number;
    vars: Var[];
}

export const bookText = (b: BookData): string => `${b.title} by ${b.author} (${b.isbn})`;

/** Name plus tag, e.g. got2ᵇ. */
export const objectName = (o: BookObject): string => o.name + o.tag;

const TAGS = 'ᵃᵇᶜᵈᵉᶠ';
const FIELDS = ['isbn', 'title', 'author'] as const;

export function simulate(variant: Variant, scenario: Scenario, seed: number): Trace {
    const main = mainFile(scenario);
    const files: Record<Exclude<FileId, 'main'>, JavaFile> = { map: MAP_FILE, book: variant.file, object: OBJECT_FILE };
    const identities = seeded(seed);
    const randoms = seeded(seed ^ 0x5bd1e995);

    const steps: Step[] = [];
    const calls: CallSummary[] = [];
    const frames: MutableFrame[] = [];
    let objects: BookObject[] = [];
    let table: Pair[][] | undefined;
    let size = 0;
    const out: string[] = [];
    const counters = { hashCode: 0, equals: 0 };
    let call: number | undefined;
    let callLabel = '';
    let callStart: Counters = { ...counters };
    /** Focus that holds for the following steps, e.g. the list being searched. */
    let context: Focus = {};
    let frameIds = 0;
    let pairIds = 0;

    const top = () => frames[frames.length - 1];
    const at = (label: string) => {
        const frame = top();
        frame.line = lineOf(files[frame.file as Exclude<FileId, 'main'>], label);
    };
    const setVar = (name: string, text: string, object?: number) => {
        const vars = top().vars;
        const i = vars.findIndex((v) => v.name === name);
        const v = { name, text, object };
        if (i >= 0) vars[i] = v;
        else vars.push(v);
    };
    const push = (file: FileId, label: string, vars: Var[]) => frames.push({ id: frameIds++, file, label, line: 0, vars });
    const pop = () => frames.pop();

    function emit(narration: string, options: { note?: string; focus?: Focus; done?: boolean } = {}) {
        const frame = top();
        steps.push({
            seq: steps.length,
            file: frame.file,
            line: frame.line,
            note: options.note,
            frames: frames.map((f) => ({ ...f, vars: [...f.vars] })),
            objects,
            table: table?.map((list) => [...list]),
            size,
            focus: { ...context, ...options.focus },
            console: [...out],
            counters: { ...counters },
            narration: call === undefined ? [narration] : [callLabel, narration],
            inside: frame.file === 'book' || frame.file === 'object',
            call,
            done: options.done ?? false,
        });
    }

    // Tags and colours: which contents occur more than once.
    const copies = new Map<BookId, number>();
    for (const s of scenario.statements) {
        const id = s.kind === 'book' ? s.book : (s.kind === 'put' || s.kind === 'get') && 'copyOf' in s.key ? s.key.copyOf : undefined;
        if (id) copies.set(id, (copies.get(id) ?? 0) + 1);
    }
    const groups = [...copies.keys()];
    const made = new Map<BookId, BookObject[]>();
    const variables = new Map<string, BookObject>();

    function create(name: string, id: BookId): BookObject {
        const earlier = made.get(id) ?? [];
        const object: BookObject = {
            id: objects.length,
            name,
            book: BOOKS[id],
            group: groups.indexOf(id),
            tag: (copies.get(id) ?? 0) > 1 ? TAGS[earlier.length] : '',
            identity: identityHash(identities),
        };
        made.set(id, [...earlier, object]);
        objects = [...objects, object];
        return object;
    }

    /** The first object with the same contents, if this one is a copy. */
    const original = (o: BookObject): BookObject | undefined => {
        const id = (Object.keys(BOOKS) as BookId[]).find((k) => BOOKS[k] === o.book)!;
        const first = made.get(id)?.[0];
        return first && first !== o ? first : undefined;
    };

    function beginCall(label: string) {
        call = calls.length;
        callLabel = label;
        callStart = { ...counters };
        calls.push({ label, hashCode: 0, equals: 0, result: '', firstSeq: steps.length });
    }

    function endCall(result: string, row?: number) {
        calls[call!] = {
            ...calls[call!],
            row,
            result,
            hashCode: counters.hashCode - callStart.hashCode,
            equals: counters.equals - callStart.equals,
        };
    }

    function leaveCall() {
        call = undefined;
        callLabel = '';
        context = {};
    }

    // ---- Book (or Object) methods ----

    function hashCode(key: BookObject): number {
        counters.hashCode++;
        const self: Var = { name: 'this', text: objectName(key), object: key.id };
        if (variant.hash === 'object') {
            push('object', `${objectName(key)}.hashCode()`, [self]);
            at('hash.identity');
            emit(
                `Book doesn’t override hashCode, so Object’s hashCode runs. It returns a number from the object’s identity, not from its fields: ${key.identity}.`,
                { note: `returns ${key.identity}` },
            );
            pop();
            return key.identity;
        }

        push('book', `${objectName(key)}.hashCode()`, [self]);
        at('hash.print');
        const line = `Calling hashCode on ${bookText(key.book)}`;
        out.push(line);
        emit(`Prints “${line}”.`);

        let hash: number;
        switch (variant.hash) {
            case 'generated': {
                hash = 5;
                at('hash.init');
                setVar('hash', '5');
                emit('hash starts at 5.', { note: 'hash = 5' });
                for (const field of FIELDS) {
                    const text = key.book[field];
                    const h = stringHashCode(text);
                    const next = step71(hash, h);
                    const wraps = 71 * hash + h !== next;
                    at(`hash.${field}`);
                    setVar('hash', String(next));
                    emit(
                        `Mixes in the ${field}: 71 * ${hash} + "${text}".hashCode() (${h}) = ${next}${wraps ? ', after the int overflows and wraps around' : ''}.`,
                        { note: `hash = ${next}` },
                    );
                    hash = next;
                }
                at('hash.return');
                emit(`Returns ${hash}.`, { note: `returns ${hash}` });
                break;
            }
            case 'constant':
                hash = 4;
                at('hash.return');
                emit('Returns 4, whatever the book: every key gets the same hash code.', { note: 'returns 4' });
                break;
            case 'random':
                hash = nextInt(randoms);
                at('hash.return');
                emit(`Returns a random number: ${hash}. The next call returns another one, even for the same book.`, {
                    note: `returns ${hash}`,
                });
                break;
            case 'author':
                hash = stringHashCode(key.book.author);
                at('hash.return');
                emit(`Returns the hash code of the author “${key.book.author}”: ${hash}. Books by the same author get the same one.`, {
                    note: `returns ${hash}`,
                });
                break;
        }
        pop();
        return hash;
    }

    function equals(self: BookObject, other: BookObject): boolean {
        counters.equals++;
        const vars: Var[] = [
            { name: 'this', text: objectName(self), object: self.id },
            { name: 'obj', text: objectName(other), object: other.id },
        ];
        const label = `${objectName(self)}.equals(${objectName(other)})`;
        const same = self === other;

        if (variant.equals === 'object') {
            push('object', label, vars);
            at('eq.identity');
            emit(
                same
                    ? 'Book doesn’t override equals, so Object’s equals runs: this == obj, the same object.'
                    : 'Book doesn’t override equals, so Object’s equals runs: this == obj is false. They are two different objects, even with the same fields.',
                { note: `returns ${same}` },
            );
            pop();
            return same;
        }

        push('book', label, vars);
        at('eq.print');
        const line = `Comparing to ${bookText(other.book)}`;
        out.push(line);
        emit(`Prints “${line}”.`);

        at('eq.same');
        emit(same ? 'this == obj: the same object.' : 'this == obj is false: two different objects, so the fields decide.', {
            note: `this == obj → ${same}`,
        });
        if (same) {
            at('eq.same-true');
            emit('Returns true.', { note: 'returns true' });
            pop();
            return true;
        }
        at('eq.null');
        emit('obj is not null.', { note: 'obj == null → false' });
        at('eq.class');
        emit('Both are Books.', { note: 'same class' });
        at('eq.cast');
        setVar('other', objectName(other), other.id);
        emit('Treats obj as a Book, so its fields can be compared.', { note: `other = ${objectName(other)}` });

        for (const field of ['isbn', 'title'] as const) {
            const a = self.book[field];
            const b = other.book[field];
            at(`eq.${field}`);
            if (a === b) {
                emit(`Same ${field}: “${a}”.`, { note: `same ${field}` });
                continue;
            }
            emit(`The ${field}s differ: “${a}” and “${b}”.`, { note: `"${a}" ≠ "${b}"` });
            at(`eq.${field}-false`);
            emit('Returns false.', { note: 'returns false' });
            pop();
            return false;
        }
        const result = self.book.author === other.book.author;
        at('eq.author');
        emit(result ? 'Same author too: returns true.' : 'The authors differ: returns false.', { note: `returns ${result}` });
        pop();
        return result;
    }

    // ---- HashMap methods ----

    function hashOf(key: BookObject, method: 'put' | 'get'): number {
        context = { key: key.id };
        at(`${method}.hash`);
        emit('First the map asks the key for its hash code.', { note: 'key.hashCode()' });
        const hash = hashCode(key);
        at(`${method}.hash`);
        setVar('hash', String(hash));
        emit(`hashCode() returned ${hash}.`, { note: `hash = ${hash}` });
        return hash;
    }

    function pickList(hash: number, method: 'put' | 'get'): number {
        const index = listIndex(hash, LISTS);
        const rowNote = `Math.abs(${hash} % ${LISTS}) = ${index}`;
        context = { ...context, row: index, rowNote };
        at(`${method}.index`);
        setVar('index', String(index));
        emit(`The hash code picks the list: ${rowNote}.`, { note: `index = ${index}` });
        return index;
    }

    /** The for loop and the if: the pair whose key matches, if any. */
    function search(key: BookObject, hash: number, index: number, method: 'put' | 'get'): Pair | undefined {
        const list = table![index];
        const listContext = context;
        if (list.length === 0) {
            at(`${method}.loop`);
            emit(`List ${index} is empty: there is no key to compare with.`, { note: 'empty list' });
            return undefined;
        }
        for (const [i, pair] of list.entries()) {
            const other = objects[pair.key];
            context = { ...listContext, pair: pair.id, other: other.id, outcome: 'checking' };
            at(`${method}.loop`);
            setVar('pair', `(${objectName(other)}, ${pair.value})`, other.id);
            emit(`Checks pair ${i + 1} of ${list.length} in list ${index}: the key ${objectName(other)}.`, {
                note: `pair ${i + 1} of ${list.length}`,
            });

            at(`${method}.check`);
            if (pair.hash !== hash) {
                emit(`Different hash codes (${pair.hash} and ${hash}), so these keys can’t be equal: equals is not called.`, {
                    note: `hash ${pair.hash} ≠ ${hash}`,
                    focus: { outcome: 'hash-differs' },
                });
                continue;
            }
            if (other === key) {
                emit('Same hash code and the same object (pair.key == key): found, without calling equals.', {
                    note: 'same hash, same object',
                    focus: { outcome: 'same-object' },
                });
                return pair;
            }
            context = { ...context, outcome: 'equals' };
            emit(`Same hash code (${hash}) but a different object: equals has to decide.`, {
                note: 'same hash → key.equals(pair.key)',
            });
            const equal = equals(key, other);
            at(`${method}.check`);
            context = { ...context, outcome: equal ? 'equal' : 'not-equal' };
            const more = i + 1 < list.length;
            emit(
                equal
                    ? `equals returned true: ${objectName(key)} and ${objectName(other)} are equal keys.`
                    : `equals returned false: not this key${more ? ', on to the next pair' : ''}.`,
                { note: `equals → ${equal}` },
            );
            if (equal) return pair;
        }
        context = listContext;
        return undefined;
    }

    function put(key: BookObject, value: number) {
        beginCall(`${MAP_NAME}.put(${objectName(key)}, ${value})`);
        context = { key: key.id };
        emit(`Stores the value ${value} under the key ${objectName(key)}.`);
        push('map', `put(${objectName(key)}, ${value})`, [
            { name: 'key', text: objectName(key), object: key.id },
            { name: 'value', text: String(value) },
        ]);
        const hash = hashOf(key, 'put');
        const index = pickList(hash, 'put');
        const found = search(key, hash, index, 'put');
        if (found) {
            const replaced = { ...found, value };
            table![index] = table![index].map((p) => (p === found ? replaced : p));
            at('put.replace');
            emit(`The key is already in the map, so its value ${found.value} is replaced by ${value}.`, {
                note: `value ${found.value} → ${value}`,
                focus: { pair: found.id, outcome: undefined, replaced: { pair: found.id, from: found.value } },
            });
            at('put.return');
            emit(`Done: the map still has ${size} pair${size === 1 ? '' : 's'}.`, { focus: { pair: found.id, outcome: undefined } });
            pop();
            endCall(`replaced ${found.value} → ${value}`, index);
        } else {
            const pair: Pair = { id: pairIds++, hash, key: key.id, value };
            table![index] = [...table![index], pair];
            at('put.add');
            emit(`No pair in list ${index} has this key, so a new pair (${objectName(key)}, ${value}) is added to it.`, {
                note: 'new pair',
                focus: { pair: pair.id, outcome: undefined, other: undefined, added: pair.id },
            });
            size++;
            at('put.size');
            emit(`size is now ${size}.`, { note: `size = ${size}`, focus: { pair: pair.id, outcome: undefined, other: undefined } });
            pop();
            endCall(`added to list ${index}`, index);
        }
        setMapVar();
        leaveCall();
    }

    function get(key: BookObject, line: number) {
        beginCall(`${MAP_NAME}.get(${objectName(key)})`);
        context = { key: key.id };
        emit(`Looks up the value for the key ${objectName(key)}.`);
        push('map', `get(${objectName(key)})`, [{ name: 'key', text: objectName(key), object: key.id }]);
        const hash = hashOf(key, 'get');
        const index = pickList(hash, 'get');
        const found = search(key, hash, index, 'get');
        let result: string;
        if (found) {
            at('get.found');
            result = String(found.value);
            emit(`Returns the value ${found.value}.`, { note: `returns ${found.value}`, focus: { pair: found.id } });
        } else {
            at('get.missing');
            result = 'null';
            const copyOf = original(key);
            emit(
                `No key in list ${index} equals ${objectName(key)}, so get returns null${copyOf ? `, although ${objectName(key)} has the same contents as ${objectName(copyOf)}` : ''}.`,
                { note: 'returns null', focus: { pair: undefined, other: undefined, outcome: undefined } },
            );
        }
        pop();
        top().line = line;
        out.push(result);
        emit(`Prints ${result}.`, { note: `prints ${result}` });
        endCall(result, index);
        leaveCall();
    }

    function sizeCall(line: number) {
        beginCall(`${MAP_NAME}.size()`);
        emit('Asks the map how many pairs it has.');
        push('map', 'size()', []);
        at('size.return');
        emit(`size() returns ${size}.`, { note: `returns ${size}` });
        pop();
        top().line = line;
        out.push(String(size));
        emit(`Prints ${size}.`, { note: `prints ${size}` });
        endCall(String(size));
        leaveCall();
    }

    const setMapVar = () => {
        const frame = frames[0];
        const i = frame.vars.findIndex((v) => v.name === MAP_NAME);
        frame.vars[i] = { name: MAP_NAME, text: `HashMap, size ${size}` };
    };

    function resolve(key: KeyRef): BookObject {
        if ('name' in key) return variables.get(key.name)!;
        return create('new Book(…)', key.copyOf);
    }

    // ---- main ----

    push('main', 'main(args)', []);
    top().line = main.header;
    emit('The program starts in main.');

    scenario.statements.forEach((s, i) => {
        const line = main.lines[i];
        top().line = line;
        switch (s.kind) {
            case 'blank':
                return;
            case 'book': {
                const object = create(s.name, s.book);
                variables.set(s.name, object);
                setVar(s.name, identityText(object.identity), object.id);
                const copyOf = original(object);
                emit(
                    copyOf
                        ? `${s.name} is a new Book with the same isbn, title and author as ${copyOf.name}: equal contents, but a different object.`
                        : `Creates a Book object; ${s.name} refers to it.`,
                    { note: identityText(object.identity), focus: { key: object.id } },
                );
                return;
            }
            case 'map':
                table = Array.from({ length: LISTS }, () => []);
                setVar(MAP_NAME, 'HashMap, size 0');
                emit(`Creates an empty HashMap: an array of ${LISTS} empty lists.`);
                return;
            case 'print':
                out.push(s.text);
                emit(`Prints “${s.text}”.`);
                return;
            case 'put':
                put(resolve(s.key), s.value);
                return;
            case 'get':
                get(resolve(s.key), line);
                return;
            case 'size':
                sizeCall(line);
                return;
        }
    });

    top().line = main.end;
    emit('Finished.', { done: true });

    return { steps, calls, main, console: out };
}
