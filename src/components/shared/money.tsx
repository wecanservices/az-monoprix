import { formatDZD } from "@/utils/money";

/** Render an amount in DZD. Use everywhere prices are displayed. */
export function Money({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  return <span className={className}>{formatDZD(value)}</span>;
}
