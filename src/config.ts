import * as vscode from 'vscode';

//-//

const CONFIGURATION_ID = 'smartBackspace';

//-//

export function getConfigAPI(base: string = CONFIGURATION_ID): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(base);
}

export function get(entry: string): any {
    return getConfigAPI().get(entry);
}
