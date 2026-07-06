// Osmoz — FSRS-ilhamlı basit spaced repetition
// Tam FSRS-4.5 değil; ilk kullanım için sağlam ve kabul edilebilir sonuçlar veren pragmatik bir kernel.
// Kart üzerinde tutulan alanlar:
//   stability (S):  hafızada ne kadar kalacağı, gün cinsinden
//   difficulty (D): 1..10, kartın kişiye özel zorluğu
//   dueAt:          bir sonraki tekrar zamanı (unix ms)
//   reps:           kaç kez incelendi
//   lapses:         kaç kez unutuldu
//   state:          "new" | "learning" | "review" | "relearning"
//
// Rating: 1=Again, 2=Hard, 3=Good, 4=Easy

export const RATING = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
};

// İlk cevaba göre başlangıç stability (gün)
const INITIAL_STABILITY = { 1: 0.5, 2: 1, 3: 3, 4: 7 };
// Cevaba göre difficulty değişimi
const DIFFICULTY_DELTA = { 1: 1.2, 2: 0.4, 3: 0, 4: -0.4 };
// Cevaba göre stability multiplier
const STABILITY_FACTOR = { 1: 0.4, 2: 1.2, 3: 2.5, 4: 4.0 };

const DAY_MS = 24 * 60 * 60 * 1000;

export function initCard(now = Date.now()) {
  return {
    stability: 0,
    difficulty: 5,
    dueAt: now,
    reps: 0,
    lapses: 0,
    state: "new",
    lastReviewedAt: null,
  };
}

/**
 * Kartın FSRS metriklerini rating ile ilerlet.
 * @param {object} card mevcut kart FSRS state'i
 * @param {number} rating 1..4 (RATING)
 * @param {number} now unix ms
 * @returns {object} yeni state
 */
export function review(card, rating, now = Date.now()) {
  const next = { ...card };
  next.reps = (card.reps || 0) + 1;
  next.lastReviewedAt = now;

  const isFirst = card.state === "new" || card.stability === 0;

  if (isFirst) {
    next.stability = INITIAL_STABILITY[rating];
    next.difficulty = clampDifficulty(5 + DIFFICULTY_DELTA[rating]);
    next.state = rating === RATING.AGAIN ? "learning" : "review";
  } else {
    const elapsedDays = Math.max(
      1 / 24,
      ((now - (card.lastReviewedAt || card.dueAt)) / DAY_MS) || 1,
    );
    const retrievability = Math.exp(-elapsedDays / Math.max(0.1, card.stability));
    // Zorluk güncelle
    next.difficulty = clampDifficulty(card.difficulty + DIFFICULTY_DELTA[rating]);

    if (rating === RATING.AGAIN) {
      next.stability = Math.max(0.5, card.stability * 0.3);
      next.lapses = (card.lapses || 0) + 1;
      next.state = "relearning";
    } else {
      // Zorluk yüksekse stability daha az artar; hatırlanabilirlik düşükse daha çok artar
      const difficultyBoost = 11 - next.difficulty; // 1..10
      const retentionBoost = 1 + (1 - retrievability) * 1.5;
      const factor = STABILITY_FACTOR[rating] * (difficultyBoost / 10) * retentionBoost;
      next.stability = Math.max(0.5, card.stability * (1 + factor));
      next.state = "review";
    }
  }

  // Bir sonraki inceleme: stability kadar gün sonra
  // İlk öğrenme fazlarında saat cinsinden (0.5 gün = 12 saat)
  const intervalDays = next.stability;
  next.dueAt = now + intervalDays * DAY_MS;

  return next;
}

function clampDifficulty(d) {
  if (isNaN(d)) return 5;
  return Math.min(10, Math.max(1, d));
}

/**
 * Bugün için tekrar edilecek kartları seç (dueAt <= now).
 * Yeni kartlar için ayrı limit uygularsan burada da yapılabilir.
 * @param {Array} cards
 * @param {number} now
 * @param {number} maxNew - günlük yeni kart limiti
 */
export function selectDueCards(cards, now = Date.now(), maxNew = 10) {
  const due = cards.filter((c) => c.fsrs && c.fsrs.dueAt <= now && c.fsrs.state !== "new");
  const newCards = cards.filter((c) => !c.fsrs || c.fsrs.state === "new").slice(0, maxNew);
  return [...due, ...newCards];
}
