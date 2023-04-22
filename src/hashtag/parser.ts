import { Position, Range } from "vscode"

/**
 * Find hashtags
 *
 * Hashtag must appear after `//`.
 */
export const findHashtags = (input: {
  lineAt: (y: number) => string
  lineCount: number
  intern: (text: string) => number
}): TagSymbol[] => {
  const symbols: TagSymbol[] = []

  for (let y = 0, lineCount = input.lineCount; y < lineCount; y++) {
    const line = input.lineAt(y)
    let x = line.indexOf("//")
    if (x < 0) continue
    x += 2 // "//"

    while (x < line.length) {
      x = line.indexOf("#", x)
      if (x < 0) break

      let m = line.slice(x).match(/^#[A-Za-z][-_0-9A-Za-z]+/)
      if (m == null) {
        x++
        continue
      }
      const len = m[0].length

      symbols.push([input.intern(m[0]), y, x, x + len])
      x += len
    }
  }

  return symbols
}

export type TagSymbol = [tagId: number, rowIndex: number, startColumn: number, endColumn: number]

export const hitTest = (tag: TagSymbol[], pos: [number, number]): TagSymbol | undefined => {
  const [y, x] = pos
  return tag.find(([, y1, x1, x2]) => y1 === y && x1 <= x && x <= x2)
}

export const toTextRange = (tag: TagSymbol): Range => {
  const [, y, x1, x2] = tag
  return new Range(new Position(y, x1), new Position(y, x2))
}
