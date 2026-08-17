/**
 * Tiny inline SVG chart — no external chart lib. Draws a smooth line
 * on top of soft bars; scales to the container width.
 */
export function MiniChart({
  data,
  height = 80,
  formatY = (n: number) => String(n),
  color = "var(--color-primary)",
}: {
  data: { day: string; value: number }[];
  height?: number;
  formatY?: (n: number) => string;
  color?: string;
}) {
  const w = 100;
  const h = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data
    .map((d, i) => `${i * step},${h - (d.value / max) * (h - 8) - 4}`)
    .join(" ");
  const bars = data.map((d, i) => {
    const barH = (d.value / max) * (h - 10);
    return (
      <rect
        key={i}
        x={i * step - (step * 0.35)}
        y={h - barH - 2}
        width={step * 0.7}
        height={barH}
        rx={1}
        fill="var(--color-primary)"
        opacity={0.12}
      />
    );
  });
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full block" style={{ height }}>
        {bars}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex items-center justify-between text-[10px] text-[var(--color-foreground-muted)] mt-1">
        <span>{data[0]?.day.slice(5)}</span>
        <span className="font-semibold text-[var(--color-foreground)]">
          Max {formatY(max)}
        </span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}
