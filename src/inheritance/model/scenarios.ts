import { EXAMPLES, type ExampleId, isConcrete } from './hierarchy.ts';

// What the student chooses (example, static type, dynamic type, method or cast), the presets,
// and the Main.java that is generated from it.

export type Mode = 'call' | 'cast';

export interface Selection {
    readonly example: ExampleId;
    readonly mode: Mode;
    /** The variable's type. */
    readonly static: string;
    /** The object's class. */
    readonly dynamic: string;
    /** The method called, in call mode. */
    readonly method: string;
    /** The type cast to, in cast mode. */
    readonly target: string;
}

export interface Preset {
    readonly id: string;
    readonly title: string;
    readonly selection: Selection;
}

const call = (example: ExampleId, S: string, D: string, method: string): Selection => ({
    example,
    mode: 'call',
    static: S,
    dynamic: D,
    method,
    target: D,
});

const cast = (example: ExampleId, S: string, D: string, target: string): Selection => ({
    example,
    mode: 'cast',
    static: S,
    dynamic: D,
    method: EXAMPLES[example].callable[0],
    target,
});

/** The first preset of each example is where that example starts. */
export const PRESETS: readonly Preset[] = [
    { id: 'search-upwards', title: 'Search upwards, then super', selection: call('parts', 'Part', 'ElectricEngine', 'toString') },
    { id: 'override', title: 'Override', selection: call('parts', 'Part', 'Engine', 'toString') },
    { id: 'static-object', title: 'Static type Object', selection: call('parts', 'Object', 'Engine', 'toString') },
    { id: 'compile-error', title: 'Static type hides getType()', selection: call('parts', 'Part', 'Engine', 'getType') },
    { id: 'from-object', title: 'Inherited from Object', selection: call('parts', 'Part', 'Part', 'hashCode') },
    { id: 'downcast', title: 'Downcast that works', selection: cast('parts', 'Part', 'Engine', 'Engine') },
    { id: 'class-cast', title: 'ClassCastException', selection: cast('parts', 'Part', 'Part', 'Engine') },
    { id: 'self-call', title: 'move() calls start()', selection: call('vehicles', 'Vehicle', 'Car', 'move') },
    { id: 'interface-type', title: 'Interface as type', selection: call('vehicles', 'Moveable', 'Bicycle', 'move') },
    { id: 'hidden-start', title: 'Static type hides start()', selection: call('vehicles', 'Moveable', 'Car', 'start') },
    { id: 'object-methods', title: "Object's methods via an interface", selection: call('vehicles', 'Moveable', 'Motorcycle', 'toString') },
    { id: 'cast-interface', title: 'Cast to an interface fails', selection: cast('vehicles', 'Vehicle', 'Bicycle', 'Startable') },
    { id: 'impossible-cast', title: 'Impossible cast', selection: cast('vehicles', 'Bicycle', 'Bicycle', 'Car') },
];

export const DEFAULT_SELECTION = PRESETS[0].selection;

export const sameSelection = (a: Selection, b: Selection) =>
    a.example === b.example &&
    a.mode === b.mode &&
    a.static === b.static &&
    a.dynamic === b.dynamic &&
    (a.mode === 'call' ? a.method === b.method : a.target === b.target);

export const presetOf = (selection: Selection): Preset | undefined => PRESETS.find((p) => sameSelection(p.selection, selection));
export const findPreset = (id: string | undefined): Preset | undefined => PRESETS.find((p) => p.id === id);
export const firstPreset = (example: ExampleId): Preset => PRESETS.find((p) => p.selection.example === example)!;

/** Keeps every field valid for its example; anything unknown falls back to the example's start. */
export function normalise(selection: Partial<Selection>): Selection {
    const example = selection.example && selection.example in EXAMPLES ? selection.example : DEFAULT_SELECTION.example;
    const ex = EXAMPLES[example];
    const start = firstPreset(example).selection;
    const known = (name: string | undefined) => name !== undefined && name in ex.types;
    return {
        example,
        mode: selection.mode === 'cast' ? 'cast' : 'call',
        static: known(selection.static) ? selection.static! : start.static,
        dynamic: known(selection.dynamic) && isConcrete(ex, selection.dynamic!) ? selection.dynamic! : start.dynamic,
        method: selection.method && ex.callable.includes(selection.method) ? selection.method : start.method,
        target: known(selection.target) ? selection.target! : start.target,
    };
}

/** An object as Main creates it. */
export interface ObjectData {
    /** e.g. new Car("Volvo", "XC40", engine) */
    readonly create: string;
    /** A line Main needs first, e.g. the Engine a Car gets. */
    readonly before?: string;
    readonly fields: Readonly<Record<string, string | number>>;
    /** What Object.hashCode() returns for it (a real run prints another number). */
    readonly identity: number;
}

const OBJECT: ObjectData = { create: 'new Object()', fields: {}, identity: 0x6d06d69c };

export const OBJECTS: Readonly<Record<ExampleId, Readonly<Record<string, ObjectData>>>> = {
    parts: {
        Object: OBJECT,
        Part: {
            create: 'new Part("P-100", "Michelin", "Wheel")',
            fields: { identifier: 'P-100', manufacturer: 'Michelin', description: 'Wheel' },
            identity: 0x7ad041f3,
        },
        Engine: {
            create: 'new Engine("E-100", "Ford", "V8")',
            fields: { identifier: 'E-100', manufacturer: 'Ford', description: 'V8', type: 'combustion' },
            identity: 0x251a69d7,
        },
        ElectricEngine: {
            create: 'new ElectricEngine("E-103", "Tesla", "Model 3 motor", 500)',
            fields: { identifier: 'E-103', manufacturer: 'Tesla', description: 'Model 3 motor', type: 'electric', range: 500 },
            identity: 0x4e25154f,
        },
    },
    vehicles: {
        Object: OBJECT,
        Car: {
            create: 'new Car("Volvo", "XC40", engine)',
            before: 'Engine engine = new Engine("E-200", "Volvo", "B4");',
            fields: { brand: 'Volvo', model: 'XC40', engineType: 'combustion', engine: 'E-200: B4 by Volvo (combustion)' },
            identity: 0x70dea4e,
        },
        Motorcycle: {
            create: 'new Motorcycle("Honda", "CB500F", engine)',
            before: 'Engine engine = new Engine("E-300", "Honda", "Twin");',
            fields: { brand: 'Honda', model: 'CB500F', engineType: 'combustion', engine: 'E-300: Twin by Honda (combustion)' },
            identity: 0x5c647e05,
        },
        Bicycle: {
            create: 'new Bicycle("Gazelle", "Ultimate")',
            fields: { brand: 'Gazelle', model: 'Ultimate' },
            identity: 0x33909752,
        },
    },
};

export const objectData = (selection: Selection): ObjectData => OBJECTS[selection.example][selection.dynamic];

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The variable: its type in lower camel case, e.g. `vehicle`. */
export const variableName = (selection: Selection) => lowerFirst(selection.static);

/** The variable the cast is assigned to; never the same name as the first. */
export function targetName(selection: Selection): string {
    const name = lowerFirst(selection.target);
    return name === variableName(selection) ? `${name}2` : name;
}

/** Whether the method's result is printed: everything but void methods. */
export const printsResult = (selection: Selection) =>
    Object.values(EXAMPLES[selection.example].types)
        .flatMap((t) => t.methods)
        .find((m) => m.name === selection.method)?.returns !== 'void';

export interface MainFile {
    readonly text: string;
    /** 1-based line numbers. */
    readonly header: number;
    readonly before?: number;
    readonly declaration: number;
    /** The call or the cast. */
    readonly action: number;
    readonly end: number;
}

/** The line that does the call or the cast. */
export function actionText(selection: Selection): string {
    const v = variableName(selection);
    if (selection.mode === 'cast') return `${selection.target} ${targetName(selection)} = (${selection.target}) ${v};`;
    return printsResult(selection) ? `System.out.println(${v}.${selection.method}());` : `${v}.${selection.method}();`;
}

export function mainFile(selection: Selection, className = 'Main'): MainFile {
    const object = objectData(selection);
    const out = [`public class ${className} {`, '', '    public static void main(String[] args) {'];
    const header = out.length;
    let before: number | undefined;
    if (object.before) {
        out.push(`        ${object.before}`);
        before = out.length;
    }
    out.push(`        ${selection.static} ${variableName(selection)} = ${object.create};`);
    const declaration = out.length;
    out.push(`        ${actionText(selection)}`);
    const action = out.length;
    out.push('    }');
    const end = out.length;
    out.push('}');
    return { text: out.join('\n'), header, before, declaration, action, end };
}

/** Every selection there is, for the tests. */
export function allSelections(): Selection[] {
    const all: Selection[] = [];
    for (const ex of Object.values(EXAMPLES)) {
        const names = Object.keys(ex.types);
        for (const S of names) {
            for (const D of names.filter((n) => isConcrete(ex, n))) {
                for (const m of ex.callable) all.push(call(ex.id, S, D, m));
                for (const T of names) all.push(cast(ex.id, S, D, T));
            }
        }
    }
    return all;
}
