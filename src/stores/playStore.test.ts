import { beforeEach, describe, expect, it } from "vitest";
import { usePlayStore } from "./playStore";

describe("playStore fixed nodes", () => {
  beforeEach(() => {
    usePlayStore.getState().resetPlay();
  });

  it("固定ノードを初期化できる", () => {
    usePlayStore.getState().initializeFixedNodes();

    const { fixedNodes } = usePlayStore.getState();
    expect(fixedNodes.map((node) => node.id)).toEqual(["__input__", "__output__"]);
    expect(fixedNodes[0]?.position).toEqual({ x: 0, y: 150 });
    expect(fixedNodes[1]?.position).toEqual({ x: 600, y: 150 });
  });

  it("固定ノードの位置を更新しても再初期化で上書きしない", () => {
    const store = usePlayStore.getState();
    store.initializeFixedNodes();
    store.onFixedNodesChange([
      {
        id: "__input__",
        type: "position",
        position: { x: 120, y: 240 },
        dragging: false,
      },
    ]);

    usePlayStore.getState().initializeFixedNodes();

    expect(usePlayStore.getState().fixedNodes[0]?.position).toEqual({
      x: 120,
      y: 240,
    });
  });
});
