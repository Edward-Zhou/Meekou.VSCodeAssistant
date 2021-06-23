// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ZhihuService } from './services/zhihuService';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	//Init Services
	const zhihuService = new ZhihuService(context);
	//Register meekou.zhihu.login
	context.subscriptions.push(
		vscode.commands.registerCommand("meekou.zhihu.login", async (object) =>{
			await zhihuService.login();
		})
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
