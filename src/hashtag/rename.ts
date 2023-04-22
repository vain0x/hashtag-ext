import { CancellationToken, Position, ProviderResult, Range, RenameProvider, TextDocument, WorkspaceEdit } from "vscode"
import { findHashtags, hitTest, toTextRange } from "./parser"
import { app } from "./state"

export class HashtagRenameProvider implements RenameProvider {
  prepareRename(document: TextDocument, position: Position, _token: CancellationToken): ProviderResult<Range | { range: Range; placeholder: string }> {
    const text = document.lineAt(position.line).text
    const tags = findHashtags({
      lineAt: () => text,
      lineCount: 1,
      intern: () => 0,
    })
    if (tags.length === 0) {
      throw new Error("No hashtag to rename.")
    }

    const r = toTextRange(tags[0])
    const range = new Range(
      position.line, r.start.character + 1, // 1 for '#'
      position.line, r.end.character,
    )
    if (!range.contains(position)) {
      throw new Error("No hashtag to rename.")
    }
    return range
  }

  async provideRenameEdits(document: TextDocument, position: Position, newName: string, token: CancellationToken): Promise<WorkspaceEdit | null> {
    console.log("rename", document.uri, position)

    await app.recompute(token)
    if (token.isCancellationRequested) { console.log("ref canceled"); return null }

    const docTags = app.getDocumentTags(document.uri)
    const { line: y, character: x } = position
    const origin = hitTest(docTags, [y, x])
    if (origin == null) return null
    const [tagId] = origin

    const edit = new WorkspaceEdit()
    app.collectTags([tagId]).forEach((tags, uri) => {
      for (const tag of tags) {
        const r = toTextRange(tag)
        const range = new Range(
          r.start.line, r.start.character + 1, // 1 for '#'
          r.end.line, r.end.character,
        )
        edit.replace(uri, range, newName)
      }
    })
    return edit
  }
}
