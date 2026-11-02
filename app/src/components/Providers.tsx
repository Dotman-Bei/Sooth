"use client";

import dynamic from "next/dynamic";
import { LIVE } from "@/lib/config";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "./Toast";

// The SDK bundle is only fetched in live mode.
const DogeOSProvider = dynamic(() => import("./DogeOSProvider").then((m) => m.DogeOSProvider), {
  ssr: false,
  loading: () => null,
});

export function Providers({ children }: { children: React.ReactNode }) {
  // The DogeOS SDK wraps its children in <div class="light" data-theme>, which paints them white with
  // navy text. .app-root re-applies the page palette and layout inside that wrapper.
  const app = <div className="app-root">{children}</div>;
  return <ToastProvider>{LIVE ? <DogeOSProvider>{app}</DogeOSProvider> : <StoreProvider>{app}</StoreProvider>}</ToastProvider>;
}
