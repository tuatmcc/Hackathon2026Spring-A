import * as Select from "@radix-ui/react-select";

const EMPTY_VALUE = "__EMPTY__";

export interface RichSelectOption {
  value: string;
  label: string;
}

interface RichSelectProps {
  id?: string;
  value: string;
  options: RichSelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  valueClassName?: string;
  contentClassName?: string;
}

function normalizeValue(value: string) {
  return value === "" ? EMPTY_VALUE : value;
}

function denormalizeValue(value: string) {
  return value === EMPTY_VALUE ? "" : value;
}

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function RichSelect({
  id,
  value,
  options,
  onValueChange,
  disabled = false,
  placeholder,
  triggerClassName,
  valueClassName,
  contentClassName,
}: RichSelectProps) {
  return (
    <Select.Root
      value={normalizeValue(value)}
      onValueChange={(nextValue) => onValueChange(denormalizeValue(nextValue))}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        className={joinClassNames(
          "rich-control-shell",
          "rich-control-shell--select",
          "rich-select__trigger",
          triggerClassName,
        )}
        aria-label={placeholder}
      >
        <Select.Value
          className={joinClassNames(
            "rich-control",
            "rich-control--select",
            "rich-select__value",
            valueClassName,
          )}
          placeholder={placeholder}
        />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className={joinClassNames("rich-select__content", contentClassName)}
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.Viewport className="rich-select__viewport">
            {options.map((option) => (
              <Select.Item
                key={normalizeValue(option.value)}
                value={normalizeValue(option.value)}
                className="rich-select__item"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
