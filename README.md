# hashtag-ext

**WIP**

---

Hashtag support on VSCode

## Getting Started

*Not yet*

## Motivation

Sometimes I want links in code more than symbols.

In the following example this extension would provide symbol references on each occurrence of `#changeEvent`.

```js
// file: handler.js
{
    // handle #changeEvent
    ev.on("change", () => {
        // ...
    })
}
```

```js
// file: emitter.js

{
    // raise #changeEvent
    ev.emit("change")
}
```

```md
<!-- file: docs/events.md -->

...
The #changeEvent is raised when ...
and the handler should then do ...
```

## Features

(Wish list)

- [ ] Go to references (F12)
- [ ] Documentation link (Symbol emphasis at cursor)
- [ ] Completion
- [ ] Count the number of occurrences of each hashtags
- [ ] Show list of hashtags
- [ ] Comment syntax of languages (maybe reuse of tokens of synyax highlighting mechanism)
- [ ] Do it efficiently

## Refs

Maybe similar:

- https://github.com/vanadium23/markdown-hashtags
