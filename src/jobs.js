/**
 * Playable starting professions.
 * IDs remain stable so existing saves using "swordsman" keep working.
 */
export const DEFAULT_JOB_ID = "swordsman";

export const JOBS = Object.freeze([
  Object.freeze({
    id: "swordsman",
    characterId: "gou-swordsman",
    name: "轟剣士",
    title: "蓄積・一撃必殺",
    icon: "⚔️",
    description: "轟気を蓄え、最後に一気に解放する高火力型の職業。",
    strength: "轟気を使った強力な一撃",
    note: "選択可能",
  }),
  Object.freeze({
    id: "regen-knight",
    characterId: "regen-knight",
    name: "再生騎士",
    title: "回復・持久戦",
    icon: "🛡️",
    description: "回復と防御を組み合わせ、粘り強く戦う職業。",
    strength: "HP管理と長期戦",
    note: "選択可能",
  }),
  Object.freeze({
    id: "shadow-blade",
    characterId: "shadow-blade",
    name: "影刃",
    title: "会心・高速連撃",
    icon: "🗡️",
    description: "素早い攻撃と会心を重ねてダメージを狙う職業。",
    strength: "会心率と連続攻撃",
    note: "選択可能",
  }),
  Object.freeze({
    id: "elemental-mage",
    characterId: "elemental-mage",
    name: "元素術師",
    title: "属性・魔法連鎖",
    icon: "🔮",
    description: "炎・雷・水・風・土の魔法を使い分ける職業。",
    strength: "属性魔法と魔力",
    note: "選択可能",
  }),
]);

const JOB_BY_ID = Object.freeze(Object.fromEntries(JOBS.map((job) => [job.id, job])));

export function isValidJobId(value) {
  return typeof value === "string" && Object.hasOwn(JOB_BY_ID, value);
}

export function getJobDefinition(value) {
  return isValidJobId(value) ? JOB_BY_ID[value] : null;
}
