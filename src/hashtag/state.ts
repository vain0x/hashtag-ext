import { readFile } from "fs/promises"
import { CancellationToken, Event, EventEmitter, TextDocument, Uri } from "vscode"
import { findHashtags, TagSymbol } from "./parser"

type FsPath = string
type TagText = string
type TagId = number

const sFileMap = new Map<FsPath, TagSymbol[]>()
const sChangedFiles = new Set<FsPath>()
const sDocumentMap = new Map<FsPath, TagSymbol[]>()
const sChangedDocuments = new Map<FsPath, TextDocument>()
const sInterner = new Map<TagText, TagId>()
const sRev: string[] = []
let sLastId = 0
let sComputing = false
let sRecompute = false // when recompute is requested while computing

const EMPTY: never[] = []
const THRESHOLD = 1e5 // 100KB

const intern = (text: TagText) => {
  const id = sInterner.get(text)
  if (id != null) return id

  {
    const id = ++sLastId
    sInterner.set(text, id)
    sRev[id] = text
    return id
  }
}

const sRefreshEventEmitter = new EventEmitter<void>()

class AppState {
  public get refreshEvent(): Event<void> {
    return sRefreshEventEmitter.event
  }

  public emitRefresh(): void {
    sRefreshEventEmitter.fire()
  }

  public clear(): void {
    sFileMap.clear()
    sChangedFiles.clear()
    sDocumentMap.clear()
    sChangedDocuments.clear()
    sInterner.clear()
  }

  public onFileCreated(uri: Uri): void {
    this.onFileChanged(uri)
  }

  public onFileChanged(uri: Uri): void {
    sChangedFiles.add(uri.fsPath)
  }

  public onFileDeleted(uri: Uri): void {
    sChangedFiles.delete(uri.fsPath)
    sFileMap.delete(uri.fsPath)
  }

  public onDocumentOpened(document: TextDocument): void {
    this.onDocumentChanged(document)
  }

  public onDocumentChanged(document: TextDocument): void {
    sChangedDocuments.set(document.uri.fsPath, document)
  }

  public onDocumentClosed(uri: Uri): void {
    sChangedDocuments.delete(uri.fsPath)
    sDocumentMap.delete(uri.fsPath)
  }

  private async doCompute() {
    const promises: Promise<void>[] = []
    sChangedFiles.forEach(fsPath => {
      promises.push((async () => {
        let contents: string
        try {
          contents = await readFile(fsPath, { encoding: "utf-8" })
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            console.log("Couldn't open file.", fsPath)
          }
          sFileMap.delete(fsPath)
          return
        }

        if (contents.length >= THRESHOLD) {
          console.log("File is too long, not processed.", fsPath)
          sFileMap.delete(fsPath)
          return
        }

        const lines = contents.split(/\r?\n/)
        const tagSymbols = findHashtags({
          lineAt: index => lines[index] ?? "",
          lineCount: lines.length,
          intern,
        })
        if (tagSymbols.length !== 0) {
          console.log("File has tags", fsPath, tagSymbols.length)
          sFileMap.set(fsPath, tagSymbols)
        } else {
          console.log("File has no tags", fsPath)
          sFileMap.delete(fsPath)
        }
      })())
    })
    sChangedFiles.clear()
    await Promise.all(promises)

    sChangedDocuments.forEach(document => {
      const fsPath = document.uri.fsPath
      const tagSymbols = findHashtags({
        lineAt: index => document.lineAt(index).text,
        lineCount: document.lineCount,
        intern,
      })
      if (tagSymbols.length !== 0) {
        console.log("Document has tags", fsPath, tagSymbols.length)
        sDocumentMap.set(fsPath, tagSymbols)
      } else {
        console.log("Document has no tags", fsPath)
        sDocumentMap.set(fsPath, EMPTY) // must not delete to not fallback to file
      }
    })
    sChangedDocuments.clear()
  }

  public async recompute(token: CancellationToken): Promise<void> {
    while (true) {
      if (token.isCancellationRequested) return

      if (sComputing) {
        sRecompute = true
        return
      }

      sRecompute = false
      sComputing = true
      try {
        await this.doCompute()
      } finally {
        sComputing = false
      }
      if (!sRecompute) return
    }
  }

  public getDocumentTags(uri: Uri): TagSymbol[] {
    return sDocumentMap.get(uri.fsPath) ?? sFileMap.get(uri.fsPath) ?? EMPTY
  }

  public collectTags(tagIds: TagId[]): Map<Uri, TagSymbol[]> {
    const output = new Map<Uri, TagSymbol[]>()
    const onEntry = (symbols: TagSymbol[], fsPath: FsPath) => {
      const filteredTags = symbols.filter(([tagId]) => tagIds.includes(tagId))
      output.set(Uri.file(fsPath), filteredTags)
    }
    sDocumentMap.forEach(onEntry)
    sFileMap.forEach((symbols, fsPath) => {
      if (!sDocumentMap.has(fsPath)) onEntry(symbols, fsPath)
    })
    return output
  }

  public allTags(): string[] {
    const output = new Set<string>()
    const items: string[] = []
    const onEntry = (symbols: TagSymbol[]) => {
      for (const symbol of symbols) {
        const tag = sRev[symbol[0]]
        if (!output.has(tag)) {
          output.add(tag)
          items.push(tag)
        }
      }
    }
    sDocumentMap.forEach(onEntry)
    sFileMap.forEach((symbols, fsPath) => {
      if (!sDocumentMap.has(fsPath)) onEntry(symbols)
    })

    items.sort()
    return items
  }
}

export const app = new AppState()
