import { ShieldAlert } from "lucide-react";

/** Rendered at the very bottom of every page via <Layout/>. */
export function Disclaimer() {
  return (
    <div role="note" aria-label="Financial disclaimer" className="border-t border-warn/40 bg-[#14100a]">
      <div className="mx-auto flex max-w-[1280px] items-start gap-3 px-4 py-5 sm:items-center sm:px-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warn/15 text-warn"><ShieldAlert className="size-5" /></span>
        <p className="text-[12.5px] leading-relaxed text-[#e0d3b0] sm:text-sm">
          <strong className="font-semibold text-warn">Not financial advice.</strong>{" "}
          All AI forecasts, indicators and outlooks on this site are for informational purposes only and do not constitute financial, investment or trading advice. Crypto assets are highly volatile and you can lose all of your capital. Do your own research and never invest more than you can afford to lose.
        </p>
      </div>
    </div>
  );
}
