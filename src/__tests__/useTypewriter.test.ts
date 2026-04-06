import { cleanup, renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { typewriterBuilder } from '../actions';
import { useTypewriter, type TypewriterOptions } from '../useTypewriter';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const UNDERSCORE_CURSOR = '_';
const BLOCK_CURSOR = '\u2588';
const IBEAM_CURSOR = '\u258F';
const NBSP = '\u00A0';

const tick = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

const tickChars = (n: number, cpm = 425) => {
  const interval = 60_000 / cpm;
  for (let i = 0; i < n; i++) {
    tick(interval);
  }
};

const flushInitialAction = () => {
  tick(0);
};

describe('useTypewriter', () => {
  describe('rendering', () => {
    it('renders with default underscore cursor', () => {
      const actions = typewriterBuilder().pause(10_000).buildActions();
      const { result } = renderHook(() => useTypewriter({ actions }));
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);
    });

    it('renders with block cursor', () => {
      const actions = typewriterBuilder().pause(10_000).buildActions();
      const { result } = renderHook(() =>
        useTypewriter({
          actions,
          cursor: {
            variant: 'block',
          },
        }),
      );
      expect(result.current.text).toBe(BLOCK_CURSOR);
    });

    it('renders with ibeam cursor', () => {
      const actions = typewriterBuilder().pause(10_000).buildActions();
      const { result } = renderHook(() =>
        useTypewriter({
          actions,
          cursor: {
            variant: 'ibeam',
          },
        }),
      );
      expect(result.current.text).toBe(IBEAM_CURSOR);
    });

    it('renders with custom cursor', () => {
      const actions = typewriterBuilder().pause(10_000).buildActions();
      const { result } = renderHook(() =>
        useTypewriter({
          actions,
          cursor: {
            variant: {
              cursorActive: 'active',
              cursorInactive: 'inactive',
            },
          },
        }),
      );
      expect(result.current.text).toBe('active');
    });

    it('prepends the prompt', () => {
      const actions = typewriterBuilder().pause(10_000).buildActions();
      const { result, rerender } = renderHook(() => useTypewriter({ actions, prompt: '$ ' }));
      rerender();
      expect(result.current.text).toMatch(/^\$ /);
    });
  });

  describe('write action', () => {
    it('types text character by character', () => {
      const actions = typewriterBuilder().write('abc').pause(10_000).buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      flushInitialAction();
      tickChars(1, 600);
      expect(result.current.text).toBe(`a${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      expect(result.current.text).toBe(`ab${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      expect(result.current.text).toBe(`abc${UNDERSCORE_CURSOR}`);
    });

    it('writes text with prompt', () => {
      const actions = typewriterBuilder().write('hi').pause(10_000).buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600, prompt: '> ' }));

      flushInitialAction();
      tickChars(2, 600);

      expect(result.current.text).toBe(`> hi${UNDERSCORE_CURSOR}`);
    });
  });

  describe('delete action', () => {
    it('deletes all text when no count specified', () => {
      const actions = typewriterBuilder().write('abc').delete().pause(10_000).buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      // write 'abc'
      flushInitialAction();
      tickChars(3, 600);
      expect(result.current.text).toBe(`abc${UNDERSCORE_CURSOR}`);

      // the write-char tick that marks actionCompleted triggers the next major action
      tickChars(1, 600);
      expect(result.current.text).toBe(`abc${UNDERSCORE_CURSOR}`);

      // delete completes when text is empty — dispatches delete-char 3 times + 1 completion
      flushInitialAction();
      tickChars(4, 600);

      expect(result.current.text).toBe(UNDERSCORE_CURSOR);
    });

    it('deletes a specific number of characters', () => {
      const actions = typewriterBuilder().write('abcde').delete(2).pause(10_000).buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      // write
      flushInitialAction();
      tickChars(6, 600);
      expect(result.current.text).toBe(`abcde${UNDERSCORE_CURSOR}`);

      // delete 2
      flushInitialAction();
      tickChars(3, 600);

      expect(result.current.text).toBe(`abc${UNDERSCORE_CURSOR}`);
    });
  });

  describe('cursor movement', () => {
    it('moves cursor backward and inserts text at position', () => {
      const actions = typewriterBuilder().write('ac').moveCursorBackward(1).write('b').pause(10_000).buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      // write 'ac'
      flushInitialAction();
      tickChars(2, 600);
      tickChars(1, 600);
      expect(result.current.text).toBe(`ac${UNDERSCORE_CURSOR}`);

      // move cursor back 1
      flushInitialAction();
      tickChars(2, 600);
      expect(result.current.text).toBe(`a${UNDERSCORE_CURSOR}c`);

      // write 'b' at cursor position (between a and c)
      flushInitialAction();
      tickChars(1, 600);
      tickChars(1, 600);

      // the cursor should be after 'b', with 'c' following
      expect(result.current.text).toBe(`ab${UNDERSCORE_CURSOR}c`);
    });
  });

  describe('reset action', () => {
    it('clears all text', () => {
      const actions = typewriterBuilder().write('hello').reset().pause(10_000).buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      // write 'hello'
      flushInitialAction();
      tickChars(5, 600);
      tickChars(1, 600);
      expect(result.current.text).toBe(`hello${UNDERSCORE_CURSOR}`);

      // reset
      tickChars(1, 600);
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);
    });
  });

  describe('cursor blinking', () => {
    it('blinks the cursor when idle', () => {
      const actions = typewriterBuilder().pause(10_000).buildActions();
      const { result } = renderHook(() =>
        useTypewriter({
          actions,
          cursor: {
            blinkFrequency: 2,
          },
        }),
      );

      flushInitialAction();

      expect(result.current.text).toBe(UNDERSCORE_CURSOR);

      // at 2 Hz, blink interval is 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.text).toBe(NBSP);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.text).toBe(UNDERSCORE_CURSOR);
    });

    it('does not blink when cursorAnimation is none', () => {
      const actions = typewriterBuilder().pause(10_000).buildActions();
      const { result } = renderHook(() =>
        useTypewriter({
          actions,
          cursor: {
            animation: 'none',
            blinkFrequency: 2,
          },
        }),
      );

      flushInitialAction();

      expect(result.current.text).toBe(UNDERSCORE_CURSOR);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // should still be active cursor, no blinking
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);
    });
  });

  describe('action looping', () => {
    it('loops back to the first action after completing all actions', () => {
      const actions = typewriterBuilder().write('ab').delete().buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      // first pass: write 'ab'
      flushInitialAction();
      tickChars(2, 600);
      tickChars(1, 600);
      expect(result.current.text).toBe(`ab${UNDERSCORE_CURSOR}`);

      // first pass: delete all
      flushInitialAction();
      tickChars(3, 600);
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);

      // actionPtr has wrapped to 0 — the write action fires again
      flushInitialAction();
      tickChars(1, 600);

      // first character of the second loop's write
      expect(result.current.text).toBe(`a${UNDERSCORE_CURSOR}`);
    });
  });

  describe('pause action', () => {
    it('waits the specified duration before advancing', () => {
      const actions = typewriterBuilder().pause(500).write('x').pause(10_000).buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      // pause dispatches immediately with a setTimeout of 500ms
      flushInitialAction();

      // before the pause elapses, still just cursor
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);

      // advance past the pause
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // write 'x'
      flushInitialAction();
      tickChars(1, 600);

      expect(result.current.text).toBe(`x${UNDERSCORE_CURSOR}`);
    });
  });

  describe('paused', () => {
    it('freezes the typewriter when paused', () => {
      const actions = typewriterBuilder().write('abc').delete(3).buildActions();
      const baseOptions: TypewriterOptions = { actions, cpm: 600 };
      const { result, rerender } = renderHook((props) => useTypewriter(props), {
        initialProps: baseOptions,
      });

      // write one character
      flushInitialAction();
      tickChars(1, 600);
      expect(result.current.text).toBe(`a${UNDERSCORE_CURSOR}`);

      rerender({ ...baseOptions, paused: true });
      // advance time — nothing should change
      tickChars(5, 600);
      expect(result.current.text).toBe(`a${UNDERSCORE_CURSOR}`);

      rerender(baseOptions);
      tickChars(3, 600);
      flushInitialAction();
      expect(result.current.text).toBe(`abc${UNDERSCORE_CURSOR}`);

      tickChars(3, 600);
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);

      flushInitialAction();
      tickChars(1, 600);
      flushInitialAction();
      tickChars(2, 600);
      expect(result.current.text).toBe(`ab${UNDERSCORE_CURSOR}`);

      rerender({ ...baseOptions, paused: true });
      tickChars(1, 600);
      expect(result.current.text).toBe(`ab${UNDERSCORE_CURSOR}`);

      tickChars(2, 600);
      flushInitialAction();
      expect(result.current.text).toBe(`ab${UNDERSCORE_CURSOR}`);

      tickChars(7, 600);
      flushInitialAction();
      expect(result.current.text).toBe(`ab${UNDERSCORE_CURSOR}`);
    });
  });

  describe('moveCursorForward', () => {
    it('moves cursor forward to end when no count specified', () => {
      const actions = typewriterBuilder()
        .write('abc')
        .moveCursorBackward(3)
        .moveCursorForward()
        .delete(1)
        .pause(10_000)
        .buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      // write 'abc'
      flushInitialAction();
      tickChars(3, 600);
      tickChars(1, 600);
      expect(result.current.text).toBe(`abc${UNDERSCORE_CURSOR}`);

      // move cursor back 3 (to position 0)
      flushInitialAction();
      tickChars(4, 600);
      expect(result.current.text).toBe(`${UNDERSCORE_CURSOR}abc`);

      // move cursor forward to end (no count = move to end)
      flushInitialAction();
      tickChars(4, 600);
      expect(result.current.text).toBe(`abc${UNDERSCORE_CURSOR}`);

      // delete 1 from end
      flushInitialAction();
      tickChars(2, 600);
      expect(result.current.text).toBe(`ab${UNDERSCORE_CURSOR}`);
    });

    it('moves cursor forward by the specified amount', () => {
      const actions = typewriterBuilder()
        .write('abc')
        .moveCursorBackward(3)
        .moveCursorForward(2)
        .pause(10_000)
        .buildActions();
      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      // write 'abc'
      flushInitialAction();
      tickChars(3, 600);
      expect(result.current.text).toBe(`abc${UNDERSCORE_CURSOR}`);

      // move cursor back 3 (to position 0)
      tickChars(1, 600);
      flushInitialAction();
      tickChars(3, 600);
      expect(result.current.text).toBe(`${UNDERSCORE_CURSOR}abc`);

      // move cursor forward by two
      tickChars(1, 600);
      flushInitialAction();
      tickChars(4, 600);
      expect(result.current.text).toBe(`ab${UNDERSCORE_CURSOR}c`);
    });
  });

  describe('whole flow', () => {
    it('completes whole loop with edits in arbitrary locations', () => {
      const actions = typewriterBuilder()
        .write("Hi! I'm Jeremy.")
        .pause(250)
        .delete()
        .write("I'm...")
        .pause(250)
        .delete()
        .write('a software engineer')
        .pause(750)
        .delete('software engineer'.length)
        .write('code enthusiast')
        .moveCursorBackward('enthusiast'.length)
        .delete('code '.length)
        .pause(500)
        .write('cat ')
        .pause(500)
        .moveCursorBackward('cat '.length)
        .write('full-stack ')
        .pause(500)
        .moveCursorForward()
        .delete('enthusiast'.length)
        .write('engineer')
        .pause(150)
        .moveCursorBackward('engineer'.length)
        .delete('cat '.length)
        .moveCursorForward()
        .pause(1750)
        .delete()
        .buildActions();

      const { result } = renderHook(() => useTypewriter({ actions, cpm: 600 }));

      flushInitialAction();
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);

      tickChars(15, 600);
      expect(result.current.text).toBe(`Hi! I'm Jeremy.${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      flushInitialAction();
      tick(250);
      flushInitialAction();
      tickChars(15, 600);
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(6, 600);
      expect(result.current.text).toBe(`I'm...${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      flushInitialAction();
      tick(250);
      flushInitialAction();
      tickChars(6, 600);
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(19, 600);
      expect(result.current.text).toBe(`a software engineer${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      flushInitialAction();
      tick(750);
      flushInitialAction();
      tickChars(17, 600);
      expect(result.current.text).toBe(`a ${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(15, 600);
      expect(result.current.text).toBe(`a code enthusiast${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(10, 600);
      expect(result.current.text).toBe(`a code ${UNDERSCORE_CURSOR}enthusiast`);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(5, 600);
      expect(result.current.text).toBe(`a ${UNDERSCORE_CURSOR}enthusiast`);

      tickChars(1, 600);
      flushInitialAction();
      tick(500);
      flushInitialAction();
      tickChars(4, 600);
      expect(result.current.text).toBe(`a cat ${UNDERSCORE_CURSOR}enthusiast`);

      tickChars(1, 600);
      flushInitialAction();
      tick(500);
      flushInitialAction();
      tickChars(3, 600);
      expect(result.current.text).toBe(`a c${UNDERSCORE_CURSOR}at enthusiast`);
      tickChars(1, 600);
      expect(result.current.text).toBe(`a ${UNDERSCORE_CURSOR}cat enthusiast`);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(4, 600);
      expect(result.current.text).toBe(`a full${UNDERSCORE_CURSOR}cat enthusiast`);
      tickChars(7, 600);
      expect(result.current.text).toBe(`a full-stack ${UNDERSCORE_CURSOR}cat enthusiast`);

      tickChars(1, 600);
      flushInitialAction();
      tick(500);
      flushInitialAction();
      tickChars(11, 600);
      expect(result.current.text).toBe(`a full-stack cat enthusi${UNDERSCORE_CURSOR}ast`);
      tickChars(3, 600);
      expect(result.current.text).toBe(`a full-stack cat enthusiast${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(10, 600);
      expect(result.current.text).toBe(`a full-stack cat ${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(8, 600);
      expect(result.current.text).toBe(`a full-stack cat engineer${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      flushInitialAction();
      tick(150);
      flushInitialAction();
      tickChars(8, 600);
      expect(result.current.text).toBe(`a full-stack cat ${UNDERSCORE_CURSOR}engineer`);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(4, 600);
      expect(result.current.text).toBe(`a full-stack ${UNDERSCORE_CURSOR}engineer`);

      tickChars(1, 600);
      flushInitialAction();
      tickChars(14, 600);
      expect(result.current.text).toBe(`a full-stack engineer${UNDERSCORE_CURSOR}`);

      tickChars(1, 600);
      flushInitialAction();
      tick(1750);
      flushInitialAction();
      tickChars(4, 600);
      expect(result.current.text).toBe(`a full-stack engi${UNDERSCORE_CURSOR}`);

      tickChars(5, 600);
      expect(result.current.text).toBe(`a full-stack${UNDERSCORE_CURSOR}`);

      tickChars(7, 600);
      expect(result.current.text).toBe(`a ful${UNDERSCORE_CURSOR}`);

      tickChars(5, 600);
      expect(result.current.text).toBe(UNDERSCORE_CURSOR);
    });
  });
});
