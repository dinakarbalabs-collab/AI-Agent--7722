import { Link } from "wouter";
import { Lock } from "lucide-react";
import { useSession } from "../queries/user";
import { Skeleton } from "./bits";

export function SignInGate({ title, children }: { title: string; children: React.ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-10 sm:px-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand/15 text-brand-soft"><Lock className="size-5" /></span>
        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to save coins and set price alerts. Your lists are private to your account.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/sign-in" className="btn-glow rounded-xl px-6 py-2.5 text-sm font-semibold">Sign in</Link>
          <Link to="/sign-up" className="rounded-xl border border-white/12 px-6 py-2.5 text-sm font-medium hover:border-white/30">Create account</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
