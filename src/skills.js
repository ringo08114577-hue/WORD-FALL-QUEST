/** Skill lookup and domain helpers. Add skill definitions in ./data/skills.js. */
import { SKILL_DEFINITIONS } from "./data/skills.js";

export { SKILL_DEFINITIONS };

export function getSkillDefinition(skillId) {
  return Object.hasOwn(SKILL_DEFINITIONS, skillId)
    ? SKILL_DEFINITIONS[skillId]
    : null;
}
