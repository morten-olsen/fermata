/** Extract unique first-letter groups from a sorted array, with indices into the original array */
export function extractLetters(
  items: { key: string }[],
  getLabel: (item: { key: string }) => string
): { letters: string[]; indices: Record<string, number> } {
  const indices: Record<string, number> = {};
  const seen = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const label = getLabel(items[i]);
    const firstChar = label.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
    if (!seen.has(letter)) {
      seen.add(letter);
      indices[letter] = i;
    }
  }

  const letters = Object.keys(indices).sort((a, b) =>
    a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)
  );

  return { letters, indices };
}
