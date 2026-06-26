/**
 * Named z-index scale — the single source of truth for stacking order.
 *
 * Mirrors the Tailwind `zIndex` tokens in `tailwind.config.js` (utilities
 * `z-sticky` / `z-dropdown` / `z-overlay` / `z-modal` / `z-popover` / `z-toast`).
 * Use the numeric constants here only where a JS value is required (inline
 * `style`, the react-hot-toast Toaster `containerStyle`, portal positioning);
 * everywhere else prefer the Tailwind utility classes.
 *
 * Layer semantics (see DESIGN.md → Z-Index Scale):
 *  - sticky (20):   sticky table headers, fixed in-page save bars
 *  - dropdown (30): lightweight inline menus attached to a trigger, no backdrop
 *  - overlay (40):  modal/popover backdrops + the bulk-actions bar
 *  - modal (50):    modals + page-level popovers-with-backdrop + app-chrome menus
 *  - popover (60):  anything that must clear a modal — tooltips, lightbox,
 *                   in-modal field listboxes, nested previews
 *  - toast (70):    toasts + the global route-progress bar — always on top
 */
export const Z = {
  sticky: 20,
  dropdown: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
} as const;

export type ZLayer = keyof typeof Z;
