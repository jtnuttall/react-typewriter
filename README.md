# @jtnuttall/react-typewriter

A typewriter effect hook for React. Renders text character-by-character
with cursor animation, pauses, deletions, and cursor movement. Uses a simple,
declarative builder.

Unlike most other packages in this space, it supports:

- Free cursor movement, so you can edit mid-string.
- Pausing automatically when the document is hidden.
- Arbitrary-length pauses.

**It is less than 2kB bundled and brotlied.** No dependencies beyond [tiny-invariant](https://github.com/alexreardon/tiny-invariant).

## Install

```sh
pnpm add @jtnuttall/react-typewriter
```

## Usage

```tsx
import useTypewriter, { typewriterBuilder } from '@jtnuttall/react-typewriter';

const actions = typewriterBuilder()
  .write('Hello, world.')
  .pause(500)
  .delete()
  .write('Goodbye, world.')
  .pause(2000)
  .delete()
  .buildActions();

function App() {
  const { text } = useTypewriter({ actions, cpm: 600 });
  return <div>{text}</div>;
}
```

## Builder

`typewriterBuilder()` returns a chainable builder. Call `.buildActions()` at the end to produce the actions array.

| Method                   | Description                                                             |
| ------------------------ | ----------------------------------------------------------------------- |
| `.write(text)`           | Type out `text` at the current cursor position.                         |
| `.delete(n?)`            | Delete `n` characters before the cursor. Omit `n` to delete everything. |
| `.pause(ms)`             | Wait `ms` milliseconds before the next action.                          |
| `.moveCursorForward(n?)` | Move the cursor forward `n` characters. Omit `n` to jump to end.        |
| `.moveCursorBackward(n)` | Move the cursor backward `n` characters.                                |
| `.reset()`               | Clear all text and reset the cursor to position 0.                      |

Actions loop indefinitely — after the last action completes, the sequence restarts from the beginning.

## Props

| Prop                   | Type                                 | Default        | Description                                                                                             |
| ---------------------- | ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------- |
| `actions`              | `NonEmpty<TypewriterAction>`         | —              | Action sequence from the builder. Compared by reference; changing the reference restarts the animation. |
| `render`               | `(text: string) => ReactNode`        | —              | Render function. Called with the full text including cursor.                                            |
| `prompt`               | `string`                             | `''`           | Static text prepended to the output (not affected by typing).                                           |
| `cpm`                  | `number`                             | `425`          | Characters per minute. Controls typing and deletion speed.                                              |
| `paused`               | `boolean`                            | `false`        | Pause the animation.                                                                                    |
| `cursorType`           | `'underscore' \| 'block' \| 'ibeam'` | `'underscore'` | Cursor character style.                                                                                 |
| `cursorAnimation`      | `'always' \| 'onWrite' \| 'none'`    | `'onWrite'`    | When to animate the cursor blink. `'onWrite'` blinks only while idle.                                   |
| `cursorBlinkFrequency` | `number`                             | `5`            | Blink rate in Hz.                                                                                       |

## License

[BSD-3-Clause](./LICENSE)
