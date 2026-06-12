import {
  childrenToRender,
  initialRetention,
  type RetentionState,
  retentionReducer,
} from '../surface/presenceMachine';

// ── initial state ────────────────────────────────────────────────────

describe('initialRetention', () => {
  it('renders a child that mounts visible', () => {
    expect(initialRetention(true)).toEqual({ rendered: true, exiting: false });
  });

  it('renders nothing for a child that mounts hidden', () => {
    expect(initialRetention(false)).toEqual({ rendered: false, exiting: false });
  });
});

// ── the retention contract ───────────────────────────────────────────

describe('retentionReducer', () => {
  const present: RetentionState = { rendered: true, exiting: false };

  it('keeps the child mounted through exiting', () => {
    // hide from present begins the deferred exit — the child stays rendered
    const next = retentionReducer(present, { type: 'hide' });
    expect(next).toEqual({ rendered: true, exiting: true });
  });

  it('releases the child only on exit completion', () => {
    const exiting = retentionReducer(present, { type: 'hide' });
    const released = retentionReducer(exiting, { type: 'exitEnd' });
    expect(released).toEqual({ rendered: false, exiting: false });
  });

  it('retargets without restarting on a re-enter mid-exit', () => {
    const exiting = retentionReducer(present, { type: 'hide' });
    // visible true again before the exit finished — keep the live child, drop exiting
    const reentered = retentionReducer(exiting, { type: 'show' });
    expect(reentered).toEqual({ rendered: true, exiting: false });
  });

  it('does not release a child that re-entered before the stale completion arrives', () => {
    const exiting = retentionReducer(present, { type: 'hide' });
    const reentered = retentionReducer(exiting, { type: 'show' });
    // a late exitEnd from the cut-short envelope must not yank the live child
    const next = retentionReducer(reentered, { type: 'exitEnd' });
    expect(next).toEqual({ rendered: true, exiting: false });
  });

  it('releases immediately on the stranded-exit guard', () => {
    const exiting = retentionReducer(present, { type: 'hide' });
    const released = retentionReducer(exiting, { type: 'stranded' });
    expect(released).toEqual({ rendered: false, exiting: false });
  });

  it('ignores a stranded signal when no exit is in flight', () => {
    expect(retentionReducer(present, { type: 'stranded' })).toEqual(present);
  });

  it('ignores a repeated exitEnd (idempotent — StrictMode resilience)', () => {
    const released: RetentionState = { rendered: false, exiting: false };
    expect(retentionReducer(released, { type: 'exitEnd' })).toEqual(released);
  });

  it('ignores hiding an already-released child', () => {
    const released: RetentionState = { rendered: false, exiting: false };
    expect(retentionReducer(released, { type: 'hide' })).toEqual(released);
  });
});

// ── snapshot semantics ───────────────────────────────────────────────

describe('childrenToRender', () => {
  it('renders the live children while present', () => {
    expect(childrenToRender({ rendered: true, exiting: false }, 'live', 'snapshot')).toBe('live');
  });

  it('renders the frozen snapshot while exiting, ignoring later live children', () => {
    expect(childrenToRender({ rendered: true, exiting: true }, 'live', 'snapshot')).toBe(
      'snapshot'
    );
  });
});
