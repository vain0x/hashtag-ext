import { CancellationTokenSource, DocumentSelector, ExtensionContext, languages, RelativePattern, workspace } from "vscode"
import { HashtagCompletionProvider } from "./hashtag/completion"
import { HashtagInlayHintsProvider } from "./hashtag/inlay_hints"
import { HashtagReferenceProvider } from "./hashtag/references"
import { HashtagRenameProvider } from "./hashtag/rename"
import { app } from "./hashtag/state"

export const activate = async (context: ExtensionContext) => {
  console.log("hashtag-ext: activating")

  {
    for (const document of workspace.textDocuments) {
      app.onDocumentOpened(document)
    }
  }

  // resource management
  const tokenSource = new CancellationTokenSource()
  context.subscriptions.push(tokenSource)
  const token = tokenSource.token

  // state management
  let computing = false
  let recompute = false
  const requestUpdate = () => void (async () => {
    try {
      if (computing) { recompute = true; return }

      console.group("hashtag-ext: computing")
      computing = true
      try {
        while (true) {
          recompute = false
          await app.recompute(token)
          if (!recompute) break

          console.log("hashtag-ext: computing again")
        }
      } finally {
        computing = false
        console.groupEnd()
      }

      app.emitRefresh()
    } catch (err) {
      console.error("hashtag-ext:", err)
    }
  })()

  // File watcher
  {
    const rootUri = workspace.workspaceFolders?.[0]?.uri ?? null
    if (rootUri != null) {
      const watcher = workspace.createFileSystemWatcher(new RelativePattern(rootUri, "**/*.txt"))
      context.subscriptions.push(watcher)

      watcher.onDidCreate(uri => {
        app.onFileCreated(uri)
        requestUpdate()
      })
      watcher.onDidChange(uri => {
        app.onFileChanged(uri)
        requestUpdate()
      })
      watcher.onDidDelete(uri => {
        app.onFileDeleted(uri)
        requestUpdate()
      })
      console.log("hashtag-ext: watching files", rootUri, "**/*.txt")

      void (async () => {
        console.log("hashtag-ext: finding files", rootUri, "**/*.txt")
        try {
          const uriList = await workspace.findFiles("**/*.txt", null, undefined, token)
          console.log("hashtag-ext: files found", ...uriList)
          for (const uri of uriList) {
            app.onFileCreated(uri)
          }
          requestUpdate()
        } catch (err) {
          console.error("hashtag-ext:", err)
        }
      })()
    }
  }

  context.subscriptions.push(
    workspace.onDidOpenTextDocument(document => {
      app.onDocumentChanged(document)
      requestUpdate()
    }),
    workspace.onDidChangeTextDocument(ev => {
      app.onDocumentChanged(ev.document)
      requestUpdate()
    }),
    workspace.onDidCloseTextDocument(ev => {
      app.onDocumentClosed(ev.uri)
      requestUpdate()
    }),
  )

  // Language features
  const selector: DocumentSelector = [{ language: "plaintext", scheme: "file" }, { language: "plaintext", scheme: "untitled" }]
  const TRIGGER_CHARACTERS: string[] = ["#"]

  context.subscriptions.push(
    languages.registerRenameProvider(selector, new HashtagRenameProvider()),
    languages.registerReferenceProvider(selector, new HashtagReferenceProvider()),
    languages.registerInlayHintsProvider(selector, new HashtagInlayHintsProvider()),
    languages.registerCompletionItemProvider(selector, new HashtagCompletionProvider(), ...TRIGGER_CHARACTERS)
  )

  app.emitRefresh()
}
