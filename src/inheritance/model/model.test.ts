import { describe, expect, it } from 'vitest';
import {
    EXAMPLES,
    PRESETS,
    type Selection,
    allSelections,
    castCheck,
    declaration,
    findPreset,
    implementation,
    normalise,
    presetOf,
    simulate,
    supertypes,
} from './index.ts';

const preset = (id: string): Selection => findPreset(id)!.selection;
const parts = EXAMPLES.parts;
const vehicles = EXAMPLES.vehicles;

describe('the hierarchy', () => {
    it('knows every type an object is', () => {
        expect(supertypes(vehicles, 'Car')).toEqual(['Car', 'MotorizedVehicle', 'Vehicle', 'Object', 'Startable', 'Moveable']);
        expect(supertypes(vehicles, 'Moveable')).toEqual(['Moveable', 'Object']);
        expect(supertypes(parts, 'ElectricEngine')).toEqual(['ElectricEngine', 'Engine', 'Part', 'Object']);
    });

    it('finds declarations as the compiler does', () => {
        expect(declaration(vehicles, 'Vehicle', 'move')).toBe('Moveable');
        expect(declaration(vehicles, 'Moveable', 'toString')).toBe('Object');
        expect(declaration(vehicles, 'Moveable', 'start')).toBeUndefined();
        expect(declaration(parts, 'Part', 'getType')).toBeUndefined();
    });

    it('finds implementations from the dynamic type upwards', () => {
        expect(implementation(vehicles, 'Car', 'move')).toBe('MotorizedVehicle');
        expect(implementation(vehicles, 'Car', 'toString')).toBe('Vehicle');
        expect(implementation(parts, 'ElectricEngine', 'toString')).toBe('Engine');
        expect(implementation(parts, 'Part', 'hashCode')).toBe('Object');
    });

    it('knows which casts compile', () => {
        expect(castCheck(vehicles, 'Car', 'Vehicle')).toBe('upcast');
        expect(castCheck(vehicles, 'Vehicle', 'Car')).toBe('downcast');
        expect(castCheck(vehicles, 'Vehicle', 'Startable')).toBe('downcast');
        expect(castCheck(vehicles, 'Bicycle', 'Startable')).toBe('downcast');
        expect(castCheck(vehicles, 'Bicycle', 'Car')).toBe('impossible');
    });
});

describe('the presets', () => {
    it('are all different and each is its own preset', () => {
        expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
        for (const p of PRESETS) expect(presetOf(p.selection)?.id).toBe(p.id);
    });

    it('search upwards and call super', () => {
        const trace = simulate(preset('search-upwards'));
        expect(trace.console).toEqual(['E-103: Model 3 motor by Tesla (electric)']);
        expect(trace.calls.map((c) => [c.label, c.startedAt, c.foundIn])).toEqual([
            ['part.toString()', 'ElectricEngine', 'Engine'],
            ['super.toString()', 'Part', 'Part'],
        ]);
    });

    it('look up again from the dynamic type for a call on this', () => {
        const trace = simulate(preset('self-call'));
        expect(trace.console).toEqual(['Turn the key of the Volvo XC40', 'The combustion engine of the Volvo XC40 is running', 'The Volvo XC40 drives away']);
        expect(trace.calls.map((c) => [c.label, c.staticType, c.declaredIn, c.foundIn])).toEqual([
            ['vehicle.move()', 'Vehicle', 'Moveable', 'MotorizedVehicle'],
            ['this.start()', 'MotorizedVehicle', 'Startable', 'Car'],
            ['this.startEngine()', 'Car', 'MotorizedVehicle', 'MotorizedVehicle'],
        ]);
    });

    it('show what the compiler refuses', () => {
        expect(simulate(preset('compile-error')).compileError).toEqual({
            line: 5,
            message: ['error: cannot find symbol', '  symbol:   method getType()', '  location: variable part of type Part'],
        });
        expect(simulate(preset('hidden-start')).compileError?.message[2]).toBe('  location: variable moveable of type Moveable');
        expect(simulate(preset('impossible-cast')).compileError?.message).toEqual(['error: incompatible types: Bicycle cannot be converted to Car']);
    });

    it('throw a ClassCastException when the object is not of the type', () => {
        const trace = simulate(preset('cast-interface'));
        expect(trace.outcome).toBe('exception');
        expect(trace.exception).toBe("class Bicycle cannot be cast to class Startable (Bicycle and Startable are in unnamed module of loader 'app')");
        expect(simulate(preset('downcast')).outcome).toBe('output');
    });

    it("use Object's methods when nothing overrides them", () => {
        const trace = simulate(preset('from-object'));
        expect(trace.calls[0].foundIn).toBe('Object');
        expect(trace.files.map((f) => f.id)).toContain('Object');
    });
});

describe('normalise', () => {
    it('keeps valid selections and repairs the rest', () => {
        expect(normalise(preset('self-call'))).toEqual(preset('self-call'));
        expect(normalise({ example: 'vehicles', static: 'Nope', dynamic: 'Vehicle', method: 'nope' })).toMatchObject({
            static: 'Vehicle',
            dynamic: 'Car',
            method: 'move',
        });
        expect(normalise({}).example).toBe('parts');
    });
});

describe('every selection', () => {
    const all = allSelections();

    it('covers every combination', () => {
        expect(all.length).toBe(592);
    });

    it.each(all.map((s) => [`${s.example} ${s.static} ← ${s.dynamic} ${s.mode === 'call' ? `.${s.method}()` : `(${s.target})`}`, s] as const))(
        'gives a well-formed trace: %s',
        (_name, selection) => {
            const trace = simulate(selection);
            const { steps } = trace;
            const files = new Set(trace.files.map((f) => f.id));
            expect(steps.length).toBeGreaterThan(1);
            expect(steps[0].inside).toBe(false);
            expect(steps[steps.length - 1].done).toBe(true);
            expect(steps.filter((s) => s.done)).toHaveLength(1);
            steps.forEach((step, i) => {
                expect(step.seq).toBe(i);
                expect(step.line).toBeGreaterThan(0);
                expect(step.frames[0].file).toBe('main');
                expect(files.has(step.file)).toBe(true);
                // Only the compiler shows another file than the running one (the declaration it found).
                if (step.status !== 'compiler') expect(step.file).toBe(step.frames[step.frames.length - 1].file);
                expect(step.narration.length).toBeGreaterThan(0);
                if (i > 0) expect(step.console.slice(0, steps[i - 1].console.length)).toEqual(steps[i - 1].console);
            });
            trace.calls.forEach((call, i) => {
                expect(steps[call.firstSeq].call).toBe(i);
                expect(call.foundIn).toBe(implementation(EXAMPLES[selection.example], call.startedAt, call.label.replace(/^.*\.(\w+)\(\)$/, '$1')));
            });
            // Without stepping into the lookup, only the misses are hidden.
            for (const step of steps.filter((s) => s.inside)) expect(step.narration[step.narration.length - 1]).toMatch(/has no/);
            if (trace.outcome === 'compile-error') expect(trace.calls).toHaveLength(0);
        },
    );
});
