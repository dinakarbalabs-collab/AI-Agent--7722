import { Navbar } from "./navbar";
import { Disclaimer } from "./disclaimer";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="mx-auto max-w-[1280px] px-4 pb-6 pt-10 text-xs text-dim sm:px-6">
        Market data by CoinGecko · Sentiment by alternative.me Fear &amp; Greed Index · Forecasts are model-generated estimates, not predictions of fact.
      </footer>
      <Disclaimer />
    </div>
  );
}
