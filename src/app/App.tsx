import { QueryClientProvider } from "@tanstack/react-query";

import { AppRouter } from "./router";
import { AuthProvider } from "../features/auth/auth";
import { ToastProvider } from "../components/ToastProvider";
import { queryClient } from "../lib/queryClient";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
