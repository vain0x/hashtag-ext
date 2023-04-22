import { CancellationToken, CompletionItemProvider, TextDocument, CompletionItem, CompletionContext, CompletionList, Position } from "vscode"
import { app } from "./state"

const REGEXP = /^#([_A-Za-z][A-Za-z]*)?$/

export class HashtagCompletionProvider implements CompletionItemProvider {
  async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, _context: CompletionContext): Promise<CompletionItem[] | CompletionList<CompletionItem> | null> {
    const line = document.lineAt(position.line).text

    // checks if it's in a comment
    // FIXME: use syntax information or support other languages
    let i = line.indexOf("//")
    if (i < 0) return null
    i += 2 // "//"
    if (i >= position.character) return null

    // checks if it's on '#'
    const part = line.slice(i, position.character)
    let j = part.lastIndexOf("#")
    if (j < 0) return null
    if (!REGEXP.test(part.slice(j))) {
      console.log("test false", part)
      return null
    }

    await app.recompute(token)
    if (token.isCancellationRequested) return null

    const tags = app.allTags()
    if (tags.length === 0) return null

    return tags.map(tag => new CompletionItem(tag.slice(1))) // 1 for "#"
  }
}
