"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/componets/ui/popover";
import { ScrollArea } from "@/app/componets/ui/scroll-area";
import { cn } from "@/lib/utils";

export type DateRangeFilterProps = {
  /**
   * Callback fired when date range is applied or cleared.
   * Provides both Date objects (at local midnight/end-of-day) and "YYYY-MM-DD" local date strings.
   */
  onDateRangeChange?: (
    start: Date | null,
    end: Date | null,
    startStr?: string,
    endStr?: string,
  ) => void;
  title?: string;
  placeholder?: string;
  maxDays?: number;
  defaultStartDate?: Date | string | null;
  defaultEndDate?: Date | string | null;
  showTime?: boolean;
  allowFutureDates?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
  disabled?: boolean;
};

/**
 * Format local Date to "YYYY-MM-DD" without timezone offset distortion
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Parse string "YYYY-MM-DD" or Date safely to local midnight Date
 */
export const parseLocalDate = (
  input?: Date | string | null,
): Date | null => {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  if (typeof input === "string") {
    const parts = input.split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  const fallback = new Date(input);
  return isNaN(fallback.getTime())
    ? null
    : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
};

const SelectorDropdown = ({
  show,
  items,
  onSelect,
  current,
}: {
  show: boolean;
  items: (string | number)[];
  onSelect: (item: number) => void;
  current: number;
}) =>
  show && (
    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-full min-w-[120px] overflow-hidden">
      <ScrollArea className="h-48">
        <div className="p-1 space-y-0.5">
          {items.map((item, index) => {
            const isSelected =
              typeof item === "string" ? index === current : item === current;
            return (
              <button
                key={typeof item === "string" ? item : String(item)}
                type="button"
                className={cn(
                  "w-full text-left font-medium h-7 px-2.5 text-xs rounded-lg transition-colors flex items-center cursor-pointer",
                  isSelected
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-slate-700 hover:bg-slate-100",
                )}
                onClick={() =>
                  onSelect(typeof item === "string" ? index : (item as number))
                }
              >
                {typeof item === "string" ? item : String(item)}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onDateRangeChange,
  title,
  placeholder = "Select Date Range",
  maxDays,
  defaultStartDate,
  defaultEndDate,
  showTime = false,
  allowFutureDates = true,
  className,
  align = "start",
  disabled = false,
}) => {
  const displayTitle = title || placeholder;

  const initialStart = useMemo(
    () => parseLocalDate(defaultStartDate),
    [defaultStartDate],
  );
  const initialEnd = useMemo(
    () => parseLocalDate(defaultEndDate),
    [defaultEndDate],
  );

  const [currentMonth, setCurrentMonth] = useState<Date>(
    initialStart || new Date(),
  );
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(
    initialStart,
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(
    initialEnd,
  );

  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    const minYear = 2020;
    const maxYear = allowFutureDates ? currentYear + 10 : currentYear;
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [allowFutureDates, currentYear]);

  const handleMonthChange = (monthIndex: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
    setShowMonthSelector(false);
  };

  const handleYearChange = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setShowYearSelector(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];
    const firstDayOfWeek = firstDay.getDay();

    // Previous month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Next month padding to fill out 42 slots (6 weeks full grid)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const isDateSelected = (date: Date) => {
    if (selectedStartDate && isSameDay(date, selectedStartDate)) return true;
    if (selectedEndDate && isSameDay(date, selectedEndDate)) return true;
    return false;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isRangeStart = (date: Date) => {
    return selectedStartDate ? isSameDay(date, selectedStartDate) : false;
  };

  const isRangeEnd = (date: Date) => {
    return selectedEndDate ? isSameDay(date, selectedEndDate) : false;
  };

  const isDateInRange = (date: Date) => {
    if (!selectedStartDate || !selectedEndDate) return false;
    const t = date.getTime();
    return t >= selectedStartDate.getTime() && t <= selectedEndDate.getTime();
  };

  const isDateDisabled = (date: Date) => {
    if (!allowFutureDates) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (date.getTime() > today.getTime()) return true;
    }
    return false;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return isSameDay(date, today);
  };

  const getDaysBetween = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    setError(null);

    const clickedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(clickedDate);
      setSelectedEndDate(null);
    } else if (selectedStartDate && !selectedEndDate) {
      if (clickedDate.getTime() < selectedStartDate.getTime()) {
        setSelectedStartDate(clickedDate);
      } else {
        if (maxDays) {
          const days = getDaysBetween(selectedStartDate, clickedDate);
          if (days > maxDays) {
            setError(`Range cannot exceed ${maxDays} days`);
            return;
          }
        }
        setSelectedEndDate(clickedDate);
      }
    }
  };

  const handleApply = () => {
    if (!selectedStartDate) {
      setError("Please select at least a start date");
      return;
    }

    const effectiveEnd = selectedEndDate || selectedStartDate;

    const startWithTime = new Date(selectedStartDate);
    const endWithTime = new Date(effectiveEnd);

    if (showTime) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      startWithTime.setHours(startH || 0, startM || 0, 0, 0);
      endWithTime.setHours(endH || 23, endM || 59, 59, 999);
    } else {
      startWithTime.setHours(0, 0, 0, 0);
      endWithTime.setHours(23, 59, 59, 999);
    }

    if (maxDays) {
      const days = getDaysBetween(selectedStartDate, effectiveEnd);
      if (days > maxDays) {
        setError(`Date range exceeds limit of ${maxDays} days`);
        return;
      }
    }

    const startStr = formatLocalDate(selectedStartDate);
    const endStr = formatLocalDate(effectiveEnd);

    onDateRangeChange?.(startWithTime, endWithTime, startStr, endStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setError(null);
    onDateRangeChange?.(null, null, undefined, undefined);
    setIsOpen(false);
  };

  const handleDirectClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClear();
  };

  const formatDateDisplay = (date: Date, time?: string) => {
    const monthsShort = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthsShort[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    if (showTime && time) {
      return `${month} ${day}, ${year} ${formatTo12Hr(time)}`;
    }
    return `${month} ${day}, ${year}`;
  };

  const formatTo12Hr = (time24: string) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  // Preset generators
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const next7DaysEnd = new Date(today);
  next7DaysEnd.setDate(today.getDate() + 6);

  const next30DaysEnd = new Date(today);
  next30DaysEnd.setDate(today.getDate() + 29);

  const createPreset = (
    label: string,
    startDate: Date,
    endDate: Date,
    condition: boolean = true,
  ) => {
    return {
      label,
      visible: condition,
      disabled: maxDays
        ? getDaysBetween(startDate, endDate) > maxDays
        : false,
      action: () => {
        setSelectedStartDate(new Date(startDate));
        setSelectedEndDate(new Date(endDate));
        setCurrentMonth(
          new Date(startDate.getFullYear(), startDate.getMonth(), 1),
        );
      },
    };
  };

  const allPresets = [
    createPreset("Today", today, today),
    createPreset("Yesterday", yesterday, yesterday),
    createPreset(
      "This Week",
      thisWeekStart,
      allowFutureDates
        ? new Date(thisWeekStart.getTime() + 6 * 86400000)
        : today,
    ),
    createPreset("Last Week", lastWeekStart, lastWeekEnd),
    createPreset(
      "This Month",
      thisMonthStart,
      allowFutureDates
        ? new Date(today.getFullYear(), today.getMonth() + 1, 0)
        : today,
    ),
    createPreset("Last Month", lastMonthStart, lastMonthEnd),
    createPreset("Next 7 Days", today, next7DaysEnd, allowFutureDates),
    createPreset("Next 30 Days", today, next30DaysEnd, allowFutureDates),
    {
      label: "Custom Range",
      visible: true,
      disabled: false,
      action: () => {
        setSelectedStartDate(null);
        setSelectedEndDate(null);
      },
    },
  ];

  const presets = allPresets.filter((p) => p.visible);

  const isPresetActive = (label: string): boolean => {
    if (!selectedStartDate || !selectedEndDate) return false;
    const startStr = formatLocalDate(selectedStartDate);
    const endStr = formatLocalDate(selectedEndDate);

    switch (label) {
      case "Today":
        return (
          startStr === formatLocalDate(today) &&
          endStr === formatLocalDate(today)
        );
      case "Yesterday":
        return (
          startStr === formatLocalDate(yesterday) &&
          endStr === formatLocalDate(yesterday)
        );
      case "This Week": {
        const expectedEnd = allowFutureDates
          ? new Date(thisWeekStart.getTime() + 6 * 86400000)
          : today;
        return (
          startStr === formatLocalDate(thisWeekStart) &&
          endStr === formatLocalDate(expectedEnd)
        );
      }
      case "Last Week":
        return (
          startStr === formatLocalDate(lastWeekStart) &&
          endStr === formatLocalDate(lastWeekEnd)
        );
      case "This Month": {
        const expectedEnd = allowFutureDates
          ? new Date(today.getFullYear(), today.getMonth() + 1, 0)
          : today;
        return (
          startStr === formatLocalDate(thisMonthStart) &&
          endStr === formatLocalDate(expectedEnd)
        );
      }
      case "Last Month":
        return (
          startStr === formatLocalDate(lastMonthStart) &&
          endStr === formatLocalDate(lastMonthEnd)
        );
      case "Next 7 Days":
        return (
          startStr === formatLocalDate(today) &&
          endStr === formatLocalDate(next7DaysEnd)
        );
      case "Next 30 Days":
        return (
          startStr === formatLocalDate(today) &&
          endStr === formatLocalDate(next30DaysEnd)
        );
      default:
        return false;
    }
  };

  const hasActiveSelection = Boolean(selectedStartDate);

  const rangeDaysCount = useMemo(() => {
    if (selectedStartDate && selectedEndDate) {
      return getDaysBetween(selectedStartDate, selectedEndDate);
    }
    if (selectedStartDate) return 1;
    return 0;
  }, [selectedStartDate, selectedEndDate]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "group relative flex items-center justify-between text-left font-normal cursor-pointer w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all shadow-xs",
            className,
          )}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            <CalendarIcon className="size-4 shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="truncate font-medium text-slate-700">
              {selectedStartDate && selectedEndDate
                ? selectedStartDate.toDateString() ===
                  selectedEndDate.toDateString()
                  ? formatDateDisplay(selectedStartDate, startTime)
                  : `${formatDateDisplay(selectedStartDate, startTime)} - ${formatDateDisplay(
                      selectedEndDate,
                      endTime,
                    )}`
                : selectedStartDate
                  ? `${formatDateDisplay(selectedStartDate, startTime)} - ...`
                  : displayTitle}
            </span>
          </div>

          {hasActiveSelection ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleDirectClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClear();
                }
              }}
              title="Clear date range"
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </span>
          ) : (
            <ChevronDown className="size-4 text-slate-400 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 z-[9999] rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl overflow-hidden"
        align={align}
        sideOffset={6}
      >
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white">
          {/* Presets Sidebar */}
          <div className="p-3 w-full sm:w-36 bg-slate-50 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">
                Quick Select
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
                {presets.map((preset) => {
                  const active = isPresetActive(preset.label);
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={preset.disabled}
                      onClick={preset.action}
                      className={cn(
                        "w-full text-left h-7 px-2.5 text-xs rounded-lg font-medium transition-all cursor-pointer flex items-center justify-between",
                        active
                          ? "bg-blue-600 text-white font-semibold shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60",
                        preset.disabled &&
                          "opacity-40 cursor-not-allowed pointer-events-none",
                      )}
                    >
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {maxDays && (
              <div className="mt-3 p-2 text-[10px] text-slate-500 bg-slate-100 border border-slate-200 rounded-lg text-center">
                Max {maxDays} days allowed
              </div>
            )}
          </div>

          {/* Calendar Area */}
          <div className="p-4 bg-white">
            {/* Month & Year Navigation Header */}
            <div className="flex items-center justify-between mb-3.5">
              <button
                type="button"
                className="size-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer flex items-center justify-center transition"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronLeft className="size-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {/* Month Picker */}
                <div className="relative">
                  <button
                    type="button"
                    className="font-bold text-xs h-7 px-2.5 rounded-lg text-slate-800 hover:bg-slate-100 cursor-pointer flex items-center gap-1 transition"
                    onClick={() => setShowMonthSelector(!showMonthSelector)}
                  >
                    <span>{months[currentMonth.getMonth()]}</span>
                    <ChevronDown className="size-3 text-slate-400" />
                  </button>
                  <SelectorDropdown
                    show={showMonthSelector}
                    items={months}
                    onSelect={handleMonthChange}
                    current={currentMonth.getMonth()}
                  />
                </div>

                {/* Year Picker */}
                <div className="relative">
                  <button
                    type="button"
                    className="font-bold text-xs h-7 px-2.5 rounded-lg text-slate-800 hover:bg-slate-100 cursor-pointer flex items-center gap-1 transition"
                    onClick={() => setShowYearSelector(!showYearSelector)}
                  >
                    <span>{currentMonth.getFullYear()}</span>
                    <ChevronDown className="size-3 text-slate-400" />
                  </button>
                  <SelectorDropdown
                    show={showYearSelector}
                    items={years}
                    onSelect={handleYearChange}
                    current={currentMonth.getFullYear()}
                  />
                </div>
              </div>

              <button
                type="button"
                className="size-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer flex items-center justify-center transition"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Day of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] font-bold text-slate-400 py-0.5 select-none"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
              {getDaysInMonth(currentMonth).map((date, index) => {
                const isCurrentMonth =
                  date.getMonth() === currentMonth.getMonth();
                const isSelected = isDateSelected(date);
                const isStart = isRangeStart(date);
                const isEnd = isRangeEnd(date);
                const inRange = isDateInRange(date);
                const disabledDate = isDateDisabled(date);
                const todayDate = isToday(date);

                return (
                  <div
                    key={index}
                    className={cn(
                      "relative h-7 flex items-center justify-center",
                      inRange &&
                        "bg-blue-50 first:rounded-l-lg last:rounded-r-lg",
                      isStart && "rounded-l-lg bg-blue-50",
                      isEnd && "rounded-r-lg bg-blue-50",
                    )}
                  >
                    <button
                      type="button"
                      disabled={disabledDate}
                      onClick={() => handleDateClick(date)}
                      className={cn(
                        "size-7 text-xs font-normal cursor-pointer relative transition-all rounded-lg flex items-center justify-center select-none",
                        !isCurrentMonth && "text-slate-300",
                        isCurrentMonth && "text-slate-700",
                        inRange &&
                          !isSelected &&
                          "text-blue-700 font-medium",
                        todayDate &&
                          !isSelected &&
                          "ring-1 ring-blue-400 font-bold text-blue-600",
                        isSelected &&
                          "bg-blue-600 text-white font-bold shadow-xs hover:bg-blue-700 hover:text-white z-10",
                        !isSelected && !disabledDate && "hover:bg-slate-100",
                        disabledDate &&
                          "opacity-25 cursor-not-allowed pointer-events-none",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time Pickers (Optional) */}
        {showTime && (
          <div className="flex items-center gap-4 px-4 py-3 border-t border-slate-100 bg-slate-50">
            <div className="flex flex-col gap-1 flex-1">
              <Label
                htmlFor="start-time"
                className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5"
              >
                <Clock className="size-3 text-slate-400" />
                Start Time ({formatTo12Hr(startTime)})
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setError(null);
                }}
                className="h-8 text-xs bg-white border-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <Label
                htmlFor="end-time"
                className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5"
              >
                <Clock className="size-3 text-slate-400" />
                End Time ({formatTo12Hr(endTime)})
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setError(null);
                }}
                className="h-8 text-xs bg-white border-slate-200"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 text-xs text-rose-600 bg-rose-50 border-t border-rose-100 font-medium">
            {error}
          </div>
        )}

        {/* Footer Summary & Actions */}
        <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500 truncate max-w-[170px]">
            {rangeDaysCount > 0 ? (
              <span className="font-semibold text-slate-800">
                {rangeDaysCount} {rangeDaysCount === 1 ? "day" : "days"}{" "}
                selected
              </span>
            ) : (
              <span>No date selected</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs h-7 px-2.5 font-medium rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition"
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              type="button"
              className="text-xs h-7 px-3 font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer transition shadow-xs"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-xs h-7 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer px-4 font-semibold rounded-lg shadow-xs transition"
              onClick={handleApply}
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangeFilter;
