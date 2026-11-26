import author from '../../../java/hashmap/book/author.java?raw';
import constant from '../../../java/hashmap/book/constant.java?raw';
import equalsOnly from '../../../java/hashmap/book/equals-only.java?raw';
import generated from '../../../java/hashmap/book/generated.java?raw';
import hashcodeOnly from '../../../java/hashmap/book/hashcode-only.java?raw';
import none from '../../../java/hashmap/book/none.java?raw';
import random from '../../../java/hashmap/book/random.java?raw';
import { type JavaFile, parseJava } from '../../lib/lines.ts';

// The Book implementations students can choose. Each is a real Book.java in java/book/.

/** What Book.hashCode() does. 'object' means it isn't overridden. */
export type HashKind = 'object' | 'generated' | 'constant' | 'random' | 'author';
/** What Book.equals() does. 'object' means it isn't overridden. */
export type EqualsKind = 'object' | 'generated';

export interface Variant {
    readonly id: string;
    readonly title: string;
    /** One line on what to look for. */
    readonly hint: string;
    readonly hash: HashKind;
    readonly equals: EqualsKind;
    /** The Book.java source, with markers. */
    readonly raw: string;
    readonly file: JavaFile;
}

const variant = (v: Omit<Variant, 'file'>): Variant => ({ ...v, file: parseJava(v.raw) });

export const VARIANTS: readonly Variant[] = [
    variant({
        id: 'none',
        title: 'No overrides (Object’s hashCode and equals)',
        hint: 'Object’s hashCode comes from the object’s identity, so an equal copy of a book is looked for in another list.',
        hash: 'object',
        equals: 'object',
        raw: none,
    }),
    variant({
        id: 'generated',
        title: 'Generated hashCode and equals',
        hint: 'Equal books get equal hash codes. equals only runs when the hash codes match and the objects differ.',
        hash: 'generated',
        equals: 'generated',
        raw: generated,
    }),
    variant({
        id: 'constant',
        title: 'hashCode returns 4',
        hint: 'Correct, but every book lands in the same list, so equals runs for each pair in it.',
        hash: 'constant',
        equals: 'generated',
        raw: constant,
    }),
    variant({
        id: 'random',
        title: 'hashCode returns a random number',
        hint: 'Every call gives another hash code, so the map can’t even find the same object again.',
        hash: 'random',
        equals: 'generated',
        raw: random,
    }),
    variant({
        id: 'author',
        title: 'hashCode on the author only',
        hint: 'Books by the same author share a hash code, so equals has to tell them apart.',
        hash: 'author',
        equals: 'generated',
        raw: author,
    }),
    variant({
        id: 'equals-only',
        title: 'Only equals overridden',
        hint: 'equals is correct, but HashMap never gets to call it: the copy has another hash code.',
        hash: 'object',
        equals: 'generated',
        raw: equalsOnly,
    }),
    variant({
        id: 'hashcode-only',
        title: 'Only hashCode overridden',
        hint: 'The copy is found in the right list, but Object’s equals (==) says it is a different key.',
        hash: 'generated',
        equals: 'object',
        raw: hashcodeOnly,
    }),
];

export const findVariant = (id: string | undefined): Variant | undefined => VARIANTS.find((v) => v.id === id);

/** Whether Object.java takes part: a method Book doesn't override. */
export const usesObject = (v: Variant): boolean => v.hash === 'object' || v.equals === 'object';

/** Whether ↻ changes anything: identity hash codes or random numbers. */
export const usesSeed = (v: Variant): boolean => v.hash === 'object' || v.hash === 'random';
