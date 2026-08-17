import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Horizontal snap scroller — for carousels of product cards / chips. */
export function HScroll({
  children,
  className,
  itemClassName,
}: {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2 no-scrollbar",
        className,
      )}
    >
      {/* Fake padding on the right so the last card doesn't hug the edge */}
      {Array.isArray(children)
        ? children.map((c, i) => (
            <div key={i} className={cn("snap-start shrink-0", itemClassName)}>
              {c}
            </div>
          ))
        : (
          <div className={cn("snap-start shrink-0", itemClassName)}>{children}</div>
        )}
    </div>
  );
}
