import * as vscode from 'vscode';
import * as backspace from './backspace';

export function activate(context: vscode.ExtensionContext): void {
    activateBackspace(context);
}

function activateBackspace(context: vscode.ExtensionContext): void {
    backspace.activate(context);
}
