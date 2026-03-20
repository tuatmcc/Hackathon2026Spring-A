import type { ChangeEventHandler } from "react";

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
  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const rawValue = event.target.value;
    const nextValue = rawValue === "" ? (min ?? 0) : Number(rawValue);

    if (!Number.isFinite(nextValue)) {
      return;
    }

    onChange(clamp(nextValue, min, max));
  };

  const nudgeValue = (direction: 1 | -1) => {
    onChange(clamp(value + direction * step, min, max));
  };

  return (
    <div className="rich-stepper" data-disabled={disabled}>
      <input
        id={id}
        className={inputClassName}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={handleInputChange}
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
