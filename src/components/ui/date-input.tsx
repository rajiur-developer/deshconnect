"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { formatDayFirstDate, getDayFirstDateError, parseDayFirstDate } from "@/lib/date-input";

type DateInputProps = {
  id: string;
  name: string;
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  required?: boolean;
  onChange?: (value: string) => void;
};

export function DateInput({
  id,
  name,
  value,
  defaultValue = "",
  min,
  max,
  required,
  onChange,
}: DateInputProps) {
  const initialValue = value ?? defaultValue;
  const [isoDate, setIsoDate] = useState(initialValue);
  const [displayValue, setDisplayValue] = useState(formatDayFirstDate(initialValue));
  const datePicker = useRef<HTMLInputElement>(null);
  const displayInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === undefined) return;
    setIsoDate(value);
    setDisplayValue(formatDayFirstDate(value));
  }, [value]);

  function updateDisplay(nextDisplayValue: string) {
    setDisplayValue(nextDisplayValue);
    const parsed = parseDayFirstDate(nextDisplayValue);
    const isInRange = parsed !== null && (!min || parsed >= min) && (!max || parsed <= max);
    const nextIsoDate = isInRange ? parsed : "";
    setIsoDate(nextIsoDate);
    onChange?.(nextIsoDate);
  }

  function selectNativeDate(nextIsoDate: string) {
    setIsoDate(nextIsoDate);
    setDisplayValue(formatDayFirstDate(nextIsoDate));
    displayInput.current?.setCustomValidity("");
    onChange?.(nextIsoDate);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={isoDate} />
      <input
        ref={displayInput}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        pattern="\d{1,2}/\d{1,2}/\d{4}"
        value={displayValue}
        required={required}
        aria-describedby={`${id}-format`}
        onChange={(event) => {
          const nextValue = event.target.value;
          event.currentTarget.setCustomValidity(getDayFirstDateError(nextValue, min, max) ?? "");
          updateDisplay(nextValue);
        }}
        onBlur={(event) => {
          event.currentTarget.setCustomValidity(
            getDayFirstDateError(event.currentTarget.value, min, max) ?? "",
          );
        }}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus-ring"
      />
      <span id={`${id}-format`} className="sr-only">
        Enter date as day, month, year.
      </span>
      <button
        type="button"
        aria-label="Choose date"
        onClick={() => {
          const picker = datePicker.current;
          if (!picker) return;
          if (picker.showPicker) picker.showPicker();
          else picker.click();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        <Icon name="calendar" className="h-4 w-4" />
      </button>
      <input
        ref={datePicker}
        type="date"
        lang="en-GB"
        value={isoDate}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => selectNativeDate(event.target.value)}
        className="pointer-events-none absolute right-2 top-1/2 h-px w-px -translate-y-1/2 opacity-0"
      />
    </div>
  );
}
