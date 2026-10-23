/** Keep desktop forms in their own scrolling column; mobile pages can scroll naturally. */
export function focusFormField(panel: HTMLElement | null, id: string) {
  const target = panel?.querySelector<HTMLElement>(`#${id}`);
  if (!panel || !target) return;
  target.focus({ preventScroll: true });
  panel.scrollTop += target.getBoundingClientRect().top - panel.getBoundingClientRect().top - 20;
  if (window.innerWidth < 1024) target.scrollIntoView?.({ block: "center" });
}
