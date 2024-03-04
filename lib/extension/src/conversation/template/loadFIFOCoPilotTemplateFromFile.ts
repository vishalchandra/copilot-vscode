import * as vscode from "vscode";
import { FIFOCoPilotTemplateLoadResult } from "./FIFOCoPilotTemplateLoadResult";
import { parseFIFOCoPilotTemplate } from "./parseFIFOCoPilotTemplate";
import { readFileContent } from "../../vscode/readFileContent";

export const loadConversationFromFile = async (
  file: vscode.Uri
): Promise<FIFOCoPilotTemplateLoadResult> => {
  try {
    const parseResult = parseFIFOCoPilotTemplate(await readFileContent(file));

    if (parseResult.type === "error") {
      return {
        type: "error" as const,
        file,
        error: parseResult.error,
      };
    }

    return {
      type: "success" as const,
      file,
      template: parseResult.template,
    };
  } catch (error) {
    return {
      type: "error" as const,
      file,
      error,
    };
  }
};
