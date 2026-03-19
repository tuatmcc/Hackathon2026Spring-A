import { describe, expect, it } from "vitest";
import { SKILL_DATA } from "../config/skills";
import type { SkillDef } from "../types";
import { groupByLevel } from "./SkillTreeUtils";

describe("groupByLevel", () => {
  it("keeps sibling skills aligned with their dependencies in the layer tree", () => {
    const layerSkills = SKILL_DATA.filter((skill) => skill.treeId === "layer");

    const levels = groupByLevel(layerSkills).map((level: SkillDef[]) => level.map((skill: SkillDef) => skill.id));

    expect(levels).toEqual([
      ["dense"],
      ["dense_width_cap_4", "conv2d"],
      ["dense_width_cap_6", "flatten"],
      ["dense_width_cap_8"],
    ]);
  });
});
