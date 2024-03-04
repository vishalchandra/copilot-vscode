import * as vscode from "vscode";
import { FIFOCoPilotTemplate } from "./FIFOCoPilotTemplate";

export type FIFOCoPilotTemplateLoadResult =
  | {
      type: "success";
      file: vscode.Uri;
      template: FIFOCoPilotTemplate;
    }
  | {
      type: "error";
      file: vscode.Uri;
      error: unknown;
    };
