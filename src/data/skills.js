/** Content catalog: player skills and their supported word-length ranges. */
export const SKILL_DEFINITIONS = Object.freeze({
  "quick-strike": Object.freeze({
    id: "quick-strike", name: "すばやい斬撃",
    description: "3〜4文字の単語 · 安定した攻撃",
    minWordLength: 3, maxWordLength: 4, damageMultiplier: 1,
  }),
  "power-strike": Object.freeze({
    id: "power-strike", name: "強力な斬撃",
    description: "5〜6文字の単語 · ダメージ2倍",
    minWordLength: 5, maxWordLength: 6, damageMultiplier: 2,
  }),
  "ultimate-strike": Object.freeze({
    id: "ultimate-strike", name: "必殺技",
    description: "7〜8文字の単語 · ダメージ3倍",
    minWordLength: 7, maxWordLength: 8, damageMultiplier: 3,
  }),
});
