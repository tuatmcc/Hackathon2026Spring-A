import type { SkillDef } from "../types";

export interface SkillTreeNodeLayout {
  column: number;
  level: number;
}

export interface SkillTreeLayoutResult {
  columnCount: number;
  levelCount: number;
  positions: Map<string, SkillTreeNodeLayout>;
}

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

export function buildSkillTreeLayout(skills: SkillDef[]): SkillTreeLayoutResult {
  const originalIndexById = new Map(skills.map((skill, index) => [skill.id, index]));
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  const childrenById = new Map<string, SkillDef[]>();
  const levelById = new Map<string, number>();

  function getLevel(skill: SkillDef): number {
    const cachedLevel = levelById.get(skill.id);
    if (cachedLevel != null) {
      return cachedLevel;
    }

    if (skill.dependencies.length === 0) {
      levelById.set(skill.id, 0);
      return 0;
    }

    const nextLevel =
      Math.max(
        ...skill.dependencies.map((dependencyId) => {
          const dependency = skillById.get(dependencyId);
          return dependency ? getLevel(dependency) : 0;
        }),
      ) + 1;

    levelById.set(skill.id, nextLevel);
    return nextLevel;
  }

  skills.forEach((skill) => {
    getLevel(skill);

    // The current skill data behaves as a tree. If a skill ever has multiple
    // dependencies, place it under the first one to keep the layout stable.
    const parentId = skill.dependencies[0];
    if (!parentId || !skillById.has(parentId)) {
      return;
    }

    const siblings = childrenById.get(parentId) ?? [];
    siblings.push(skill);
    childrenById.set(parentId, siblings);
  });

  childrenById.forEach((children) => {
    children.sort(
      (leftSkill, rightSkill) =>
        (originalIndexById.get(leftSkill.id) ?? 0) -
        (originalIndexById.get(rightSkill.id) ?? 0),
    );
  });

  const subtreeWidthById = new Map<string, number>();

  function getSubtreeWidth(skillId: string): number {
    const cachedWidth = subtreeWidthById.get(skillId);
    if (cachedWidth != null) {
      return cachedWidth;
    }

    const children = childrenById.get(skillId) ?? [];
    if (children.length === 0) {
      subtreeWidthById.set(skillId, 1);
      return 1;
    }

    const nextWidth = children.reduce(
      (totalWidth, child) => totalWidth + getSubtreeWidth(child.id),
      0,
    );
    subtreeWidthById.set(skillId, nextWidth);
    return nextWidth;
  }

  const roots = skills
    .filter(
      (skill) =>
        skill.dependencies.length === 0 ||
        skill.dependencies.every((dependencyId) => !skillById.has(dependencyId)),
    )
    .sort(
      (leftSkill, rightSkill) =>
        (originalIndexById.get(leftSkill.id) ?? 0) -
        (originalIndexById.get(rightSkill.id) ?? 0),
    );

  const positions = new Map<string, SkillTreeNodeLayout>();
  let nextColumnStart = 0;

  function placeSubtree(skill: SkillDef, leftColumn: number) {
    const subtreeWidth = getSubtreeWidth(skill.id);
    const children = childrenById.get(skill.id) ?? [];
    positions.set(skill.id, {
      column: leftColumn + (subtreeWidth - 1) / 2,
      level: levelById.get(skill.id) ?? 0,
    });

    let childColumnStart = leftColumn;
    children.forEach((child) => {
      placeSubtree(child, childColumnStart);
      childColumnStart += getSubtreeWidth(child.id);
    });
  }

  roots.forEach((rootSkill) => {
    placeSubtree(rootSkill, nextColumnStart);
    nextColumnStart += getSubtreeWidth(rootSkill.id) + 1;
  });

  const columnValues = Array.from(positions.values(), (position) => position.column);
  const levelValues = Array.from(positions.values(), (position) => position.level);

  return {
    columnCount:
      columnValues.length === 0 ? 0 : Math.ceil(Math.max(...columnValues) + 1),
    levelCount: levelValues.length === 0 ? 0 : Math.max(...levelValues) + 1,
    positions,
  };
}
