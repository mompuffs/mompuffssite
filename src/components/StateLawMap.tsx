import { US_STATES } from "@/lib/directory";
import { lawLevel, lawPath } from "@/lib/stateLaws";
import STATE_PATHS from "@/lib/usStatePaths.json";

// US map colored by legality level; every state links to its law page.
// Plain server-rendered SVG links (no JS). Shapes are the Census-based
// us-atlas outlines, pre-projected (Albers USA, 975x610) and simplified.

// Too small to click or label in place: labeled boxes off the East Coast.
const CALLOUTS = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"];
const CALLOUT_X = 936; // clear of Cape Cod
const CALLOUT_Y0 = 168; // below Maine
const CALLOUT_STEP = 27;

const codeFor = (name: string) => US_STATES.find((s) => s.name === name)?.code;

export default function StateLawMap() {
  const states = STATE_PATHS.map((s) => ({ ...s, code: codeFor(s.name) })).filter(
    (s): s is typeof s & { code: string } => Boolean(s.code)
  );
  const byCode = new Map(states.map((s) => [s.code, s]));

  return (
    <svg viewBox="0 0 975 610" className="w-full h-auto" role="group" aria-label="Map of US cannabis laws by state">
      {states.map((s) => {
        const level = lawLevel(s.code);
        return (
          <a key={s.code} href={lawPath(s.code)} aria-label={`${s.name}: ${level.label}`}>
            <title>{`${s.name}: ${level.label}`}</title>
            <path
              d={s.d}
              fill={level.color}
              stroke="#ffffff"
              strokeWidth={1}
              className="cursor-pointer transition-opacity hover:opacity-70 focus:opacity-70"
            />
          </a>
        );
      })}

      {/* In-place abbreviations for states big enough to hold one. */}
      {states
        .filter((s) => !CALLOUTS.includes(s.code))
        .map((s) => (
          <text
            key={`t-${s.code}`}
            x={s.cx}
            y={s.cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight={700}
            fill={lawLevel(s.code).text}
            pointerEvents="none"
          >
            {s.code}
          </text>
        ))}

      {CALLOUTS.map((code, i) => {
        const s = byCode.get(code);
        if (!s) return null;
        const level = lawLevel(code);
        const y = CALLOUT_Y0 + i * CALLOUT_STEP;
        return (
          <a key={`c-${code}`} href={lawPath(code)} aria-label={`${s.name}: ${level.label}`}>
            <title>{`${s.name}: ${level.label}`}</title>
            <line x1={s.cx} y1={s.cy} x2={CALLOUT_X} y2={y + 10} stroke="#9a8aa3" strokeWidth={0.75} />
            <rect
              x={CALLOUT_X}
              y={y}
              width={36}
              height={20}
              rx={4}
              fill={level.color}
              stroke="#ffffff"
              className="cursor-pointer transition-opacity hover:opacity-70"
            />
            <text
              x={CALLOUT_X + 18}
              y={y + 10}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fontWeight={700}
              fill={level.text}
              pointerEvents="none"
            >
              {code}
            </text>
          </a>
        );
      })}
    </svg>
  );
}
