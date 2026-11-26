// The parts of a step that every code-stepping animation shares. Each animation's simulation
// records one immutable snapshot per step; the shell, the code column, the console and the call
// stack only need these fields.

/** A local variable in a frame. */
export interface Var {
    readonly name: string;
    readonly text: string;
    /** The object it refers to, as an index the animation defines (used for its colour). */
    readonly object?: number;
}

/** A method that is running or waiting for a call to return. */
export interface Frame<F extends string = string> {
    readonly id: number;
    /** The file the method is in. */
    readonly file: F;
    /** e.g. put(got, 1) or move(). */
    readonly label: string;
    readonly line: number;
    readonly vars: readonly Var[];
}

export interface BaseStep<F extends string = string> {
    /** Position in the full trace (with the steps that "step into" can hide). */
    readonly seq: number;
    readonly file: F;
    readonly line: number;
    /** Shown at the end of the current line. */
    readonly note?: string;
    /** The current line is an error, e.g. a compile error. */
    readonly error?: boolean;
    /** Label of the current file in the code column; default "running". */
    readonly status?: string;
    /** Other lines to mark like a waiting caller, e.g. the line the compiler is checking. */
    readonly marks?: readonly { readonly file: F; readonly line: number }[];
    /** Bottom (main) to top (the running method). */
    readonly frames: readonly Frame<F>[];
    /** Everything printed so far. */
    readonly console: readonly string[];
    /** The call (if any), then what this step does. */
    readonly narration: readonly string[];
    /** A detail step, hidden when not stepping into the details. */
    readonly inside: boolean;
    /** Index into the trace's calls. */
    readonly call?: number;
    readonly done: boolean;
}

/** Where a call starts, for jumping from call to call. */
export interface CallStart {
    readonly firstSeq: number;
}
