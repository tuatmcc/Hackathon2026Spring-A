import { describe, expect, it } from "vitest";
import { SKILL_DATA } from "../config/skills";
import type { SkillDef } from "../types";
import { buildSkillTreeLayout, groupByLevel } from "./skillTreeLayout";

describe("groupByLevel", () => {
  it("keeps sibling skills aligned with their dependencies in the layer tree", () => {
    const layerSkills = SKILL_DATA.filter((skill) => skill.treeId === "layer");

    const levels = groupByLevel(layerSkills).map((level: SkillDef[]) => level.map((skill: SkillDef) => skill.id));

    expect(levels).toEqual([
      ["dense"],
      ["dense_width_cap_4", "model_params_cap_32", "flatten"],
      ["dense_width_cap_6", "model_params_cap_64", "conv2d"],
      ["dense_width_cap_8", "model_params_cap_128"],
      ["dense_width_cap_10", "model_params_cap_256"],
      ["dense_width_cap_12", "model_params_cap_512"],
      ["model_params_cap_1024"],
      ["model_params_cap_4096"],
    ]);
  });
});

describe("buildSkillTreeLayout", () => {
  it("keeps single-child branches in the same vertical lane", () => {
    const layerSkills = SKILL_DATA.filter((skill) => skill.treeId === "layer");
    const layout = buildSkillTreeLayout(layerSkills);

    expect(layout.positions.get("dense")?.column).toBe(1);
    expect(layout.positions.get("dense_width_cap_4")?.column).toBe(0);
    expect(layout.positions.get("dense_width_cap_6")?.column).toBe(0);
    expect(layout.positions.get("flatten")?.column).toBe(2);
    expect(layout.positions.get("conv2d")?.column).toBe(2);
  });
});
