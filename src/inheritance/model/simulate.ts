import type { CodeFile } from '../../lib/code.ts';
import { lineOf } from '../../lib/lines.ts';
import type { BaseStep, CallStart, Var } from '../../lib/trace.ts';
import {
    EXAMPLES,
    type Example,
    castCheck,
    declaration,
    hasImplementation,
    implementation,
    isInterface,
    isSubtype,
    ownMethod,
    qualified,
    supertypes,
    typeOf,
} from './hierarchy.ts';
import { type MainFile, type Selection, mainFile, objectData, printsResult, targetName, variableName } from './scenarios.ts';

// Runs a selection (static type, dynamic type, method or cast) and records an immutable snapshot
// at every step: first what the compiler checks, then what the JVM does. Like the HashMap
// animation it follows the Java code in code/inheritance by hand; the golden test (java.test.ts)
// checks that javac and java print exactly what the console shows.

export type Phase = 'compile' | 'run' | 'error' | 'exception' | 'done';
export type Tone = 'compile' | 'object' | 'found' | 'error';

export interface Badge {
    readonly text: string;
    readonly tone: Tone;
}

/** What the class diagram shows at a step. */
export interface View {
    readonly phase: Phase;
    /** Every type the object is (dashed). */
    readonly isa: readonly string[];
    /** What the compiler searches: the static type and its supertypes (blue). */
    readonly scope: readonly string[];
    /** The variable's type (thick border). */
    readonly static?: string;
    /** Runtime lookup: being checked now. */
    readonly lookup?: string;
    /** Runtime lookup: checked, no implementation there. */
    readonly visited: readonly string[];
    /** Where the implementation was found, or the type a cast succeeded to. */
    readonly found?: string;
    /** The type that is the problem. */
    readonly error?: string;
    /** Faded out. */
    readonly dim: readonly string[];
    readonly row?: { readonly type: string; readonly method: string; readonly kind: 'decl' | 'hit' };
    readonly badges: Readonly<Record<string, Badge>>;
    /** Shown under the diagram: `code` in backticks, **bold** in double stars, a new line per \n. */
    readonly explain: string;
}

export interface Step extends BaseStep {
    readonly view: View;
}

/** One method call: what the compiler checked and where the JVM found the code. */
export interface LookupCall extends CallStart {
    /** e.g. vehicle.move(), this.start() or super.toString(). */
    readonly label: string;
    /** The type the compiler checked: the variable's type, or the class the calling code is in. */
    readonly staticType: string;
    readonly declaredIn: string;
    readonly dynamicType: string;
    /** Where the lookup started: the dynamic type, or a superclass for super. */
    readonly startedAt: string;
    readonly foundIn: string;
    /** What it returned, '' for a void method. */
    readonly result: string;
    /** 0 for the call in Main, 1 for a call inside it, … */
    readonly depth: number;
    /** The step that found the implementation. */
    readonly foundSeq: number;
    /** The last step inside the call; after it, the call has returned. */
    readonly lastSeq: number;
}

export type Outcome = 'output' | 'compile-error' | 'exception';

export interface Trace {
    readonly steps: readonly Step[];
    readonly calls: readonly LookupCall[];
    readonly main: MainFile;
    /** The files in the code column: Main, the object's class and its superclasses, and what else is used. */
    readonly files: readonly CodeFile[];
    readonly console: readonly string[];
    readonly outcome: Outcome;
    /** javac's first error: its line in Main.java and its message, without the source and ^ lines. */
    readonly compileError?: { readonly line: number; readonly message: readonly string[] };
    /** The ClassCastException's message. */
    readonly exception?: string;
}

interface MutableFrame {
    id: number;
    file: string;
    label: string;
    line: number;
    vars: Var[];
}

type How = 'call' | 'self' | 'super';

interface Body {
    /** Move to a marked line of the running method's file. */
    at(label: string): void;
    step(short: string, explain: string, note?: string): void;
    print(text: string): void;
    /** A call on this, looked up from the dynamic type. */
    self(name: string): string;
    /** super.name(), looked up from the superclass of the class the code is in. */
    superCall(name: string): string;
    /** toString() inside a String concatenation: not shown step by step. */
    str(): string;
    readonly fields: Readonly<Record<string, string | number>>;
}

const BASE_VIEW: View = { phase: 'run', isa: [], scope: [], visited: [], dim: [], badges: {}, explain: '' };

const VOWEL = /^[AEIOU]/;
export const art = (name: string) => (VOWEL.test(name) ? 'an' : 'a');
const Art = (name: string) => (VOWEL.test(name) ? 'An' : 'A');

/** "a `X`, a `Y` and an `Z`" */
function listTypes(names: readonly string[]): string {
    const parts = names.map((n) => `${art(n)} \`${n}\``);
    return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const kindWord = (ex: Example, name: string) => ({ interface: 'interface', abstract: 'abstract class', class: 'class' })[typeOf(ex, name).kind];

const quote = (value: string, returns: string) => (returns === 'String' ? `"${value}"` : value);

export function simulate(selection: Selection): Trace {
    const ex = EXAMPLES[selection.example];
    const main = mainFile(selection);
    const { static: S, dynamic: D, method: m, target: T } = selection;
    const v = variableName(selection);
    const object = objectData(selection);
    const objectText = `${D} object`;
    const names = Object.keys(ex.types);
    const interfaces = names.filter((n) => isInterface(ex, n));
    const others = (keep: readonly string[]) => names.filter((n) => !keep.includes(n));
    const objectTypes = supertypes(ex, D);
    /** "A `Car` is also a `MotorizedVehicle`, … (dashed boxes)." */
    const alsoIs = () => {
        const rest = objectTypes.filter((t) => t !== D);
        return rest.length > 0 ? `${Art(D)} \`${D}\` is also ${listTypes(rest)} (dashed boxes).` : `${Art(D)} \`${D}\` is only ${art(D)} \`${D}\`.`;
    };

    const steps: Step[] = [];
    const calls: LookupCall[] = [];
    const frames: MutableFrame[] = [];
    const out: string[] = [];
    const used = new Set<string>();
    let frameIds = 0;
    /** The innermost call being made. */
    let call: number | undefined;
    /** >0 while working out toString() for a String concatenation. */
    let quiet = 0;

    const top = () => frames[frames.length - 1];
    const lineIn = (type: string, label: string) => lineOf(typeOf(ex, type).file, label);
    const setVar = (name: string, text: string) => {
        const vars = top().vars;
        const i = vars.findIndex((x) => x.name === name);
        if (i >= 0) vars[i] = { name, text };
        else vars.push({ name, text });
    };

    interface EmitOptions {
        note?: string;
        error?: boolean;
        inside?: boolean;
        done?: boolean;
        status?: string;
        marks?: { file: string; line: number }[];
        /** Show another line than the running frame's, e.g. a declaration the compiler found. */
        at?: { file: string; line: number };
    }

    function emit(short: string, view: Partial<View> & { explain: string }, options: EmitOptions = {}) {
        if (quiet > 0) return;
        const frame = top();
        const file = options.at?.file ?? frame.file;
        used.add(file);
        frames.forEach((f) => used.add(f.file));
        options.marks?.forEach((mark) => used.add(mark.file));
        steps.push({
            seq: steps.length,
            file,
            line: options.at?.line ?? frame.line,
            note: options.note,
            error: options.error,
            status: options.status,
            marks: options.marks,
            frames: frames.map((f) => ({ ...f, vars: [...f.vars] })),
            console: [...out],
            narration: call === undefined ? [short] : [calls[call].label, short],
            inside: options.inside ?? false,
            call,
            done: options.done ?? false,
            view: { ...BASE_VIEW, ...view },
        });
    }

    function finish(outcome: Outcome, extra: Pick<Trace, 'compileError' | 'exception'> = {}): Trace {
        // The object's class and its superclasses (but Object only when it runs), then whatever else was shown.
        const chain = supertypes(ex, D).filter((t) => !isInterface(ex, t) && (t !== 'Object' || D === 'Object'));
        const order = ['main', ...chain, ...names.filter((n) => !chain.includes(n) && used.has(n) && n !== 'Object'), ...(used.has('Object') && D !== 'Object' ? ['Object'] : [])];
        const files = order.map((id): CodeFile => {
            if (id === 'main') return { id, name: 'Main.java', source: main.text, weight: 1 };
            const t = typeOf(ex, id);
            const lines = t.file.text.split('\n').length;
            const detail = id === 'Object' ? 'from the JDK, shortened' : t.kind === 'class' ? '' : kindWord(ex, id);
            return { id, name: `${id}.java`, detail, source: t.file.text, weight: Math.min(1.6, Math.max(0.45, lines / 16)) };
        });
        return { steps, calls, main, files, console: out, outcome, ...extra };
    }

    function compileError(line: number, message: string[], short: string, view: Partial<View> & { explain: string }): Trace {
        out.push(`Main.java:${line}: ${message[0]}`, ...message.slice(1), '1 error');
        top().line = line;
        emit(short, { ...view, phase: 'error' }, { error: true, status: 'compile error', done: true });
        return finish('compile-error', { compileError: { line, message } });
    }

    // ---- Method bodies, as in code/inheritance ----

    const returns = (body: Body, label: string, value: string, explain: string) => {
        body.at(label);
        body.step(`Returns ${value}.`, explain, `returns ${value}`);
    };
    const getter = (field: string, returnType: string) => (body: Body) => {
        const value = String(body.fields[field]);
        returns(body, `${getterName(field)}.return`, quote(value, returnType), `Returns the field \`${field}\`.`);
        return value;
    };
    const getterName = (field: string) => `get${field.charAt(0).toUpperCase()}${field.slice(1)}`;
    const hex = object.identity.toString(16);

    const BODIES: Readonly<Record<string, Readonly<Record<string, (body: Body) => string>>>> = {
        Object: {
            toString: (body: Body) => {
                const text = `${qualified(D)}@${hex}`;
                returns(body, 'toString.return', `"${text}"`, "`Object`'s `toString()`: the class name, `@` and the hash code in hexadecimal.");
                return text;
            },
            hashCode: (body) => {
                body.at('hashCode');
                const text = String(object.identity);
                body.step(`Returns ${text}.`, "`Object`'s `hashCode()` is native code: a number from the object's identity, not from its fields. A real run prints another number.", `returns ${text}`);
                return text;
            },
        },
        Part: {
            getIdentifier: getter('identifier', 'String'),
            getDescription: getter('description', 'String'),
            getManufacturer: getter('manufacturer', 'String'),
            toString: (body: Body) => {
                const f = body.fields;
                const text = `${f.identifier}: ${f.description} by ${f.manufacturer}`;
                returns(body, 'toString.return', `"${text}"`, "`Part`'s `toString()`.");
                return text;
            },
        },
        Engine: {
            getType: getter('type', 'String'),
            toString: (body: Body) => {
                body.at('toString.return');
                const text = `${body.superCall('toString')} (${body.fields.type})`;
                body.step(`Returns "${text}".`, "`Engine`'s `toString()` adds the type to what `Part`'s `toString()` returned.", `returns "${text}"`);
                return text;
            },
        },
        ElectricEngine: {
            getRange: getter('range', 'int'),
        },
        Vehicle: {
            getBrand: getter('brand', 'String'),
            getModel: getter('model', 'String'),
            toString: (body: Body) => {
                const text = `${body.fields.brand} ${body.fields.model}`;
                returns(body, 'toString.return', `"${text}"`, "`Vehicle`'s `toString()`.");
                return text;
            },
        },
        MotorizedVehicle: {
            getEngine: (body) => {
                const text = String(body.fields.engine);
                returns(body, 'getEngine.return', 'engine', 'Returns the `Engine` object; printing it calls its `toString()`.');
                return text;
            },
            startEngine: (body) => {
                body.at('startEngine.print');
                body.print(`The ${body.fields.engineType} engine of the ${body.str()} is running`);
                return '';
            },
            move: (body) => {
                body.at('move.start');
                body.self('start');
                body.at('move.print');
                body.print(`The ${body.str()} drives away`);
                return '';
            },
        },
        Car: {
            start: (body) => {
                body.at('start.print');
                body.print(`Turn the key of the ${body.str()}`);
                body.at('start.engine');
                body.self('startEngine');
                return '';
            },
        },
        Motorcycle: {
            start: (body) => {
                body.at('start.print');
                body.print(`Press the start button of the ${body.str()}`);
                body.at('start.engine');
                body.self('startEngine');
                return '';
            },
        },
        Bicycle: {
            move: (body) => {
                body.at('move.print');
                body.print(`Pedal the ${body.str()}`);
                return '';
            },
        },
    };

    /** Look up `name` from `start`, run it and return its result. */
    function invoke(name: string, start: string, how: How, label: string, staticType: string, caller?: { type: string; method: string }): string {
        const declaredIn = declaration(ex, staticType, name)!;
        const returnType = ownMethod(ex, declaredIn, name)!.returns;
        const index = calls.length;
        const outer = call;
        if (quiet === 0) {
            calls.push({ label, staticType, declaredIn, dynamicType: D, startedAt: start, foundIn: '', result: '', firstSeq: steps.length, depth: frames.length - 1, foundSeq: -1, lastSeq: -1 });
            call = index;
        }

        const intro = {
            call: `Java looks for an implementation of \`${name}()\`, starting at the **dynamic** type \`${start}\`.`,
            self: `\`${caller?.type}.${caller?.method}()\` calls \`${name}()\` on \`this\`. \`this\` is still the \`${D}\` object, so the lookup starts again at the **dynamic** type \`${D}\`, not at \`${caller?.type}\` where this code is.`,
            super: `\`super.${name}()\` starts the lookup in the **superclass** of \`${caller?.type}\`, the class this code is in: \`${start}\`.`,
        }[how];
        const shortIntro = {
            call: `Look for ${name}() from the dynamic type ${start}.`,
            self: `${name}() on this: look again from the dynamic type ${D}.`,
            super: `super.${name}(): look from ${start}, the superclass of ${caller?.type}.`,
        }[how];
        emit(shortIntro, { lookup: start, dim: interfaces, badges: { [D]: { text: 'object', tone: 'object' } }, explain: intro });

        const visited: string[] = [];
        const misses = () => Object.fromEntries(visited.map((t): [string, Badge] => [t, { text: '✗', tone: 'error' }]));
        let impl: string | undefined;
        for (let c: string | undefined = start; c; c = typeOf(ex, c).parent) {
            if (hasImplementation(ex, c, name)) {
                impl = c;
                emit(
                    `${c} has ${name}(): run it.`,
                    {
                        found: c,
                        visited: [...visited],
                        dim: interfaces,
                        row: { type: c, method: name, kind: 'hit' },
                        badges: { ...misses(), [c]: { text: '✓', tone: 'found' } },
                        explain: `Does \`${c}\` have an implementation of \`${name}()\`? **Yes**: \`${c}.${name}()\` runs.`,
                    },
                );
                if (quiet === 0) calls[index] = { ...calls[index], foundSeq: steps.length - 1 };
                break;
            }
            const parent = typeOf(ex, c).parent;
            emit(
                `${c} has no ${name}(): look in ${parent}.`,
                {
                    lookup: c,
                    visited: [...visited],
                    dim: interfaces,
                    badges: misses(),
                    explain: `Does \`${c}\` have an implementation of \`${name}()\`? **No**: look in its superclass \`${parent}\`.`,
                },
                { inside: true },
            );
            visited.push(c);
        }
        if (!impl) throw new Error(`No implementation of ${name} for ${D}`);
        const runs = impl;

        frames.push({ id: frameIds++, file: runs, label: `${name}()`, line: lineIn(runs, name), vars: [{ name: 'this', text: objectText }] });
        const body: Body = {
            at: (marker) => (top().line = lineIn(runs, marker)),
            step: (short, explain, note) => emit(short, { found: runs, dim: interfaces, explain }, { note }),
            print: (text) => {
                if (quiet === 0) out.push(text);
                emit(`Prints: ${text}`, { found: runs, dim: interfaces, explain: `\`System.out.println\` prints: \`${text}\`` });
            },
            self: (callee) => invoke(callee, D, 'self', `this.${callee}()`, runs, { type: runs, method: name }),
            superCall: (callee) => invoke(callee, typeOf(ex, runs).parent!, 'super', `super.${callee}()`, typeOf(ex, runs).parent!, { type: runs, method: name }),
            str: () => {
                quiet++;
                try {
                    return invoke('toString', D, 'self', 'this.toString()', runs);
                } finally {
                    quiet--;
                }
            },
            fields: object.fields,
        };
        const result = BODIES[runs][name](body);
        frames.pop();

        if (quiet === 0) {
            calls[index] = { ...calls[index], foundIn: runs, result: returnType === 'void' ? '' : quote(result, returnType), lastSeq: steps.length - 1 };
            if (returnType === 'void' && frames.length > 0) {
                const back = top();
                emit(`${runs}.${name}() is finished.`, {
                    dim: interfaces,
                    explain: `\`${runs}.${name}()\` is finished: back in \`${back.file === 'main' ? 'Main.main' : `${back.file}.${back.label.replace('()', '')}`}()\`.`,
                });
            }
            call = outer;
        }
        return result;
    }

    // ---- Compile time ----

    frames.push({ id: frameIds++, file: 'main', label: 'main(args)', line: main.declaration, vars: [] });

    if (!isSubtype(ex, D, S)) {
        emit(
            `Compile time: can ${art(S)} ${S} variable refer to ${art(D)} ${D}?`,
            {
                phase: 'compile',
                isa: objectTypes,
                static: S,
                dim: others([...objectTypes, S]),
                badges: { [D]: { text: `new ${D}`, tone: 'object' } },
                explain: `**Compile time.** Can ${art(S)} \`${S}\` variable refer to ${art(D)} \`${D}\`? Only if ${art(D)} \`${D}\` **is ${art(S)}** \`${S}\`.`,
            },
            { status: 'compiler' },
        );
        return compileError(main.declaration, [`error: incompatible types: ${D} cannot be converted to ${S}`], `Compile error: ${art(D)} ${D} is not ${art(S)} ${S}.`, {
            isa: objectTypes,
            error: S,
            dim: others([...objectTypes, S]),
            badges: { [D]: { text: `new ${D}`, tone: 'object' }, [S]: { text: '✗', tone: 'error' } },
            explain: `Can ${art(S)} \`${S}\` variable refer to ${art(D)} \`${D}\`? ${alsoIs()} \`${S}\` is not one of them, so the code **does not compile**.`,
        });
    }
    emit(
        S === D ? `Compile time: ${S} ${v} = new ${D}(…) is fine.` : `Compile time: can ${art(S)} ${S} variable refer to ${art(D)} ${D}? Yes.`,
        {
            phase: 'compile',
            isa: objectTypes,
            static: S,
            dim: others(objectTypes),
            badges: S === D ? {} : { [D]: { text: `new ${D}`, tone: 'object' } },
            explain:
                S === D
                    ? `**Compile time.** The variable and the object have the same type, \`${S}\`. ${alsoIs()}`
                    : `**Compile time.** Can ${art(S)} \`${S}\` variable refer to ${art(D)} \`${D}\`? ${alsoIs()} \`${S}\` is one of them, so **yes**: this is an upcast, which is always allowed.`,
        },
        { status: 'compiler' },
    );

    top().line = main.action;
    if (selection.mode === 'call') {
        const scope = supertypes(ex, S);
        emit(
            `The compiler looks for ${m}() in ${S} and its supertypes.`,
            {
                phase: 'compile',
                scope,
                static: S,
                dim: others(scope),
                explain:
                    `The compiler only knows the **static** type \`${S}\`. It does not know (or care) that the object will be ${art(D)} \`${D}\`. It looks for \`${m}()\` in \`${S}\` and its supertypes (blue).` +
                    (isInterface(ex, S) ? ` Every object is an \`Object\`, so for an interface the methods of \`Object\` are there too.` : ''),
            },
            { status: 'compiler' },
        );
        const declaredIn = declaration(ex, S, m);
        if (!declaredIn) {
            const objectHasIt = implementation(ex, D, m) !== undefined;
            return compileError(main.action, ['error: cannot find symbol', `  symbol:   method ${m}()`, `  location: variable ${v} of type ${S}`], `Compile error: ${S} has no ${m}().`, {
                scope,
                static: S,
                error: S,
                dim: others(scope),
                badges: { [S]: { text: '✗', tone: 'error' } },
                explain:
                    `\`${m}()\` is not in \`${S}\` or one of its supertypes, so the code **does not compile**.` +
                    (objectHasIt ? ` That is so even though ${art(D)} \`${D}\` **does** have \`${m}()\`: the compiler only looks at the static type. A cast would be needed.` : ''),
            });
        }
        const abstract = ownMethod(ex, declaredIn, m)!.abstract;
        emit(
            `Found ${m}() in ${declaredIn}: the code compiles.`,
            {
                phase: 'compile',
                scope,
                static: S,
                dim: others(scope),
                row: { type: declaredIn, method: m, kind: 'decl' },
                badges: { [declaredIn]: { text: '✓', tone: 'compile' } },
                explain:
                    `Found: \`${m}()\` is declared in the ${kindWord(ex, declaredIn)} \`${declaredIn}\`` +
                    (abstract ? ', without an implementation. That is fine: every class you can create an object of must implement it.' : '.') +
                    ' The code compiles. The compiler does **not** decide which implementation will run.',
            },
            { status: 'compiler', at: { file: declaredIn, line: lineIn(declaredIn, m) }, marks: [{ file: 'main', line: main.action }] },
        );
    } else {
        const check = castCheck(ex, S, T);
        if (check === 'impossible') {
            return compileError(main.action, [`error: incompatible types: ${S} cannot be converted to ${T}`], `Compile error: ${art(S)} ${S} can never be ${art(T)} ${T}.`, {
                scope: [S, T],
                static: S,
                error: T,
                dim: others([S, T]),
                badges: { [T]: { text: '✗', tone: 'error' } },
                explain: `${Art(S)} \`${S}\` can **never** be ${art(T)} \`${T}\`: they are in different branches of the hierarchy. The compiler knows this cast can never work, so the code **does not compile**.`,
            });
        }
        emit(
            check === 'upcast' ? `Upcast to ${T}: always allowed.` : `Downcast to ${T}: compiles, checked at runtime.`,
            {
                phase: 'compile',
                scope: [S, T],
                static: S,
                dim: others([S, T]),
                badges: { [T]: { text: check === 'upcast' ? '✓' : '?', tone: 'compile' } },
                explain:
                    check === 'upcast'
                        ? `**Upcast**: every \`${S}\` is ${art(T)} \`${T}\`, so this is always allowed. The cast isn't even needed.`
                        : `**Downcast**: ${art(S)} \`${S}\` *might* be ${art(T)} \`${T}\`` +
                          (isInterface(ex, T) || isInterface(ex, S) ? ' (a subclass could implement the interface)' : ` (\`${T}\` is a subtype of \`${S}\`)`) +
                          '. The compiler trusts you, so it compiles, but Java checks it when the program runs.',
            },
            { status: 'compiler' },
        );
    }

    // ---- Runtime ----

    if (main.before !== undefined) {
        top().line = main.before;
        setVar('engine', 'Engine object');
        emit('The program runs: first the Engine is created.', { dim: interfaces, explain: 'The program runs. First the `Engine` that the vehicle gets is created.' });
    }
    top().line = main.declaration;
    setVar(v, objectText);
    emit(`Creates ${art(D)} ${D}: ${v} refers to it.`, {
        lookup: D,
        dim: interfaces,
        badges: { [D]: { text: 'object', tone: 'object' } },
        explain: `The program runs, and only now is the object created: ${art(D)} \`${D}\`. \`${v}\` has static type \`${S}\`, but from here on the **dynamic** type \`${D}\` decides which code runs.`,
    });

    top().line = main.action;
    if (selection.mode === 'cast') {
        const t = targetName(selection);
        emit(`Is ${art(D)} ${D} ${art(T)} ${T}?`, {
            isa: objectTypes,
            lookup: D,
            dim: others([...objectTypes, T]),
            badges: { [T]: { text: '?', tone: 'compile' } },
            explain: `The program runs and Java checks the **dynamic** type: the object is ${art(D)} \`${D}\`. ${alsoIs()} Is \`${T}\` one of them?`,
        });
        if (!isSubtype(ex, D, T)) {
            const modules = D === 'Object' ? `java.lang.Object is in module java.base of loader 'bootstrap'; ${T} is in unnamed module of loader 'app'` : `${D} and ${T} are in unnamed module of loader 'app'`;
            const message = `class ${qualified(D)} cannot be cast to class ${T} (${modules})`;
            out.push(`Exception in thread "main" java.lang.ClassCastException: ${message}`, `\tat Main.main(Main.java:${main.action})`);
            emit(
                `ClassCastException: ${art(D)} ${D} is not ${art(T)} ${T}.`,
                {
                    phase: 'exception',
                    isa: objectTypes,
                    error: T,
                    dim: others([...objectTypes, T]),
                    badges: { [T]: { text: '✗', tone: 'error' } },
                    explain: `**No**, ${art(D)} \`${D}\` is not ${art(T)} \`${T}\`: Java throws a \`ClassCastException\` and the program stops.\nCheck the dynamic type first: \`if (${v} instanceof ${T} ${t}) { … }\``,
                },
                { error: true, status: 'exception', done: true },
            );
            return finish('exception', { exception: message });
        }
        setVar(t, objectText);
        emit(`Yes: ${t} refers to the same ${D}.`, {
            isa: objectTypes,
            found: T,
            dim: others([...objectTypes, T]),
            badges: { [T]: { text: '✓', tone: 'found' } },
            explain: `**Yes**, ${art(D)} \`${D}\` is ${art(T)} \`${T}\`: the cast works. \`${t}\` refers to the **same object** as \`${v}\`, now with static type \`${T}\`, so the methods of \`${T}\` can be called on it.`,
        });
        top().line = main.end;
        emit('Done.', { phase: 'done', isa: objectTypes, found: T, dim: others([...objectTypes, T]), explain: `Done: the cast to \`${T}\` worked because the object, ${art(D)} \`${D}\`, is ${art(T)} \`${T}\`.` }, { done: true });
        return finish('output');
    }

    const result = invoke(m, D, 'call', `${v}.${m}()`, S);
    const ran = implementation(ex, D, m)!;
    if (printsResult(selection)) {
        out.push(result);
        emit(`Prints ${result}.`, { found: ran, dim: interfaces, explain: `\`System.out.println\` prints the returned value: \`${result}\`` });
    }
    top().line = main.end;
    emit(
        `Done: ${S} allowed the call, the ${D} object ran ${ran}.${m}().`,
        {
            phase: 'done',
            scope: [S],
            static: S,
            found: ran,
            dim: interfaces.filter((i) => i !== S),
            badges: ran === S ? { [S]: { text: 'static type, ran', tone: 'found' } } : { [S]: { text: 'static type', tone: 'compile' }, [ran]: { text: 'ran', tone: 'found' } },
            explain: `**Compile time:** the static type \`${S}\` decided that \`${v}.${m}()\` is allowed.\n**Runtime:** the dynamic type \`${D}\` decided that \`${ran}.${m}()\` runs. This is **polymorphism**.`,
        },
        { done: true },
    );
    return finish('output');
}
