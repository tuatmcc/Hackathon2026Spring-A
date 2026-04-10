import { describe, expect, it } from "vitest";
import { NETWORK_EDITOR_INTERACTION } from "./networkEditorInteractionConfig";

describe("networkEditorInteractionConfig", () => {
  it("uses expanded radii and edge interaction width for easier edge operations", () => {
    expect(NETWORK_EDITOR_INTERACTION.connectionRadius).toBe(40);
    expect(NETWORK_EDITOR_INTERACTION.reconnectRadius).toBe(24);
    expect(NETWORK_EDITOR_INTERACTION.edgeInteractionWidth).toBe(32);
    expect(NETWORK_EDITOR_INTERACTION.connectionRadius).toBeGreaterThan(
      NETWORK_EDITOR_INTERACTION.reconnectRadius,
    );
  });
});
