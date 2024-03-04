import * as vscode from "vscode";
import { loadConversationFromFile } from "./loadFIFOCoPilotTemplateFromFile";
import { FIFOCoPilotTemplateLoadResult } from "./FIFOCoPilotTemplateLoadResult";

const TEMPLATE_GLOB = ".fifo/template/**/*.rdt.md";

export async function loadFIFOCoPilotTemplatesFromWorkspace(): Promise<
  Array<FIFOCoPilotTemplateLoadResult>
> {
  const files = await vscode.workspace.findFiles(TEMPLATE_GLOB);
  return await Promise.all(files.map(loadConversationFromFile));
}
