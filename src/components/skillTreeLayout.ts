import type { SkillDef } from "../types";

function getDependencyOrderScore(
  skill: SkillDef,
  previousLevelOrder: Map<string, number>,
  originalIndexById: Map<string, number>,
) {
  if (skill.dependencies.length === 0) {
    return originalIndexById.get(skill.id) ?? 0;
  }

  const dependencyOrders = skill.dependencies.map(
    (dependencyId) =>
      previousLevelOrder.get(dependencyId) ?? originalIndexById.get(dependencyId) ?? 0,
  );

  return dependencyOrders.reduce((total, order) => total + order, 0) / dependencyOrders.length;
}

export function groupByLevel(skills: SkillDef[]): SkillDef[][] {
  const levels = new Map<string, number>();
  const originalIndexById = new Map(skills.map((skill, index) => [skill.id, index]));
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));

  function getLevel(skill: SkillDef): number {
    if (levels.has(skill.id)) return levels.get(skill.id)!;
    if (skill.dependencies.length === 0) {
      levels.set(skill.id, 0);
      return 0;
    }
    const maxDepLevel = Math.max(
      ...skill.dependencies.map((dependencyId) => {
        const dependency = skillById.get(dependencyId);
        return dependency ? getLevel(dependency) : 0;
      }),
    );
    levels.set(skill.id, maxDepLevel + 1);
    return maxDepLevel + 1;
  }

  skills.forEach((skill) => getLevel(skill));

  const maxLevel = Math.max(...levels.values(), 0);
  const grouped = Array.from({ length: maxLevel + 1 }, (_, index) =>
    skills.filter((skill) => levels.get(skill.id) === index),
  );

  let previousLevelOrder = new Map<string, number>();
  grouped.forEach((levelSkills) => {
    levelSkills.sort((leftSkill, rightSkill) => {
      const leftScore = getDependencyOrderScore(
        leftSkill,
        previousLevelOrder,
        originalIndexById,
      );
      const rightScore = getDependencyOrderScore(
        rightSkill,
        previousLevelOrder,
        originalIndexById,
      );

      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }

      return (originalIndexById.get(leftSkill.id) ?? 0) - (originalIndexById.get(rightSkill.id) ?? 0);
    });

    previousLevelOrder = new Map(levelSkills.map((skill, index) => [skill.id, index]));
  });

  return grouped;
}
