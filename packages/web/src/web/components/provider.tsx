import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { CurrencyProvider } from "../lib/currency";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

interface ProviderProps {
  children: React.ReactNode;
}

// App-level providers — add theme/context providers here, wrapping children.
// QueryClientProvider must stay (all API calls run through TanStack Query).
export function Provider({ children }: ProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        {children}
        <Toaster theme="dark" position="top-right" offset={{ top: 76, right: 16 }} mobileOffset={{ top: 76, right: 12, left: 12 }} toastOptions={{ style: { background: "#0e0e19", border: "1px solid rgba(255,255,255,.1)", color: "#f2f2f8" } }} />
      </CurrencyProvider>
    </QueryClientProvider>
  );
}
