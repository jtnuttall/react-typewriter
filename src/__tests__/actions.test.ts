import { describe, expect, it } from 'vitest';

import { typewriterBuilder } from '../actions';

describe('TypewriterBuilder', () => {
  it('builds a write action', () => {
    const actions = typewriterBuilder().write('hello').buildActions();

    expect(actions).toEqual([{ text: 'hello', type: 'write' }]);
  });

  it('builds a pause action', () => {
    const actions = typewriterBuilder().pause(500).buildActions();

    expect(actions).toEqual([{ milliseconds: 500, type: 'pause' }]);
  });

  it('builds a delete-all action when called with no arguments', () => {
    const actions = typewriterBuilder().delete().buildActions();

    expect(actions).toEqual([{ characters: undefined, type: 'delete' }]);
  });

  it('builds a no-op delete action when called with 0', () => {
    const actions = typewriterBuilder().delete(0).buildActions();

    expect(actions).toEqual([{ characters: 0, type: 'delete' }]);
  });

  it('builds a partial delete action', () => {
    const actions = typewriterBuilder().delete(5).buildActions();

    expect(actions).toEqual([{ characters: 5, type: 'delete' }]);
  });

  it('builds a move-cursor-forward action', () => {
    const actions = typewriterBuilder().moveCursorForward(3).buildActions();

    expect(actions).toEqual([{ by: 3, direction: 'forward', type: 'move-cursor' }]);
  });

  it('builds a move-cursor-forward action without explicit count', () => {
    const actions = typewriterBuilder().moveCursorForward().buildActions();

    expect(actions).toEqual([{ by: undefined, direction: 'forward', type: 'move-cursor' }]);
  });

  it('builds a move-cursor-backward action', () => {
    const actions = typewriterBuilder().moveCursorBackward(2).buildActions();

    expect(actions).toEqual([{ by: 2, direction: 'backward', type: 'move-cursor' }]);
  });

  it('builds a reset action', () => {
    const actions = typewriterBuilder().reset().buildActions();

    expect(actions).toEqual([{ type: 'reset' }]);
  });

  it('chains multiple actions in order', () => {
    const actions = typewriterBuilder().write('hello').pause(100).delete(3).write('world').buildActions();

    expect(actions).toEqual([
      { text: 'hello', type: 'write' },
      { milliseconds: 100, type: 'pause' },
      { characters: 3, type: 'delete' },
      { text: 'world', type: 'write' },
    ]);
  });

  it('produces independent action arrays per builder instance', () => {
    const a = typewriterBuilder().write('a').buildActions();
    const b = typewriterBuilder().write('b').buildActions();

    expect(a).toEqual([{ text: 'a', type: 'write' }]);
    expect(b).toEqual([{ text: 'b', type: 'write' }]);
  });
});
