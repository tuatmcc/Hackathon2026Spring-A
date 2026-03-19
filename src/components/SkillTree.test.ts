import { describe, expect, it } from "vitest";
import { SKILL_DATA } from "../config/skills";
import { groupByLevel } from "./skillTreeLayout";

describe("groupByLevel", () => {
  it("keeps sibling skills aligned with their dependencies in the layer tree", () => {
    const layerSkills = SKILL_DATA.filter((skill) => skill.treeId === "layer");

    const levels = groupByLevel(layerSkills).map((level) => level.map((skill) => skill.id));

    expect(levels).toEqual([
      ["dense"],
      ["dense_width_cap_4", "model_params_cap_32", "conv2d"],
      ["dense_width_cap_6", "model_params_cap_64", "flatten"],
      ["dense_width_cap_8", "model_params_cap_128"],
      ["model_params_cap_256"],
      ["model_params_cap_512"],
      ["model_params_cap_1024"],
      ["model_params_cap_4096"],
    ]);
  });
});
