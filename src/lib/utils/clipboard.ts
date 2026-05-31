export async function copyText(text: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is not available in this browser.");
  }

  await navigator.clipboard.writeText(text);
}
