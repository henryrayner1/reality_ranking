// Route-friendly slug for a show's name, e.g. "Canada's Drag Race: All Stars"
// -> "canadas-drag-race-all-stars". Apostrophes are dropped rather than
// turned into a hyphen so contractions read naturally in the URL.
export const slugifyShowName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
