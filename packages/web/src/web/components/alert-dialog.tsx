import { useEffect, useRef, useState } from "react";
import { BellPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useCurrency, useMoney, formatAmount } from "../lib/currency";
import { useCreateAlert, useSession } from "../queries/user";

export function SetAlertButton({ coinId, name, price, className }: { coinId: string; name: string; price: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const [, nav] = useLocation();
  return (
    <>
      <button
        className={className ?? "btn-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"}
        onClick={() => { if (!user) { toast("Sign in to set price alerts"); nav("/sign-in"); } else setOpen(true); }}
      >
        <BellPlus className="size-4" /> Set price alert
      </button>
      {open && <AlertModal coinId={coinId} name={name} price={price} onClose={() => setOpen(false)} />}
    </>
  );
}

function AlertModal({ coinId, name, price, onClose }: { coinId: string; name: string; price: number; onClose: () => void }) {
  const { currency, convert, rate } = useCurrency();
  const money = useMoney();
  const create = useCreateAlert();
  const [dir, setDir] = useState<"above" | "below">("above");
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const num = Number(val.replace(/,/g, ""));
  const valid = Number.isFinite(num) && num > 0;
  const other = currency === "USD" ? formatAmount(num * rate, "INR") : formatAmount(num / rate, "USD");
  const cur = convert(price);
  const quick = dir === "above" ? [5, 10, 20] : [-5, -10, -20];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!valid) return setErr("Enter a valid price.");
    try {
      await create.mutateAsync({ coinId, direction: dir, amount: num, currency });
      toast.success(`Alert set: ${name} ${dir} ${formatAmount(num, currency)}`);
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Couldn't create alert");
    }
  };

  return (
    <div role="presentation" className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="glass w-full max-w-md rounded-2xl bg-[#0b0b14]/95 p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold">Price alert · {name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Current price <span className="num text-foreground">{money(price)}</span></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground" aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.04] p-1 text-sm font-medium">
          {(["above", "below"] as const).map((d) => (
            <button type="button" key={d} onClick={() => { setDir(d); setVal(""); }} className={`rounded-lg py-2 transition ${dir === d ? (d === "above" ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss") : "text-muted-foreground"}`}>
              Goes {d}
            </button>
          ))}
        </div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Target price ({currency})</label>
        <div className="mt-1.5 flex items-center rounded-xl border border-white/12 bg-black/40 px-3 focus-within:border-brand">
          <span className="num text-muted-foreground">{currency === "INR" ? "₹" : "$"}</span>
          <input ref={inputRef} aria-label={`Target price in ${currency}`} inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder={cur.toLocaleString(currency === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: cur < 1 ? 6 : 2 })} className="num w-full bg-transparent px-2 py-3 outline-none placeholder:text-dim" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button type="button" key={q} onClick={() => setVal(String(Number((cur * (1 + q / 100)).toPrecision(6))))} className="num rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-brand/60 hover:text-foreground">
              {q > 0 ? "+" : ""}{q}%
            </button>
          ))}
        </div>
        {valid && <p className="num mt-3 text-xs text-muted-foreground">≈ {other} {currency === "USD" ? "(INR)" : "(USD)"} · stored in USD so it won't drift with the exchange rate</p>}
        {err && <p className="mt-3 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">{err}</p>}
        <button disabled={create.isPending} className="btn-glow mt-5 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60">
          {create.isPending ? "Saving…" : "Create alert"}
        </button>
        <p className="mt-3 text-center text-[11px] text-dim">Alerts trigger in-app while Oracle is open.</p>
      </form>
    </div>
  );
}
