"use client";
import { useExamAppearance } from "./ExamAppearanceProvider";

function Ornament({ className }: { className?: string }) {
  return (
    <svg
      className={className || "h-auto w-full"}
      viewBox="0 0 48 64"
      fill="none"
      aria-hidden="true"
    >
      <path d="M24 0v13m-5 0h10v6H19z" stroke="currentColor" strokeWidth="2" />
      <circle
        cx="24"
        cy="39"
        r="19"
        fill="currentColor"
        fillOpacity=".16"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5 39h38m-19-19c-12 10-12 28 0 38m0-38c12 10 12 28 0 38"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
function Gift({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M28 83h124v81H28zM20 62h140v25H20zM79 62h22v102"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M88 61C26 10 52-4 71 21c10 14 14 28 17 40Zm5 0c60-54 40-67 18-43-10 12-17 32-18 43Z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="m78 62-28 44 25-9 6 19 15-48"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
export function HolidayBackdrop() {
  const { decorations, colors } = useExamAppearance();
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      data-holiday-decor="background"
      style={{ color: colors.accent }}
    >
      {decorations.backgroundBranches && (
        <>
          <Gift className="absolute -bottom-8 -left-10 h-64 w-64 -rotate-12 opacity-20" />
          <svg
            className="absolute -right-24 -top-16 h-96 w-96 opacity-15"
            style={{ color: colors.accent }}
            viewBox="0 0 300 300"
            fill="none"
          >
            <path
              d="M240-20C-15 55 335 195 35 320M267-20C5 54 362 212 64 330"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              d="M132 140C-18 5 85-25 116 55c18 44 17 60 16 85Zm9 0C281-4 304 77 230 112c-38 18-64 22-89 28Z"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
        </>
      )}
      {decorations.leaves &&
        [8, 24, 45, 66, 84, 95].map((left, i) => (
          <span
            key={left}
            className="holiday-ornament absolute w-7 opacity-35"
            style={{
              left: `${left}%`,
              top: `${[12, 73, 4, 87, 17, 65][i]}%`,
              color: i % 2 ? colors.accent : colors.primary,
              animationDelay: `${i * -1.3}s`,
            }}
          >
            <Ornament />
          </span>
        ))}
    </div>
  );
}
export function HolidayHeader() {
  const { decorations, colors } = useExamAppearance();
  if (!decorations.headerBranches) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      data-holiday-decor="header"
      style={{ color: colors.accent }}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-35"
        viewBox="0 0 900 300"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M-30 274C205 183 422 340 930 64M-30 287C205 196 422 353 930 77"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <Ornament className="holiday-ornament absolute -top-3 left-[44%] h-20 w-12 opacity-35" />
      <Ornament className="holiday-ornament absolute -top-4 right-8 h-32 w-20 opacity-40" />
    </div>
  );
}
