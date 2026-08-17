import Image from "next/image";

/**
 * AZ Monoprix — official logo.
 *
 * Three usages :
 *  - `sm` compact : mark only (pin + basket), for tight bars
 *  - `md` default : mark + inline wordmark "AZ Monoprix"
 *  - `lg` large   : the full horizontal logo with tagline
 */
export function Logo({
  size = "md",
  wordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  wordmark?: boolean;
}) {
  if (size === "lg") {
    return (
      <Image
        src="/brand/logo-horizontal.svg"
        alt="AZ Monoprix — Qualité · Choix · Prix Justes"
        width={240}
        height={64}
        priority
        className="block"
      />
    );
  }

  const dims = size === "sm" ? { mark: 28, text: "text-[14px]" } : { mark: 40, text: "text-[16px]" };

  return (
    <div className="inline-flex items-center gap-2">
      <Image
        src="/brand/logo-mark.svg"
        alt="AZ Monoprix"
        width={dims.mark}
        height={Math.round(dims.mark * 1.28)}
        priority
        className="drop-shadow-[0_2px_4px_rgba(220,26,40,0.25)]"
      />
      {wordmark && (
        <span className={`${dims.text} font-black tracking-tight leading-none`}>
          <span className="text-[var(--color-az-green-700)]">A</span>
          <span className="text-[var(--color-az-red-500)]">Z</span>
          <span className="font-semibold text-[var(--color-foreground)] ml-1">
            Monoprix
          </span>
        </span>
      )}
    </div>
  );
}
