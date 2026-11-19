import { java } from '@codemirror/lang-java';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType, lineNumbers } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

// A read-only Java view whose highlighted lines follow the current step (one per file).

export interface CodeHighlights {
    /** Line of the current step (0 for none, e.g. in a file that isn't running). */
    current: number;
    /** Lines in this file waiting for a call to return. */
    callers: number[];
    /** Values shown at the end of the current line. */
    note?: string;
    error?: boolean;
}

const setHighlights = StateEffect.define<CodeHighlights | null>();

class NoteWidget extends WidgetType {
    constructor(readonly text: string) {
        super();
    }

    override eq(other: NoteWidget): boolean {
        return other.text === this.text;
    }

    toDOM(): HTMLElement {
        const el = document.createElement('span');
        el.className = 'cm-step-note';
        el.textContent = this.text;
        return el;
    }
}

function decorations(state: EditorState, h: CodeHighlights | null): DecorationSet {
    if (!h) return Decoration.none;
    const { doc } = state;
    const classes = new Map<number, string>();
    for (const line of h.callers) classes.set(line, 'cm-caller-line');
    classes.set(h.current, h.error ? 'cm-step-line cm-error-line' : 'cm-step-line');

    const builder = new RangeSetBuilder<Decoration>();
    for (const n of [...classes.keys()].sort((a, b) => a - b)) {
        if (n < 1 || n > doc.lines) continue;
        const line = doc.line(n);
        builder.add(line.from, line.from, Decoration.line({ class: classes.get(n)! }));
        if (n === h.current && h.note) {
            builder.add(line.to, line.to, Decoration.widget({ widget: new NoteWidget(h.note), side: 1 }));
        }
    }
    return builder.finish();
}

const highlightField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, tr) {
        for (const effect of tr.effects) {
            if (effect.is(setHighlights)) return decorations(tr.state, effect.value);
        }
        return value.map(tr.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
});

const highlightStyle = HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.controlKeyword, t.definitionKeyword, t.operatorKeyword], color: 'var(--syntax-keyword)' },
    { tag: [t.typeName, t.standard(t.typeName)], color: 'var(--syntax-type)' },
    { tag: [t.number, t.bool, t.null], color: 'var(--syntax-literal)' },
    { tag: [t.lineComment, t.blockComment], color: 'var(--syntax-comment)', fontStyle: 'italic' },
    { tag: t.function(t.variableName), color: 'var(--syntax-function)' },
    { tag: t.definition(t.variableName), color: 'var(--syntax-definition)' },
]);

const theme = EditorView.theme({
    '&': { backgroundColor: 'transparent', color: 'var(--text)', fontSize: 'var(--code-font, 0.875rem)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
    '.cm-content': { padding: '8px 0' },
    '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--text-faint)', border: 'none' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 16px' },
    '.cm-line': { padding: '0 16px 0 8px' },
    '.cm-step-line': { backgroundColor: 'var(--accent-soft)', boxShadow: 'inset 3px 0 0 var(--accent)' },
    '.cm-caller-line': { backgroundColor: 'var(--surface-sunken)', boxShadow: 'inset 3px 0 0 var(--border-strong)' },
    '.cm-error-line': { backgroundColor: 'var(--danger-soft)', boxShadow: 'inset 3px 0 0 var(--danger)' },
    '.cm-step-note': {
        marginLeft: '2ch',
        padding: '1px 8px',
        borderRadius: '999px',
        backgroundColor: 'var(--accent)',
        color: 'var(--on-accent)',
        fontSize: '0.8em',
        whiteSpace: 'pre',
    },
});

function createState(source: string): EditorState {
    return EditorState.create({
        doc: source,
        extensions: [
            lineNumbers(),
            java(),
            syntaxHighlighting(highlightStyle),
            theme,
            EditorState.readOnly.of(true),
            EditorView.editable.of(false),
            highlightField,
        ],
    });
}

export function createView(parent: HTMLElement, source: string): EditorView {
    return new EditorView({ parent, state: createState(source) });
}

export function showCode(view: EditorView, source: string, highlights: CodeHighlights | null): void {
    if (view.state.doc.toString() !== source) view.setState(createState(source));
    view.dispatch({ effects: setHighlights.of(highlights) });
}

/**
 * Scrolls `scroller` (a file's code box) so `line` is in view, centred when it was near an edge.
 * Unlike CodeMirror's scrollIntoView this never scrolls the page. The code boxes are short, so
 * centring keeps the lines around the current one visible.
 */
export function followLine(view: EditorView, scroller: HTMLElement, line: number): void {
    const { doc } = view.state;
    if (line < 1 || line > doc.lines || scroller.scrollHeight <= scroller.clientHeight) return;
    const block = view.lineBlockAt(doc.line(line).from);
    const box = scroller.getBoundingClientRect();
    const top = view.documentTop + block.top;
    const bottom = view.documentTop + block.bottom;
    const margin = Math.min(48, box.height / 4);
    if (top < box.top + margin || bottom > box.bottom - margin) {
        scroller.scrollTop += (top + bottom) / 2 - (box.top + box.bottom) / 2;
    }
}
