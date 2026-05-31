import { useEffect, useRef, type RefObject } from 'react';

// Attribute-based only — jsdom has no layout, so CSS-only visibility
// (display:none / visibility:hidden via a class) is NOT filtered here; only the
// disabled / hidden / tabindex="-1" attributes are. Real-browser visibility
// edge cases are deliberately out of scope for this foundation hook.
const TABBABLE = [
  'a[href]:not([hidden])',
  'button:not([disabled]):not([hidden])',
  'input:not([disabled]):not([hidden])',
  'select:not([disabled]):not([hidden])',
  'textarea:not([disabled]):not([hidden])',
  '[tabindex]:not([tabindex="-1"]):not([hidden])',
].join(',');

interface UseFocusTrapOptions {
  active: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** @default true */
  restoreFocus?: boolean;
}

/**
 * Trap keyboard focus within the returned container ref while `active`.
 * On activate: focuses initialFocusRef -> first tabbable -> the container.
 * On deactivate/unmount: optionally restores focus to the previously-focused element.
 */
export function useFocusTrap<T extends HTMLElement>({
  active,
  initialFocusRef,
  restoreFocus = true,
}: UseFocusTrapOptions): RefObject<T | null> {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const getTabbables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(TABBABLE));

    const initial = initialFocusRef?.current ?? getTabbables()[0] ?? container;
    // Only make the container focusable as a last resort, and only if the
    // consumer hasn't already set a tabindex — so we can safely remove ours later.
    const addedTabIndex = initial === container && !container.hasAttribute('tabindex');
    if (addedTabIndex) container.setAttribute('tabindex', '-1');
    initial.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const tabbables = getTabbables();
      if (tabbables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const activeEl = document.activeElement;
      if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (addedTabIndex) container.removeAttribute('tabindex');
      if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [active, initialFocusRef, restoreFocus]);

  return containerRef;
}
