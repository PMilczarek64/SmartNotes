// === KONTEKSTOWE WYSZUKIWANIE Z RANKINGIEM ===
export const searchCardsThunk = ({ listId = null, q = '', favoritesOnly = false, tags = [] } = {}) =>
  async (_dispatch, getState) => {
    const state = getState();
    const allCards = (state.pouch?.cards || []).filter(c => !listId || c.listId === listId);

    // normalizacja PL znaków, case-insensitive
    const normalize = (s) =>
      (s ?? '')
        .toString()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, ''); // usuń akcenty/ogonek

    const tokenize = (s) => normalize(s).split(/[\s,.;:!?'"()[\]{}\-_/\\]+/).filter(Boolean);

    const qTokens = tokenize(q);
    const tagsNorm = Array.isArray(tags) ? tags.map(normalize) : [];
    const requiredTagSet = new Set(tagsNorm);

    // szybki lookup czy token == któryś z tagów karty
    const hasRequiredTags = (cardTags) => {
      if (!requiredTagSet.size) return true;
      for (const t of cardTags) if (requiredTagSet.has(t)) return true;
      return false;
    };

    const scored = allCards
      .map((c) => {
        if (favoritesOnly && !c.isFavorite) return null;

        const title = normalize(c.title);
        const desc  = normalize(c.description);
        const cardTags = (Array.isArray(c.tags) ? c.tags : []).map(normalize);

        if (!hasRequiredTags(cardTags)) return null;

        let score = 0;

        // 1) Dopasowanie tagów (wysoka waga)
        for (const t of cardTags) {
          if (requiredTagSet.has(t)) score += 8;
        }

        // 2) Dopasowanie tokenów zapytania
        for (const tok of qTokens) {
          if (!tok) continue;
          if (cardTags.includes(tok)) score += 8;     // tag==token
          if (title.includes(tok))     score += 5;     // w tytule
          if (desc.includes(tok))      score += 2;     // w opisie
        }

        // 3) Dopasowanie frazy (całe zapytanie)
        if (qTokens.length > 1) {
          const phrase = qTokens.join(' ');
          if (title.includes(phrase)) score += 5;
          if (desc.includes(phrase))  score += 3;
        }

        // 4) Świeżość (delikatny boost)
        const ts = new Date(c.updatedAt || c.createdAt || 0).getTime();
        if (ts) {
          const ageDays = (Date.now() - ts) / 86400000;       // dni
          const recencyBoost = Math.max(0, 5 - Math.floor(ageDays / 7));
          score += recencyBoost;
        }

        return { card: c, score };
      })
      .filter(Boolean)
      .filter(r => r.score > 0)
      .sort((a, b) =>
        b.score - a.score ||
        (b.card.updatedAt || '').localeCompare(a.card.updatedAt || '')
      );

    return scored.map(r => r.card);
  };
