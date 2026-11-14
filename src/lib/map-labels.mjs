/** Screen-space label placement shared by the interactive map and SVG export. */
export const boxesOverlap = (a, b, gap = 3) =>
  a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
export function groupLabel(group) {
  const ordered = [...group.locations].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id, 'en'),
  );
  const names = [...new Set(ordered.map((l) => l.name))];
  if (names.length > 1) return `${names[0]} + ${names.length - 1}`;
  return names[0] + (group.locations.length > 1 ? ` (${group.locations.length})` : '');
}
// Conservative widths keep the downloadable SVG independent of font files.
export const estimateTextWidth = (text, size = 12) =>
  [...text].reduce((sum, c) => sum + (c === ' ' ? 0.4 : /[MWmw@%&]/.test(c) ? 1 : 0.8), 0) * size;
export function placeLabels(
  items,
  { bounds, obstacles = [], measure = estimateTextWidth, height = 28, padding = 8, gap = 4 } = {},
) {
  const occupied = [...obstacles],
    placed = [],
    hidden = [];
  const sorted = [...items].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id, 'en'),
  );
  for (const item of sorted) {
    const w = Math.ceil(measure(item.text)) + padding * 2,
      h = height,
      r = item.r ?? 15;
    let found;
    for (const offset of [5, 16, 30, 48]) {
      const d = r + offset;
      const candidates = [
        [item.x + d, item.y - h / 2],
        [item.x - d - w, item.y - h / 2],
        [item.x - w / 2, item.y - d - h],
        [item.x - w / 2, item.y + d],
        [item.x + d, item.y - d - h],
        [item.x - d - w, item.y - d - h],
        [item.x + d, item.y + d],
        [item.x - d - w, item.y + d],
      ];
      for (const [x, y] of candidates) {
        const box = { x, y, w, h };
        if (
          x < bounds.x ||
          y < bounds.y ||
          x + w > bounds.x + bounds.w ||
          y + h > bounds.y + bounds.h
        )
          continue;
        if (occupied.some((other) => boxesOverlap(box, other, gap))) continue;
        const edge = {
          x: Math.max(x, Math.min(item.x, x + w)),
          y: Math.max(y, Math.min(item.y, y + h)),
        };
        found = { ...item, ...box, anchor: { x: item.x, y: item.y }, edge };
        break;
      }
      if (found) break;
    }
    if (found) {
      placed.push(found);
      occupied.push(found);
    } else hidden.push(item);
  }
  return { placed, hidden };
}
