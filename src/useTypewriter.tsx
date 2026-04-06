import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import invariant from 'tiny-invariant';

import type { NonEmpty, TypewriterAction, TypewriterActionType } from './actions';
import useInterval from './hooks/useInterval';

interface MoveCursorOnceAction {
  type: 'move-cursor-once';
}

interface WriteCharacterAction {
  type: 'write-char';
}

interface DeleteCharacterAction {
  type: 'delete-char';
}

type TypewriterInternalAction = MoveCursorOnceAction | WriteCharacterAction | DeleteCharacterAction;

interface TypewriterState {
  text: string;
  writeIndex: number;
  moveDirection?: 'forward' | 'backward';
  targetIndex: number;
  targetText?: string;
  actionCompleted: boolean;
}

export type CursorVariant = 'block' | 'underscore' | 'ibeam';
export interface ExplicitCursorVariant {
  cursorActive: string;
  cursorInactive: string;
}
interface CursorOptions {
  animation?: 'always' | 'onWrite' | 'none';
  blinkFrequency?: number;
  variant?: CursorVariant | ExplicitCursorVariant;
}

export interface TypewriterOptions {
  actions: NonEmpty<TypewriterAction>;
  cpm?: number;
  cursor?: CursorOptions;
  paused?: boolean;
  prompt?: string;
}

export interface TypewriterResult {
  cursor: string;
  prompt: string;
  text: string;
  typewriterState: TypewriterState;
}

/**
 * Hook that mimics a typewriter effect.
 *
 * Note that, strictly speaking, there is no extremely performant way to do this since each
 * character write/delete requires DOM manipulation (virtual DOM and text-only manipulation
 * should help, but not too much).
 *
 * Nonetheless, this is probably close to an optimal implementation in React, performing n
 * operations for each operation provided by the actions array, plus m operations for the
 * number of characters in each write or delete operation.
 *
 * On a high level, this happens in three steps:
 *
 * 1. On first render, initialize a pointer into the actions array and the necessary state to
 * operate the reducer.
 * 2. Fire the "major" action (i.e., publically available action) at the pointer location in the
 * actions array.
 * 3. If this action hasn't completed, fire an interval that dispatches the next "minor" (internal)
 * action until the reducer reports that the operation is complete.
 *
 * Repeat 2-3.
 *
 * This should minimize unnecessary rerenders and keep the memory usage very low (since the bulk of
 * reducer state transformation actions are purely transient)
 */
export function useTypewriter({
  actions,
  cpm = 425,
  cursor: cursorOptions = defaultCursorOptions,
  paused = false,
  prompt = '',
}: TypewriterOptions): TypewriterResult {
  invariant(actions.length > 0, 'Typewriter requires at least one action');

  const {
    animation = defaultCursorOptions.animation,
    blinkFrequency = defaultCursorOptions.blinkFrequency,
    variant = defaultCursorOptions.variant,
  } = cursorOptions;
  const cpmDelay = useMemo(() => cpmToMillis(cpm), [cpm]);
  const blinkDelay = useMemo(() => hzToMillis(blinkFrequency), [blinkFrequency]);
  const { cursorActive, cursorInactive } = useMemo(() => resolveCursorVariant(variant), [variant]);

  const [cursor, setCursor] = useState(cursorActive);

  const [actionPtr, setActionPtr] = useState(0);
  const [runInternal, setRunInternal] = useState(false);
  const internalActionRef = useRef<TypewriterInternalAction | undefined>(undefined);

  const [typewriterState, dispatch] = useReducer(typewriterReducer, typewriterInitialState);

  const { actionCompleted } = typewriterState;

  useInterval(
    () => {
      const internalAction = internalActionRef.current;

      if (internalAction && !actionCompleted) {
        dispatch(internalAction);
      } else {
        setRunInternal(false);
      }
    },
    runInternal && !paused ? cpmDelay : undefined,
  );

  useEffect(() => {
    setActionPtr(0);
  }, [actions]);

  useEffect(() => {
    if (actionCompleted && !paused) {
      const action = actions[actionPtr];
      internalActionRef.current = internalActionsMap[action.type];

      const id = setTimeout(
        () => {
          dispatch(action);
          setRunInternal(true);
          setActionPtr((actionPtr + 1) % actions.length);
        },
        action.type === 'pause' ? action.milliseconds : 0,
      );
      return () => {
        clearTimeout(id);
      };
    }
  }, [actionCompleted, paused, actionPtr, actions]);

  useInterval(
    () => {
      setCursor(cursor === cursorActive ? cursorInactive : cursorActive);
    },
    animation !== 'none' && !runInternal && !paused ? blinkDelay : undefined,
  );

  useEffect(() => {
    setCursor(cursorActive);
  }, [cursorActive]);

  useEffect(() => {
    if (runInternal && animation !== 'always') {
      setCursor(cursorActive);
    }
  }, [runInternal, cursorActive, animation]);

  return {
    cursor,
    prompt,
    text: `${prompt}${renderTypewriter(cursor, typewriterState)}`,
    typewriterState,
  };
}

const renderTypewriter = (cursor: string, { text, writeIndex }: TypewriterState): string =>
  text.slice(0, writeIndex) + cursor + text.slice(writeIndex, text.length);

const typewriterInitialState: TypewriterState = {
  actionCompleted: true,
  targetIndex: 0,
  text: '',
  writeIndex: 0,
};

function typewriterReducer(
  state = typewriterInitialState,
  action: TypewriterAction | TypewriterInternalAction,
): TypewriterState {
  switch (action.type) {
    case 'write': {
      const { text } = action;

      return {
        ...state,
        actionCompleted: false,
        targetIndex: 0,
        targetText: text,
      };
    }
    case 'delete': {
      const { text } = state;
      const characters = action.characters ?? text.length;

      if (characters <= 0) {
        return { ...state, actionCompleted: true };
      }

      return {
        ...state,
        actionCompleted: false,
        targetText: text.slice(0, -characters),
      };
    }
    case 'move-cursor': {
      const { text, writeIndex } = state;
      const { by, direction } = action;

      const moveBy = by ?? text.length + 1;

      return {
        ...state,
        actionCompleted: false,
        moveDirection: direction,
        targetIndex: clamp(direction === 'forward' ? writeIndex + moveBy : writeIndex - moveBy, 0, text.length),
      };
    }
    case 'reset': {
      return {
        ...typewriterInitialState,
      };
    }
    case 'pause': {
      return {
        ...state,
        actionCompleted: true,
      };
    }
    case 'write-char': {
      const { text, targetText, writeIndex, targetIndex } = state;

      if (!targetText || targetIndex >= targetText.length) {
        return {
          ...state,
          actionCompleted: true,
        };
      }

      return {
        ...state,
        targetIndex: targetIndex + 1,
        text: text.slice(0, writeIndex) + targetText[targetIndex] + text.slice(writeIndex, text.length),
        writeIndex: writeIndex + 1,
      };
    }
    case 'delete-char': {
      const { text, targetText = '', writeIndex } = state;

      if (!text || targetText.length >= text.length) {
        return {
          ...state,
          actionCompleted: true,
        };
      }

      const deleteIndex = clamp(writeIndex - 1, 0, text.length);

      return {
        ...state,
        text: text.slice(0, deleteIndex) + text.slice(deleteIndex + 1, text.length),
        writeIndex: writeIndex - 1 > 0 ? writeIndex - 1 : 0,
      };
    }
    case 'move-cursor-once': {
      const { moveDirection, writeIndex, targetIndex } = state;

      const end =
        !moveDirection || (moveDirection === 'forward' ? writeIndex >= targetIndex : writeIndex <= targetIndex);

      if (end) {
        return {
          ...state,
          actionCompleted: true,
          moveDirection: undefined,
        };
      }

      return {
        ...state,
        writeIndex: moveDirection === 'forward' ? writeIndex + 1 : writeIndex - 1,
      };
    }
  }
}

const internalActionsMap: Partial<Record<TypewriterActionType, TypewriterInternalAction>> = {
  delete: {
    type: 'delete-char',
  },
  'move-cursor': {
    type: 'move-cursor-once',
  },
  write: {
    type: 'write-char',
  },
};

const cursorMap: Record<CursorVariant, ExplicitCursorVariant> = {
  block: {
    cursorActive: '\u2588',
    cursorInactive: '\u00A0',
  },
  ibeam: {
    cursorActive: '\u258F',
    cursorInactive: '\u00A0',
  },
  underscore: {
    cursorActive: '_',
    cursorInactive: '\u00A0',
  },
};

function resolveCursorVariant(variant: ExplicitCursorVariant | CursorVariant): ExplicitCursorVariant {
  if (typeof variant === 'object') {
    return variant;
  }
  return cursorMap[variant];
}

const defaultCursorOptions = {
  animation: 'onWrite',
  blinkFrequency: 5,
  variant: 'underscore',
} satisfies CursorOptions;

const cpmToMillis = (cpm: number) => 60_000 / cpm;
const hzToMillis = (hz: number) => 1_000 / hz;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
