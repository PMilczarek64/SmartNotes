// Normalizacja tekstu: lowercase, usunięcie diakrytyków, nbsp, zbicie spacji
export function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&nbsp;|\u00A0/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Quill/HTML → zwykły tekst (potem normalizacja)
export function extractPlainText(value) {
  if (!value) return '';

  // Quill Delta
  if (typeof value === 'object' && Array.isArray(value.ops)) {
    let out = '';
    for (const op of value.ops) {
      if (typeof op?.insert === 'string') out += op.insert;
    }
    return normalizeText(out);
  }

  // HTML jako string
  if (typeof value === 'string') {
    const noTags = value.replace(/<[^>]*>/g, ' ');
    return normalizeText(noTags);
  }

  // fallback
  try {
    return normalizeText(JSON.stringify(value));
  } catch {
    return '';
  }
}

// Prosty scoring kontekstowy (tytuł > tagi > treść > reszta)
export function scoreCardAgainstQuery(card, query) {
  const q = normalizeText(query);
  if (!q) return 0;

  const title   = normalizeText(card?.title);
  const tags    = normalizeText((card?.tags || []).join(' '));
  const desc    = normalizeText(card?.description);
  // obsłuż różne pola z edytora:
  const content =
    extractPlainText(card?.content) ||
    extractPlainText(card?.contentDelta) ||
    extractPlainText(card?.html) ||
    '';

  const blob = [title, tags, desc, content].join(' ').trim();
  if (!blob) return 0;

  const tokens = q.split(' ').filter(Boolean);

  let score = 0;
  for (const t of tokens) {
    if (title.includes(t))   score += 5;
    if (tags.includes(t))    score += 4;
    if (content.includes(t)) score += 3;
    if (desc.includes(t))    score += 2;
    if (blob.includes(t))    score += 1; // lekki bonus ogólny
  }
  return score;
}
