import {
  useState,
  type ChangeEventHandler,
  type FocusEventHandler,
  type KeyboardEventHandler,
} from "react";

interface Props {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  inputClassName?: string;
  onChange: (value: number) => void;
}

function clamp(value: number, min?: number, max?: number) {
  let next = value;

  if (min != null) {
    next = Math.max(min, next);
  }

  if (max != null) {
    next = Math.min(max, next);
  }

  return next;
}

export function FormNumberStepper({
  id,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  inputClassName,
  onChange,
}: Props) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const inputValue = draftValue ?? String(value);

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const rawValue = event.target.value;
    setDraftValue(rawValue);

    if (rawValue === "") {
      return;
    }

    const nextValue = Number(rawValue);

    if (!Number.isFinite(nextValue)) {
      return;
    }

    onChange(nextValue);
  };

  const commitInputValue = (rawValue: string) => {
    const nextValue = rawValue === "" ? (min ?? 0) : Number(rawValue);

    if (!Number.isFinite(nextValue)) {
      setDraftValue(null);
      return;
    }

    const normalizedValue = clamp(nextValue, min, max);
    setDraftValue(null);
    onChange(normalizedValue);
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
    commitInputValue(event.target.value);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  const nudgeValue = (direction: 1 | -1) => {
    const stepStr = step.toString();
    const eMatch = stepStr.match(/e-(\d+)/);
    const decimals = eMatch
      ? parseInt(eMatch[1])
      : (stepStr.split(".")[1]?.length ?? 0);
    const rawNext = value + direction * step;
    const rounded = parseFloat(rawNext.toFixed(decimals));
    const nextValue = clamp(rounded, min, max);
    setDraftValue(null);
    onChange(nextValue);
  };

  return (
    <div className="rich-stepper" data-disabled={disabled}>
      <input
        id={id}
        className={inputClassName}
        type="number"
        value={inputValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <div className="rich-stepper__buttons" aria-hidden="true">
        <button
          type="button"
          className="rich-stepper__button"
          disabled={disabled}
          tabIndex={-1}
          onClick={() => nudgeValue(1)}
        >
          +
        </button>
        <button
          type="button"
          className="rich-stepper__button"
          disabled={disabled}
          tabIndex={-1}
          onClick={() => nudgeValue(-1)}
        >
          -
        </button>
      </div>
    </div>
  );
}
