/**
 * Starting professions. More jobs can be added here as their gameplay is implemented.
 * Character combat styles (轟剣士など) remain separate from these professions.
 */
export const DEFAULT_JOB_ID = "swordsman";

export const JOBS = Object.freeze([
  Object.freeze({
    id: "swordsman",
    name: "剣士",
    title: "近接攻撃を得意とする基本職",
    icon: "⚔️",
    description: "剣を使った攻撃を中心に戦う、冒険の基本となる職業。",
    strength: "物理攻撃を中心に戦う",
    note: "現在選択できる職業",
  }),
]);

const JOB_BY_ID = Object.freeze(Object.fromEntries(JOBS.map((job) => [job.id, job])));

export function isValidJobId(value) {
  return typeof value === "string" && Object.hasOwn(JOB_BY_ID, value);
}

export function getJobDefinition(value) {
  return isValidJobId(value) ? JOB_BY_ID[value] : null;
}
