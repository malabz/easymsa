import { useEffect, type RefObject } from "react";

/** Keep details menus in the viewport even when their toolbar wraps. */
export function usePopupBoundary(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const position = () => element.querySelectorAll<HTMLDetailsElement>('details[data-msa-popup][open]').forEach(menu => {
      const popup = menu.querySelector<HTMLElement>(':scope > .msa-popup');
      const trigger = menu.querySelector('summary');
      if (!popup || !trigger) return;
      if (window.innerWidth < 1024) { popup.style.left = ''; popup.style.top = ''; return; }
      const bounds = trigger.getBoundingClientRect();
      const { width, height } = popup.getBoundingClientRect();
      popup.style.left = `${Math.max(12, Math.min(bounds.right - width, window.innerWidth - width - 12))}px`;
      popup.style.top = `${Math.max(12, Math.min(bounds.bottom + 6, window.innerHeight - height - 12))}px`;
    });
    let frame = 0;
    const toggle = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); };
    element.addEventListener('toggle', toggle, true);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { cancelAnimationFrame(frame); element.removeEventListener('toggle', toggle, true); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [root]);
}
