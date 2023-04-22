import { CancellationToken, Event, InlayHint, InlayHintKind, InlayHintsProvider, Range, TextDocument } from "vscode"
import { toTextRange } from "./parser"
import { app } from "./state"

export class HashtagInlayHintsProvider implements InlayHintsProvider {
  onDidChangeInlayHints: Event<void> = app.refreshEvent

  async provideInlayHints(document: TextDocument, range: Range, token: CancellationToken): Promise<InlayHint[] | null> {
    console.log("hints", document.uri, range)

    app.onDocumentChanged(document)
    await app.recompute(token)
    if (token.isCancellationRequested) { console.log("hints canceled 1"); return null }

    const docTags = app.getDocumentTags(document.uri)
    const relatedTagIds = docTags.map(([tagId]) => tagId)
    const freq = new Map<number, number>()
    app.collectTags(relatedTagIds).forEach(tags => {
      for (const [tagId] of tags) {
        freq.set(tagId, (freq.get(tagId) ?? 0) + 1)
      }
    })
    if (token.isCancellationRequested) { console.log("hints canceled 2"); return null }

    const hints: InlayHint[] = []
    for (const tag of docTags) {
      const count = freq.get(tag[0])!
      if (count === 1) continue
      hints.push(new InlayHint(toTextRange(tag).end, `(${count})`, InlayHintKind.Parameter))
    }
    return hints
  }
}
