import * as vscode from "vscode";
import { AIClient } from "./ai/AIClient";
import { ApiKeyManager } from "./ai/ApiKeyManager";
import { ChatController } from "./chat/ChatController";
import { ChatModel } from "./chat/ChatModel";
import { ChatPanel } from "./chat/ChatPanel";
import { ConversationTypesProvider } from "./conversation/ConversationTypesProvider";
import { DiffEditorManager } from "./diff/DiffEditorManager";
import { indexRepository } from "./index/indexRepository";
import { getVSCodeLogLevel, LoggerUsingVSCodeOutput } from "./logger";

export const activate = async (context: vscode.ExtensionContext) => {
  const apiKeyManager = new ApiKeyManager({
    secretStorage: context.secrets,
  });

  const mainOutputChannel = vscode.window.createOutputChannel("FIFOCoPilot");
  const indexOutputChannel =
    vscode.window.createOutputChannel("FIFOCoPilot Index");

  const vscodeLogger = new LoggerUsingVSCodeOutput({
    outputChannel: mainOutputChannel,
    level: getVSCodeLogLevel(),
  });
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("fifo.logger.level")) {
      vscodeLogger.setLevel(getVSCodeLogLevel());
    }
  });

  const hasOpenAIApiKey = await apiKeyManager.hasOpenAIApiKey();
  const chatPanel = new ChatPanel({
    extensionUri: context.extensionUri,
    apiKeyManager,
    hasOpenAIApiKey,
  });

  const chatModel = new ChatModel();

  const conversationTypesProvider = new ConversationTypesProvider({
    extensionUri: context.extensionUri,
  });

  await conversationTypesProvider.loadConversationTypes();

  const ai = new AIClient({
    apiKeyManager,
    logger: vscodeLogger,
  });

  const chatController = new ChatController({
    chatPanel,
    chatModel,
    ai,
    diffEditorManager: new DiffEditorManager({
      extensionUri: context.extensionUri,
    }),
    getConversationType(id: string) {
      return conversationTypesProvider.getConversationType(id);
    },
    basicChatTemplateId: "chat-en",
  });

  chatPanel.onDidReceiveMessage(
    chatController.receivePanelMessage.bind(chatController)
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("fifo.chat", chatPanel),
    vscode.commands.registerCommand(
      "fifo.enterOpenAIApiKey",
      apiKeyManager.enterOpenAIApiKey.bind(apiKeyManager)
    ),
    vscode.commands.registerCommand("fifo.clearOpenAIApiKey", async () => {
      await apiKeyManager.clearOpenAIApiKey();
      vscode.window.showInformationMessage("OpenAI API key cleared.");
    }),

    vscode.commands.registerCommand("fifo.startConversation", (templateId) =>
      chatController.createConversation(templateId)
    ),

    vscode.commands.registerCommand("fifo.diagnoseErrors", () => {
      chatController.createConversation("diagnose-errors");
    }),
    vscode.commands.registerCommand("fifo.explainCode", () => {
      chatController.createConversation("explain-code");
    }),
    vscode.commands.registerCommand("fifo.findBugs", () => {
      chatController.createConversation("find-bugs");
    }),
    vscode.commands.registerCommand("fifo.generateCode", () => {
      chatController.createConversation("generate-code");
    }),
    vscode.commands.registerCommand("fifo.generateUnitTest", () => {
      chatController.createConversation("generate-unit-test");
    }),
    vscode.commands.registerCommand("fifo.startChat", () => {
      chatController.createConversation("chat-en");
    }),
    vscode.commands.registerCommand("fifo.editCode", () => {
      chatController.createConversation("edit-code");
    }),
    vscode.commands.registerCommand("fifo.startCustomChat", async () => {
      const items = conversationTypesProvider
        .getConversationTypes()
        .map((conversationType) => ({
          id: conversationType.id,
          label: conversationType.label,
          description: (() => {
            const tags = conversationType.tags;
            return tags == null
              ? conversationType.source
              : `${conversationType.source}, ${tags.join(", ")}`;
          })(),
          detail: conversationType.description,
        }));

      const result = await vscode.window.showQuickPick(items, {
        title: `Start Custom Chat…`,
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: "Select conversation type…",
      });

      if (result == undefined) {
        return; // user cancelled
      }

      await chatController.createConversation(result.id);
    }),
    vscode.commands.registerCommand("fifo.touchBar.startChat", () => {
      chatController.createConversation("chat-en");
    }),
    vscode.commands.registerCommand("fifo.showChatPanel", async () => {
      await chatController.showChatPanel();
    }),
    vscode.commands.registerCommand("fifo.getStarted", async () => {
      await vscode.commands.executeCommand("workbench.action.openWalkthrough", {
        category: `fifo.fifo-vscode#fifo`,
      });
    }),
    vscode.commands.registerCommand("fifo.reloadTemplates", async () => {
      await conversationTypesProvider.loadConversationTypes();
      vscode.window.showInformationMessage("FIFOCoPilot templates reloaded.");
    }),

    vscode.commands.registerCommand("fifo.showLogs", () => {
      mainOutputChannel.show(true);
    }),

    vscode.commands.registerCommand("fifo.indexRepository", () => {
      indexRepository({
        ai: ai,
        outputChannel: indexOutputChannel,
      });
    })
  );

  return Object.freeze({
    async registerTemplate({ template }: { template: string }) {
      conversationTypesProvider.registerExtensionTemplate({ template });
      await conversationTypesProvider.loadConversationTypes();
    },
  });
};

export const deactivate = async () => {
  // noop
};
