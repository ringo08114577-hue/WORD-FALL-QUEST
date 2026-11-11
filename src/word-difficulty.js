/**
 * Shared word-difficulty balance.
 * Selection weights are normalized over the difficulties available to a skill.
 */
export const WORD_DIFFICULTY_DEFINITIONS = Object.freeze({
  1: Object.freeze({ level: 1, label: "基礎", damageMultiplier: 1, selectionWeight: 35 }),
  2: Object.freeze({ level: 2, label: "初級", damageMultiplier: 1.5, selectionWeight: 25 }),
  3: Object.freeze({ level: 3, label: "中級", damageMultiplier: 2.2, selectionWeight: 18 }),
  4: Object.freeze({ level: 4, label: "上級", damageMultiplier: 3.2, selectionWeight: 12 }),
  5: Object.freeze({ level: 5, label: "難関", damageMultiplier: 4.8, selectionWeight: 7 }),
  6: Object.freeze({ level: 6, label: "最難関", damageMultiplier: 7, selectionWeight: 3 }),
});

export const SKILL_LEVEL_DIFFICULTY_RANGES = Object.freeze({
  1: Object.freeze({ min: 1, max: 2 }),
  2: Object.freeze({ min: 1, max: 3 }),
  3: Object.freeze({ min: 2, max: 4 }),
  4: Object.freeze({ min: 3, max: 5 }),
  5: Object.freeze({ min: 4, max: 6 }),
});

export function getWordDifficultyDefinition(level) {
  if (!Number.isInteger(level) || !Object.hasOwn(WORD_DIFFICULTY_DEFINITIONS, level)) {
    throw new RangeError("単語難易度は1〜6で指定してください。");
  }
  return WORD_DIFFICULTY_DEFINITIONS[level];
}

export function getWordDifficultyMultiplier(level) {
  return getWordDifficultyDefinition(level).damageMultiplier;
}

export function getWordDifficultyWeight(level) {
  return getWordDifficultyDefinition(level).selectionWeight;
}

export function getSkillLevelDifficultyRange(level) {
  if (!Number.isInteger(level) || !Object.hasOwn(SKILL_LEVEL_DIFFICULTY_RANGES, level)) {
    throw new RangeError("スキルレベルは1〜5で指定してください。");
  }
  return SKILL_LEVEL_DIFFICULTY_RANGES[level];
}
