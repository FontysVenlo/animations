import { describe, expect, it } from 'vitest';
import {
    MAP_FILE,
    OBJECT_FILE,
    SCENARIOS,
    VARIANTS,
    findScenario,
    findVariant,
    listIndex,
    parseJava,
    simulate,
    step71,
    stringHashCode,
} from './index.ts';

const variant = (id: string) => findVariant(id)!;
const scenario = (id: string) => findScenario(id)!;

/** The printed results of the get and size calls. */
const printed = (variantId: string, scenarioId: string, seed = 1) =>
    simulate(variant(variantId), scenario(scenarioId), seed).calls
        .filter((c) => !c.label.includes('.put('))
        .map((c) => c.result);

const totals = (variantId: string, scenarioId: string, seed = 1) => {
    const steps = simulate(variant(variantId), scenario(scenarioId), seed).steps;
    return steps[steps.length - 1].counters;
};

describe('Java int arithmetic', () => {
    it('matches String.hashCode as printed by Java', () => {
        expect(stringHashCode('')).toBe(0);
        expect(stringHashCode('a')).toBe(97);
        expect(stringHashCode('123-457')).toBe(2017956795);
        expect(stringHashCode('Winds of winter')).toBe(844899481);
        expect(stringHashCode('George R.R. Martin')).toBe(-31495198);
        expect(stringHashCode('Hitchhikers guide to the galaxy')).toBe(439893716);
        expect(stringHashCode('J.R.R Tolkien')).toBe(-2090214614);
    });

    it('matches the generated hashCode for got', () => {
        let hash = 5;
        for (const s of ['123-457', 'Winds of winter', 'George R.R. Martin']) hash = step71(hash, stringHashCode(s));
        expect(hash).toBe(1866262031);
    });

    it('picks lists like Math.abs(hash % 8)', () => {
        expect(listIndex(-7, 8)).toBe(7);
        expect(listIndex(-2147483648, 8)).toBe(0);
        expect(listIndex(-2090214614, 8)).toBe(6);
        expect(Object.is(listIndex(-8, 8), 0)).toBe(true);
    });
});

describe('Java files', () => {
    it('removes the markers from the code shown', () => {
        for (const file of [MAP_FILE, OBJECT_FILE, ...VARIANTS.map((v) => v.file)]) {
            expect(file.text).not.toContain('// @');
            expect(file.text).not.toMatch(/[ \t]$/m);
        }
    });

    it('rejects a marker used twice', () => {
        expect(() => parseJava('a(); // @x\nb(); // @x')).toThrow('twice');
    });

    it('maps markers to lines', () => {
        const file = parseJava('class A {\n    int x; // @x\n}');
        expect(file.labels.get('x')).toBe(2);
        expect(file.text.split('\n')[1]).toBe('    int x;');
    });
});

describe('Loans', () => {
    // get(got), get(got2), get(lotr), get(silmarillion), get(new Book(... Silmarillion ...))
    it.each([
        ['none', ['1', 'null', '5', '0', 'null'], 0],
        ['generated', ['1', '1', '5', '0', '0'], 2],
        ['constant', ['1', '1', '5', '0', '0'], 15],
        ['random', ['null', 'null', 'null', 'null', 'null'], 0],
        ['author', ['1', '1', '5', '0', '0'], 5],
        ['equals-only', ['1', 'null', '5', '0', 'null'], 0],
        ['hashcode-only', ['1', 'null', '5', '0', 'null'], 2],
    ])('%s', (id, results, equalsCalls) => {
        expect(printed(id, 'loans')).toEqual(results);
        expect(totals(id, 'loans')).toEqual({ hashCode: 9, equals: equalsCalls });
    });

    it('puts got, lotr, hgttg and silmarillion in lists 7, 1, 0 and 4', () => {
        const rows = simulate(variant('generated'), scenario('loans'), 1).calls.slice(0, 4).map((c) => c.row);
        expect(rows).toEqual([7, 1, 0, 4]); // got, lotr, hgttg, silmarillion
    });

    it('puts every book in list 4 when hashCode returns 4', () => {
        const trace = simulate(variant('constant'), scenario('loans'), 1);
        const table = trace.steps[trace.steps.length - 1].table!;
        expect(table.map((list) => list.length)).toEqual([0, 0, 0, 0, 4, 0, 0, 0]);
    });

    it('never calls equals for different hash codes', () => {
        for (const v of VARIANTS) {
            const trace = simulate(v, scenario('loans'), 7);
            for (const step of trace.steps) {
                if (step.focus.outcome !== 'equals') continue;
                const pair = step.table!.flat().find((p) => p.id === step.focus.pair)!;
                const key = step.frames[1].vars.find((x) => x.name === 'hash')!;
                expect(String(pair.hash)).toBe(key.text);
            }
        }
    });
});

describe('Overwrite or duplicate?', () => {
    // size(), get(got), get(got2)
    it.each([
        ['none', ['2', '2', '3'], 0],
        ['generated', ['1', '3', '3'], 2],
        ['constant', ['1', '3', '3'], 2],
        ['random', ['3', 'null', 'null'], 0],
        ['author', ['1', '3', '3'], 2],
        ['equals-only', ['2', '2', '3'], 0],
        ['hashcode-only', ['2', '2', '3'], 2],
    ])('%s', (id, results, equalsCalls) => {
        expect(printed(id, 'overwrite')).toEqual(results);
        expect(totals(id, 'overwrite').equals).toBe(equalsCalls);
    });
});

describe('every run', () => {
    const runs = VARIANTS.flatMap((v) => SCENARIOS.flatMap((s) => [1, 2, 3, 42].map((seed) => ({ v, s, seed }))));

    it('gives the same results for every seed (except random draws)', () => {
        for (const { v, s, seed } of runs) {
            expect(printed(v.id, s.id, seed)).toEqual(printed(v.id, s.id, 1));
        }
    });

    it('is a well-formed trace', () => {
        for (const { v, s, seed } of runs) {
            const trace = simulate(v, s, seed);
            const { steps } = trace;
            expect(steps[0].inside).toBe(false);
            expect(steps[steps.length - 1].done).toBe(true);
            let previous = steps[0];
            for (const step of steps) {
                expect(step.line).toBeGreaterThan(0);
                expect(step.frames[0].file).toBe('main');
                expect(step.frames[step.frames.length - 1].file).toBe(step.file);
                expect(step.counters.hashCode).toBeGreaterThanOrEqual(previous.counters.hashCode);
                expect(step.counters.equals).toBeGreaterThanOrEqual(previous.counters.equals);
                expect(step.console.length).toBeGreaterThanOrEqual(previous.console.length);
                expect(step.narration.length).toBeGreaterThan(0);
                previous = step;
            }
            for (const [i, c] of trace.calls.entries()) expect(steps[c.firstSeq].call).toBe(i);
            // Object.java only takes part when Book doesn't override a method.
            const objectSteps = steps.filter((x) => x.file === 'object').length > 0;
            if (v.hash !== 'object' && v.equals !== 'object') expect(objectSteps).toBe(false);
        }
    });

    it('calls hashCode once per map call that takes a key', () => {
        for (const s of SCENARIOS) {
            const calls = s.statements.filter((x) => x.kind === 'put' || x.kind === 'get').length;
            for (const v of VARIANTS) expect(totals(v.id, s.id).hashCode).toBe(calls);
        }
    });
});
