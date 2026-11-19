// Java's int arithmetic, so the numbers shown are the numbers Java prints.

/** `String.hashCode()`: s[0]*31^(n-1) + ... + s[n-1], with 32-bit overflow. */
export function stringHashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
}

/** `71 * hash + value` as a Java int. */
export const step71 = (hash: number, value: number): number => (Math.imul(71, hash) + value) | 0;

/** `Math.abs(int)`: Integer.MIN_VALUE stays negative, as in Java. */
export const javaAbs = (n: number): number => (n === -2147483648 ? n : Math.abs(n));

/** `Math.abs(hash % length)`. JavaScript's % truncates like Java's; `| 0` turns -0 into 0. */
export const listIndex = (hash: number, length: number): number => javaAbs((hash % length) | 0);

/** A small seeded generator (mulberry32): unsigned 32-bit numbers, the same for the same seed. */
export function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (t ^ (t >>> 14)) >>> 0;
    };
}

/** Like `random.nextInt()`: any int, negative ones included. */
export const nextInt = (next: () => number): number => next() | 0;

/** Like an identity hash code: a positive 31-bit number. */
export const identityHash = (next: () => number): number => next() >>> 1 || 1;

/** As in `Object.toString()`: Book@1b6d3586. */
export const identityText = (hash: number): string => `Book@${hash.toString(16)}`;
