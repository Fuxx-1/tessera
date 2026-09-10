import { useCallback, useState } from "react";

export function useControllableState<T>({
  defaultValue,
  fallbackValue,
  onChange,
  value,
}: {
  defaultValue?: T;
  fallbackValue: T;
  onChange?: (value: T) => void;
  value?: T;
}) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<T>(defaultValue ?? fallbackValue);
  const currentValue = isControlled ? value : internalValue;

  const setValue = useCallback(
    (nextValue: T) => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }
      onChange?.(nextValue);
    },
    [isControlled, onChange],
  );

  return [currentValue, setValue] as const;
}
