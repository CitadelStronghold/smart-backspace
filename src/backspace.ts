import * as vscode from 'vscode';

//-//

const EDIT_OPTIONS = {
    undoStopBefore: false,
    undoStopAfter: false,
};

const ACTION_DELAY = 50;

//-//

// Track the last selection so we know where the cursor was before a given change
let lastSelection: vscode.Selection | null = null;
let lastLineText: string | null = null;

let erasureTimeout: NodeJS.Timeout | null = null;

//-//

export function activate(context: vscode.ExtensionContext): void {
    hook(context);
}
function hook(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(onDidChangeTextEditorSelection));

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(onDidSaveTextDocument));
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(onWillSaveTextDocument));
}

//-//

function onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent): void {
    const { contentChanges } = event;

    if (!hasSingleChange(contentChanges)) {
        return;
    }

    if (changeIsBackspace(contentChanges[0])) {
        onBackspacePressed(event);
    }
}
function hasSingleChange(changes: readonly vscode.TextDocumentContentChangeEvent[]): boolean {
    return changes.length === 1;
}

function changeIsBackspace(change: vscode.TextDocumentContentChangeEvent): boolean {
    return changeIsEmpty(change);
}
function changeIsEmpty(change: vscode.TextDocumentContentChangeEvent): boolean {
    // We observe that all backspaces, including those of non-whitespace characters, have empty text

    return change.text === '';
}

//

function onBackspacePressed(event: vscode.TextDocumentChangeEvent): void {
    const doc = event.document;
    const line = getBackspacedLine(event);

    if(shouldSkipErasure(doc, line)) {
        return;
    }

    eraseDocumentLine(doc, line);
}
function getBackspacedLine(event: vscode.TextDocumentChangeEvent): number {
    return event.contentChanges[0]!.range.start.line;
}
function shouldSkipErasure(doc: vscode.TextDocument, line: number): boolean {
    return didEraseLine(line) ||
        !isLineEmpty(doc, line) ||
        !wasLineEmpty();
}
function didEraseLine(line: number): boolean {
    if (lastSelection === null) {
        return false;
    }

    return lastSelection.start.line > line;
}
function isLineEmpty(doc: vscode.TextDocument, line: number): boolean {
    const text = doc.lineAt(line).text;

    return isTextBlank(text);
}
function wasLineEmpty(): boolean {
    if(lastLineText === null) {
        return false;
    }

    return isTextBlank(lastLineText);
}
function isTextBlank(text: string): boolean {
    return text.trim().length === 0;
}

function eraseDocumentLine(doc: vscode.TextDocument, line: number): void {
    const etor = getActiveEditor();
    if(!etor || etor.document !== doc) {
        return;
    }

    eraseEditorLineDelayed(etor, line);
}
function eraseEditorLineDelayed(editor: vscode.TextEditor, line: number): void {
    // Opportunity to cancel if this was a byproduct of an automatic editor event

    erasureTimeout = setTimeout(() => {
        eraseEditorLine(editor, line);
    }, ACTION_DELAY);
}
async function eraseEditorLine(etor: vscode.TextEditor, line: number): Promise<void> {
    await etor.edit((builder: vscode.TextEditorEdit) => {
        const lineRange = etor.document.lineAt(line).range;
        const delRange = etor.document.positionAt(etor.document.offsetAt(lineRange.start) - 1);

        builder.delete(new vscode.Range(delRange, lineRange.end));
    }, EDIT_OPTIONS);
}

function clearErasureTimeout(): void {
    if(erasureTimeout === null) {
        return;
    }

    clearTimeout(erasureTimeout);
    erasureTimeout = null;
}

//-//

function onDidChangeTextEditorSelection(event: vscode.TextEditorSelectionChangeEvent): void {
    if (!hasSelections(event)) {
        return;
    }

    recordSelection(event.textEditor.document, event.selections[0]!);
}
function hasSelections(event: vscode.TextEditorSelectionChangeEvent): boolean {
    return event.selections.length > 0;
}
function recordSelection(doc: vscode.TextDocument, selection: vscode.Selection): void {
    lastSelection = selection;
    lastLineText = doc.lineAt(selection.start.line).text;
}

//-//

function onWillSaveTextDocument(): void {
    clearErasureTimeout();
}
function onDidSaveTextDocument(): void {
    clearErasureTimeout();
}

//-//

function getActiveEditor(): vscode.TextEditor | null {
    return vscode.window.activeTextEditor ?? null;
}
