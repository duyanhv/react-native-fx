/**
 * The agnostic source-driver vocabulary — the `SourceSpec` shape `fx.source.*` produces and
 * a hosted scroll context (`Fx.Scroll`) accepts. A source binds presentation to a *native*
 * advancing value; the value never crosses the bridge, only this declaration does.
 *
 * Two platform tiers ship, both reading a native scroll position with zero per-frame JS: iOS
 * maps it in the render server (SwiftUI's standard scroll transition, off the main thread);
 * Android maps it best-effort on the UI thread (a scroll-offset reader driving opacity/scale,
 * lower fidelity by design). The axis is the only configuration — the mapping itself is the
 * platform's own, per the law.
 */

/** The scroll direction a scroll source reads. */
export type ScrollAxis = 'vertical' | 'horizontal';

/** A native scroll position as the advancing value. The magnitude stays native; this only
 *  names the axis and marks the binding as a scroll source. */
export type ScrollSourceSpec = {
  kind: 'scroll';
  axis: ScrollAxis;
};

/** A source-driver binding. Today scroll is the only kind; the union widens as further native
 *  sources (pager, gesture) land. */
export type SourceSpec = ScrollSourceSpec;
