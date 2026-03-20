import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { FormNumberStepper } from "./FormNumberStepper";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("FormNumberStepper", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps the field empty while editing until it blurs", () => {
    const { input, committedValue, unmount } = renderStepper({ min: 1, value: 32 });

    act(() => {
      input.focus();
    });

    changeValue(input, "");

    expect(input.value).toBe("");
    expect(committedValue.textContent).toBe("32");

    changeValue(input, "5");

    expect(input.value).toBe("5");
    expect(committedValue.textContent).toBe("5");

    unmount();
  });

  it("applies the minimum only when the field blurs", () => {
    const { input, committedValue, unmount } = renderStepper({ min: 1, value: 32 });

    act(() => {
      input.focus();
    });

    changeValue(input, "0");

    expect(input.value).toBe("0");
    expect(committedValue.textContent).toBe("0");

    act(() => {
      input.blur();
    });

    expect(input.value).toBe("1");
    expect(committedValue.textContent).toBe("1");

    unmount();
  });

  it("commits the normalized value when Enter is pressed", () => {
    const { input, committedValue, unmount } = renderStepper({ min: 0.0001, value: 0.1 });

    act(() => {
      input.focus();
    });

    changeValue(input, "0");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(input.value).toBe("0.0001");
    expect(committedValue.textContent).toBe("0.0001");

    unmount();
  });
});

function renderStepper({ min, value }: { min: number; value: number }) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(<Harness min={min} initialValue={value} />);
  });

  const input = container.querySelector("input");
  const committedValue = container.querySelector("output");

  if (!(input instanceof HTMLInputElement) || !(committedValue instanceof HTMLOutputElement)) {
    throw new Error("Failed to render stepper harness.");
  }

  return {
    input,
    committedValue,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function changeValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  if (!valueSetter) {
    throw new Error("Failed to access the input value setter.");
  }

  act(() => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function Harness({ min, initialValue }: { min: number; initialValue: number }) {
  const [value, setValue] = useState(initialValue);

  return (
    <>
      <FormNumberStepper value={value} min={min} onChange={setValue} />
      <output>{value}</output>
    </>
  );
}
