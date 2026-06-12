/**
 * The JS mount-retention FSM — the tree-owning half of the presence handshake. It is the
 * mirror of the native lifecycle FSM: while `visible` (or mid-exit) the child stays
 * `rendered`; it is `released` only when the native exit completion arrives. The two FSMs
 * never diverge because the only cross-channel messages are the discrete `visible` prop
 * (down) and `onTransitionEnd` (up).
 *
 * It is kept a pure reducer — no React, no native — so the retention contract is unit-testable
 * headlessly (this repo has no renderer in its test harness). The component drives it and
 * derives what to render from the returned state.
 */

/** Whether the child sits in the tree, and whether it is mid-exit (rendering the snapshot). */
export type RetentionState = {
  /** The child is mounted (live or as a retained snapshot). */
  rendered: boolean;
  /** An exit is in flight; the rendered content is the hide-time snapshot, frozen. */
  exiting: boolean;
};

export type RetentionEvent =
  /** `visible` rose to true (mount / re-enter). */
  | { type: 'show' }
  /** `visible` fell to false from a rendered state (begin the deferred exit). */
  | { type: 'hide' }
  /** The native exit ran to completion — release the retained child to unmount. */
  | { type: 'exitEnd' }
  /** The native host detached while exiting and unreleased (Fast Refresh) — release at once. */
  | { type: 'stranded' };

/** The resting state for an initial `visible`. `appear` is a native-only concern (whether the
 * enter envelope plays); JS renders the child whenever it is visible regardless. */
export function initialRetention(visible: boolean): RetentionState {
  return { rendered: visible, exiting: false };
}

export function retentionReducer(state: RetentionState, event: RetentionEvent): RetentionState {
  switch (event.type) {
    case 'show':
      // Re-enter (even mid-exit): keep the live child mounted, drop the exiting flag so the
      // component renders live children again. Native retargets toward present.
      return { rendered: true, exiting: false };
    case 'hide':
      // Defer the unmount: stay mounted and freeze the snapshot while native plays the exit.
      // Hiding an already-released child is a no-op (idempotent — StrictMode resilience).
      return state.rendered ? { rendered: true, exiting: true } : state;
    case 'exitEnd':
    case 'stranded':
      // Release only an in-flight exit; a stray completion for a child that already re-entered
      // or released must not yank a live child (the snapshot/retarget invariants).
      return state.exiting ? { rendered: false, exiting: false } : state;
  }
}

/** Picks the element tree to render: the frozen hide-time snapshot while exiting, else the
 * live children. This is the snapshot-semantics invariant — later re-renders do not propagate
 * into the exiting child. */
export function childrenToRender<T>(state: RetentionState, live: T, snapshot: T): T {
  return state.exiting ? snapshot : live;
}
