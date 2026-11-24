/** Content catalog: player skills and their supported word-length ranges. */
export const SKILL_DEFINITIONS = Object.freeze({
  "quick-strike": Object.freeze({
    id: "quick-strike", name: "すばやい斬撃", evolvedName: "疾風の斬撃", category: "attack", initiallyEquipped: true,
    description: "3〜4文字の単語 · 安定した攻撃",
    minWordLength: 3, maxWordLength: 4, damageMultiplier: 1,
    startingLevel: 1, maxLevel: 5,
    upgradeCosts: Object.freeze([50, 100, 200, 400]),
  }),
  "power-strike": Object.freeze({
    id: "power-strike", name: "強力な斬撃", evolvedName: "剛力の斬撃", category: "attack", initiallyEquipped: true,
    description: "5〜6文字の単語 · ダメージ2倍",
    minWordLength: 5, maxWordLength: 6, damageMultiplier: 2,
    startingLevel: 1, maxLevel: 5,
    upgradeCosts: Object.freeze([50, 100, 200, 400]),
  }),
  "ultimate-strike": Object.freeze({
    id: "ultimate-strike", name: "必殺技", evolvedName: "究極の斬撃", category: "attack", initiallyEquipped: true,
    description: "7〜8文字の単語 · ダメージ3倍",
    minWordLength: 7, maxWordLength: 8, damageMultiplier: 3,
    startingLevel: 1, maxLevel: 5,
    upgradeCosts: Object.freeze([50, 100, 200, 400]),
  }),
  "healing-light": Object.freeze({
    id: "healing-light", name: "いやしの光", evolvedName: "聖なるいやし", category: "heal", initiallyEquipped: true,
    description: "3〜4文字の単語 · HPを回復する",
    minWordLength: 3, maxWordLength: 4,
    wordDifficultyRange: Object.freeze({ min: 1, max: 2 }),
    effect: Object.freeze({
      type: "heal",
      amountByLevel: Object.freeze([30, 40, 50, 60, 70]),
      hpRatioByLevel: Object.freeze([0.3, 0.4, 0.5, 0.6, 0.7]),
    }),
    startingLevel: 1, maxLevel: 5,
    upgradeCosts: Object.freeze([50, 100, 200, 400]),
  }),
  "iron-guard": Object.freeze({
    id: "iron-guard", name: "鉄壁の構え", evolvedName: "不屈の鉄壁", category: "defense",
    description: "3〜4文字の単語 · 次の敵の攻撃を軽減する",
    minWordLength: 3, maxWordLength: 4,
    wordDifficultyRange: Object.freeze({ min: 1, max: 2 }),
    effect: Object.freeze({
      type: "defense", bonusByLevel: Object.freeze([20, 25, 30, 35, 40]), hits: 2,
    }),
    startingLevel: 1, maxLevel: 5,
    upgradeCosts: Object.freeze([50, 100, 200, 400]),
  }),
  "battle-cry": Object.freeze({
    id: "battle-cry", name: "力の咆哮", evolvedName: "覇者の咆哮", category: "support",
    description: "3〜4文字の単語 · 次の攻撃を強化する",
    minWordLength: 3, maxWordLength: 4,
    wordDifficultyRange: Object.freeze({ min: 1, max: 2 }),
    effect: Object.freeze({
      type: "attack-buff",
      multiplierByLevel: Object.freeze([1.2, 1.3, 1.4, 1.5, 1.6]),
      uses: 2,
    }),
    startingLevel: 1, maxLevel: 5,
    upgradeCosts: Object.freeze([50, 100, 200, 400]),
  }),
});
