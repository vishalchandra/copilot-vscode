import { marked } from "marked";
import secureJSON from "secure-json-parse";
import {
  FIFOCoPilotTemplate,
  fifoTemplateSchema,
  Prompt,
} from "./FIFOCoPilotTemplate";

export type FIFOCoPilotTemplateParseResult =
  | {
      type: "success";
      template: FIFOCoPilotTemplate;
    }
  | {
      type: "error";
      error: unknown;
    };

class NamedCodeSnippetMap {
  private readonly contentByLangInfo = new Map<string, string>();

  set(langInfo: string, content: string): void {
    this.contentByLangInfo.set(langInfo, content);
  }

  get(langInfo: string): string {
    const content = this.contentByLangInfo.get(langInfo);

    if (content == null) {
      throw new Error(`Code snippet for lang info '${langInfo}' not found.`);
    }

    return content;
  }

  resolveTemplate(prompt: Prompt, templateId: string) {
    prompt.template = this.getHandlebarsTemplate(templateId);
  }

  private getHandlebarsTemplate(templateName: string): string {
    return this.get(`template-${templateName}`).replace(/\\`\\`\\`/g, "```");
  }
}

export const extractNamedCodeSnippets = (
  content: string
): NamedCodeSnippetMap => {
  const codeSnippets = new NamedCodeSnippetMap();

  marked
    .lexer(content)
    .filter((token) => token.type === "code")
    .forEach((token) => {
      const codeToken = token as marked.Tokens.Code;
      if (codeToken.lang != null) {
        codeSnippets.set(codeToken.lang, codeToken.text);
      }
    });

  return codeSnippets;
};

export function parseFIFOCoPilotTemplateOrThrow(
  templateAsRdtMarkdown: string
): FIFOCoPilotTemplate {
  const parseResult = parseFIFOCoPilotTemplate(templateAsRdtMarkdown);

  if (parseResult.type === "error") {
    throw parseResult.error;
  }

  return parseResult.template;
}

export function parseFIFOCoPilotTemplate(
  templateAsRdtMarkdown: string
): FIFOCoPilotTemplateParseResult {
  try {
    const namedCodeSnippets = extractNamedCodeSnippets(templateAsRdtMarkdown);

    const templateText = namedCodeSnippets.get("json conversation-template");

    const template = fifoTemplateSchema.parse(secureJSON.parse(templateText));

    if (template.initialMessage != null) {
      namedCodeSnippets.resolveTemplate(
        template.initialMessage as Prompt,
        "initial-message"
      );
    }

    namedCodeSnippets.resolveTemplate(template.response as Prompt, "response");

    return {
      type: "success",
      template: template as FIFOCoPilotTemplate,
    };
  } catch (error) {
    return {
      type: "error",
      error,
    };
  }
}
