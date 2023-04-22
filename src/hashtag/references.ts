import { CancellationToken, Location, Position, ReferenceContext, ReferenceProvider, TextDocument } from "vscode"
import { hitTest, toTextRange } from "./parser"
import { app } from "./state"

export class HashtagReferenceProvider implements ReferenceProvider {
  public async provideReferences(
    document: TextDocument,
    position: Position,
    _context: ReferenceContext,
    token: CancellationToken
  ): Promise<Location[] | null> {
    console.log("references", document.uri, position)

    await app.recompute(token)
    if (token.isCancellationRequested) { console.log("ref canceled"); return null }

    const docTags = app.getDocumentTags(document.uri)
    const { line: y, character: x } = position
    const origin = hitTest(docTags, [y, x])
    if (origin == null) return null
    const [tagId] = origin

    const locations: Location[] = []
    app.collectTags([tagId]).forEach((tags, uri) => {
      for (const tag of tags) {
        locations.push(new Location(uri, toTextRange(tag)))
      }
    })
    return locations
  }
}
