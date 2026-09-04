import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./TimePicker.css";

const ITEM_HEIGHT = 42;
const DEFAULT_VALUE = "00:00";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(
    String(value || "")
  );

  if (!match) {
    return {
      hour: 0,
      minute: 0,
    };
  }

  return {
    hour: clamp(Number(match[1]) || 0, 0, 23),
    minute: clamp(Number(match[2]) || 0, 0, 59),
  };
}

function to12Hour(hour24) {
  return {
    hour: hour24 % 12 || 12,
    period: hour24 < 12 ? "AM" : "PM",
  };
}

function to24Hour(hour12, period) {
  const normalized =
    clamp(Number(hour12) || 12, 1, 12) % 12;

  return period === "PM"
    ? normalized + 12
    : normalized;
}

function buildRange(start, end) {
  return Array.from(
    { length: end - start + 1 },
    (_, index) => start + index
  );
}

function WheelColumn({
  label,
  values,
  value,
  formatter = String,
  onChange,
  ariaLabel,
}) {
  const listRef = useRef(null);
  const scrollingRef = useRef(false);
  const timeoutRef = useRef(null);

  const selectedIndex = Math.max(
    0,
    values.indexOf(value)
  );

  const scrollToIndex = (
    index,
    behavior = "smooth"
  ) => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    list.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior,
    });
  };

  useEffect(() => {
    if (scrollingRef.current) {
      return;
    }

    scrollToIndex(
      selectedIndex,
      "auto"
    );
  }, [selectedIndex]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(
          timeoutRef.current
        );
      }
    },
    []
  );

  const commitScroll = () => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    const index = clamp(
      Math.round(
        list.scrollTop / ITEM_HEIGHT
      ),
      0,
      values.length - 1
    );

    scrollToIndex(index);

    const nextValue = values[index];

    if (nextValue !== value) {
      onChange(nextValue);
    }

    scrollingRef.current = false;
  };

  const handleScroll = () => {
    scrollingRef.current = true;

    if (timeoutRef.current) {
      window.clearTimeout(
        timeoutRef.current
      );
    }

    timeoutRef.current =
      window.setTimeout(
        commitScroll,
        90
      );
  };

  const handleKeyDown = (event) => {
    const current =
      values.indexOf(value);

    if (event.key === "ArrowUp") {
      event.preventDefault();

      const next = Math.max(
        0,
        current - 1
      );

      onChange(values[next]);
      scrollToIndex(next);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      const next = Math.min(
        values.length - 1,
        current + 1
      );

      onChange(values[next]);
      scrollToIndex(next);
    }
  };

  return (
    <div className="time-picker-wheel-column">
      {label && (
        <span className="time-picker-wheel-label">
          {label}
        </span>
      )}

      <div className="time-picker-wheel-window">
        <div
          className="time-picker-selection-band"
          aria-hidden="true"
        />

        <div
          ref={listRef}
          className="time-picker-wheel-list"
          role="listbox"
          tabIndex={0}
          aria-label={ariaLabel}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
        >
          <div
            className="time-picker-wheel-spacer"
            aria-hidden="true"
          />

          {values.map((item) => {
            const active =
              item === value;

            return (
              <button
                type="button"
                key={item}
                role="option"
                aria-selected={active}
                className={`time-picker-wheel-item ${
                  active
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  onChange(item);
                  scrollToIndex(
                    values.indexOf(item)
                  );
                }}
              >
                {formatter(item)}
              </button>
            );
          })}

          <div
            className="time-picker-wheel-spacer"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

export default function TimePicker({
  value = DEFAULT_VALUE,
  onChange,
  defaultFormat = "24",
  format: controlledFormat,
  onFormatChange,
  allowFormatChange = true,
  minuteStep = 1,
  disabled = false,
  label = "Hora",
  helperText = "",
  className = "",
}) {
  const [
    internalFormat,
    setInternalFormat,
  ] = useState(
    defaultFormat === "12"
      ? "12"
      : "24"
  );

  const format =
    controlledFormat === "12" ||
    controlledFormat === "24"
      ? controlledFormat
      : internalFormat;

  const parsed = useMemo(
    () => parseTime(value),
    [value]
  );

  const safeStep = clamp(
    Math.round(
      Number(minuteStep) || 1
    ),
    1,
    30
  );

  const minutes = useMemo(
    () =>
      buildRange(0, 59).filter(
        (minute) =>
          minute % safeStep === 0
      ),
    [safeStep]
  );

  const nearestMinute = useMemo(
    () =>
      minutes.reduce(
        (best, minute) =>
          Math.abs(
            minute - parsed.minute
          ) <
          Math.abs(
            best - parsed.minute
          )
            ? minute
            : best,
        minutes[0] ?? 0
      ),
    [minutes, parsed.minute]
  );

  const twelve =
    to12Hour(parsed.hour);

  const emit = (
    hour24,
    minute = nearestMinute
  ) => {
    if (disabled) {
      return;
    }

    const next =
      `${pad2(
        clamp(hour24, 0, 23)
      )}:${pad2(
        clamp(minute, 0, 59)
      )}`;

    onChange?.(next);
  };

  const changeFormat = (next) => {
    if (
      disabled ||
      !allowFormatChange ||
      next === format
    ) {
      return;
    }

    if (
      controlledFormat === undefined
    ) {
      setInternalFormat(next);
    }

    onFormatChange?.(next);
  };

  return (
    <div
      className={`time-picker ${
        disabled
          ? "disabled"
          : ""
      } ${className}`}
    >
      <div className="time-picker-header">
        <div>
          <span className="time-picker-label">
            {label}
          </span>

          <strong className="time-picker-value">
            {format === "24"
              ? `${pad2(
                  parsed.hour
                )}:${pad2(
                  nearestMinute
                )}`
              : `${pad2(
                  twelve.hour
                )}:${pad2(
                  nearestMinute
                )} ${twelve.period}`}
          </strong>
        </div>

        {allowFormatChange && (
          <div
            className="time-picker-format-toggle"
            aria-label="Formato de hora"
          >
            <button
              type="button"
              className={
                format === "24"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeFormat("24")
              }
              disabled={disabled}
            >
              24 h
            </button>

            <button
              type="button"
              className={
                format === "12"
                  ? "active"
                  : ""
              }
              onClick={() =>
                changeFormat("12")
              }
              disabled={disabled}
            >
              AM / PM
            </button>
          </div>
        )}
      </div>

      <div
        className={`time-picker-wheels format-${format}`}
      >
        {format === "24" ? (
          <>
            <WheelColumn
              label="Hora"
              values={buildRange(0, 23)}
              value={parsed.hour}
              formatter={pad2}
              ariaLabel="Hora en formato 24 horas"
              onChange={(hour) =>
                emit(hour)
              }
            />

            <span
              className="time-picker-separator"
              aria-hidden="true"
            >
              :
            </span>

            <WheelColumn
              label="Minutos"
              values={minutes}
              value={nearestMinute}
              formatter={pad2}
              ariaLabel="Minutos"
              onChange={(minute) =>
                emit(
                  parsed.hour,
                  minute
                )
              }
            />
          </>
        ) : (
          <>
            <WheelColumn
              label="Hora"
              values={buildRange(1, 12)}
              value={twelve.hour}
              formatter={pad2}
              ariaLabel="Hora en formato AM PM"
              onChange={(hour) =>
                emit(
                  to24Hour(
                    hour,
                    twelve.period
                  )
                )
              }
            />

            <span
              className="time-picker-separator"
              aria-hidden="true"
            >
              :
            </span>

            <WheelColumn
              label="Minutos"
              values={minutes}
              value={nearestMinute}
              formatter={pad2}
              ariaLabel="Minutos"
              onChange={(minute) =>
                emit(
                  parsed.hour,
                  minute
                )
              }
            />

            <WheelColumn
              label="Periodo"
              values={[
                "AM",
                "PM",
              ]}
              value={twelve.period}
              ariaLabel="AM o PM"
              onChange={(period) =>
                emit(
                  to24Hour(
                    twelve.hour,
                    period
                  )
                )
              }
            />
          </>
        )}
      </div>

      {helperText && (
        <p className="time-picker-helper">
          {helperText}
        </p>
      )}
    </div>
  );
}

export {
  parseTime,
  to12Hour,
  to24Hour,
};
