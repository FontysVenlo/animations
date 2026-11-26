import bicycleRaw from '../../../code/inheritance/Bicycle.java?raw';
import carRaw from '../../../code/inheritance/Car.java?raw';
import electricEngineRaw from '../../../code/inheritance/ElectricEngine.java?raw';
import engineRaw from '../../../code/inheritance/Engine.java?raw';
import motorcycleRaw from '../../../code/inheritance/Motorcycle.java?raw';
import motorizedVehicleRaw from '../../../code/inheritance/MotorizedVehicle.java?raw';
import moveableRaw from '../../../code/inheritance/Moveable.java?raw';
import objectRaw from '../../../code/inheritance/Object.java?raw';
import partRaw from '../../../code/inheritance/Part.java?raw';
import startableRaw from '../../../code/inheritance/Startable.java?raw';
import vehicleRaw from '../../../code/inheritance/Vehicle.java?raw';
import { type SourceFile, parseSource } from '../../lib/lines.ts';

// The two class hierarchies of the lesson (the CarFactory example) and the rules the compiler
// and the JVM follow: which types an object has, where the compiler finds a method, where the
// runtime finds its implementation and which casts compile.

export type Kind = 'class' | 'abstract' | 'interface';
export type ExampleId = 'parts' | 'vehicles';
export type Returns = 'void' | 'String' | 'int' | 'Engine';

export interface Method {
    readonly name: string;
    /** As in a class diagram, e.g. `+ toString(): String`. */
    readonly sig: string;
    readonly returns: Returns;
    /** Declared without a body: in an interface. */
    readonly abstract: boolean;
}

export interface TypeInfo {
    readonly name: string;
    readonly kind: Kind;
    readonly parent?: string;
    readonly interfaces: readonly string[];
    /** The methods it declares itself, in diagram order. */
    readonly methods: readonly Method[];
    /** Top left corner in the diagram (viewBox 900 × 600). */
    readonly x: number;
    readonly y: number;
    readonly file: SourceFile;
}

export interface Example {
    readonly id: ExampleId;
    readonly title: string;
    /** In diagram drawing order. */
    readonly types: Readonly<Record<string, TypeInfo>>;
    /** The methods Main can call. */
    readonly callable: readonly string[];
}

const method = (visibility: '+' | '#' | '', name: string, returns: Returns, abstract = false): Method => ({
    name,
    sig: `${visibility ? `${visibility} ` : ''}${name}(): ${returns}`,
    returns,
    abstract,
});

const type = (
    name: string,
    kind: Kind,
    raw: string,
    x: number,
    y: number,
    methods: Method[],
    parent?: string,
    interfaces: string[] = [],
): TypeInfo => ({ name, kind, parent, interfaces, methods, x, y, file: parseSource(raw) });

const object = () => type('Object', 'class', objectRaw, 325, 24, [method('+', 'toString', 'String'), method('+', 'hashCode', 'int')]);

export const EXAMPLES: Readonly<Record<ExampleId, Example>> = {
    parts: {
        id: 'parts',
        title: 'Parts',
        types: {
            Object: object(),
            Part: type(
                'Part',
                'class',
                partRaw,
                325,
                160,
                [
                    method('+', 'getIdentifier', 'String'),
                    method('+', 'getDescription', 'String'),
                    method('+', 'getManufacturer', 'String'),
                    method('+', 'toString', 'String'),
                ],
                'Object',
            ),
            Engine: type('Engine', 'class', engineRaw, 325, 360, [method('+', 'getType', 'String'), method('+', 'toString', 'String')], 'Part'),
            ElectricEngine: type('ElectricEngine', 'class', electricEngineRaw, 325, 510, [method('+', 'getRange', 'int')], 'Engine'),
        },
        callable: ['toString', 'hashCode', 'getIdentifier', 'getType', 'getRange'],
    },
    vehicles: {
        id: 'vehicles',
        title: 'Vehicles',
        types: {
            Object: object(),
            Moveable: type('Moveable', 'interface', moveableRaw, 20, 165, [method('', 'move', 'void', true)]),
            Vehicle: type(
                'Vehicle',
                'abstract',
                vehicleRaw,
                325,
                160,
                [method('+', 'getBrand', 'String'), method('+', 'getModel', 'String'), method('+', 'toString', 'String')],
                'Object',
                ['Moveable'],
            ),
            Startable: type('Startable', 'interface', startableRaw, 20, 345, [method('', 'start', 'void', true)]),
            MotorizedVehicle: type(
                'MotorizedVehicle',
                'abstract',
                motorizedVehicleRaw,
                325,
                340,
                [method('+', 'getEngine', 'Engine'), method('#', 'startEngine', 'void'), method('+', 'move', 'void')],
                'Vehicle',
                ['Startable'],
            ),
            Bicycle: type('Bicycle', 'class', bicycleRaw, 630, 340, [method('+', 'move', 'void')], 'Vehicle'),
            Car: type('Car', 'class', carRaw, 170, 515, [method('+', 'start', 'void')], 'MotorizedVehicle'),
            Motorcycle: type('Motorcycle', 'class', motorcycleRaw, 480, 515, [method('+', 'start', 'void')], 'MotorizedVehicle'),
        },
        callable: ['toString', 'hashCode', 'getBrand', 'getEngine', 'move', 'start'],
    },
};

/** Part.java and Engine.java are compiled with the vehicles too: MotorizedVehicle has an Engine. */
export const SOURCES: Readonly<Record<string, string>> = {
    Part: partRaw,
    Engine: engineRaw,
    ElectricEngine: electricEngineRaw,
    Moveable: moveableRaw,
    Startable: startableRaw,
    Vehicle: vehicleRaw,
    MotorizedVehicle: motorizedVehicleRaw,
    Car: carRaw,
    Motorcycle: motorcycleRaw,
    Bicycle: bicycleRaw,
};

export const typeOf = (ex: Example, name: string): TypeInfo => {
    const t = ex.types[name];
    if (!t) throw new Error(`No type ${name} in ${ex.id}`);
    return t;
};

export const isInterface = (ex: Example, name: string) => typeOf(ex, name).kind === 'interface';
/** Can be created with `new`. */
export const isConcrete = (ex: Example, name: string) => typeOf(ex, name).kind === 'class';
export const ownMethod = (ex: Example, name: string, m: string) => typeOf(ex, name).methods.find((x) => x.name === m);
export const hasImplementation = (ex: Example, name: string, m: string) => {
    const own = ownMethod(ex, name, m);
    return own !== undefined && !own.abstract;
};

/** The type itself, its superclasses (up to Object) and every interface they implement. */
export function supertypes(ex: Example, name: string): string[] {
    const classes: string[] = [];
    const interfaces: string[] = [];
    const visitInterface = (i: string) => {
        if (interfaces.includes(i)) return;
        interfaces.push(i);
        typeOf(ex, i).interfaces.forEach(visitInterface);
    };
    if (isInterface(ex, name)) {
        visitInterface(name);
        // Every object is an Object, so an interface type has Object's methods too.
        return [...interfaces, 'Object'];
    }
    for (let c: string | undefined = name; c; c = typeOf(ex, c).parent) {
        classes.push(c);
        typeOf(ex, c).interfaces.forEach(visitInterface);
    }
    return [...classes, ...interfaces];
}

export const isSubtype = (ex: Example, sub: string, sup: string) => supertypes(ex, sub).includes(sup);

/** Where the compiler finds method m for static type S: the superclass chain first, then interfaces. */
export function declaration(ex: Example, S: string, m: string): string | undefined {
    return supertypes(ex, S).find((t) => ownMethod(ex, t, m) !== undefined);
}

/** Where the runtime finds the implementation: from `start` up the superclass chain. */
export function implementation(ex: Example, start: string, m: string): string | undefined {
    for (let c: string | undefined = start; c; c = typeOf(ex, c).parent) {
        if (hasImplementation(ex, c, m)) return c;
    }
    return undefined;
}

export type CastCheck = 'upcast' | 'downcast' | 'impossible';

/**
 * Whether `(T) expression` compiles for an expression of static type S. None of these classes is
 * final, so a cast to or from an interface always compiles: a subclass could implement it.
 */
export function castCheck(ex: Example, S: string, T: string): CastCheck {
    if (isSubtype(ex, S, T)) return 'upcast';
    if (isInterface(ex, S) || isInterface(ex, T) || isSubtype(ex, T, S)) return 'downcast';
    return 'impossible';
}

/** The fully qualified name, as the JVM prints it. */
export const qualified = (name: string) => (name === 'Object' ? 'java.lang.Object' : name);
