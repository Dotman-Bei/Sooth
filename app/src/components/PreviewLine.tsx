import { config, PREVIEW } from "@/lib/config";
import s from "./PreviewLine.module.css";

/** Shown on every page while the app runs on samples (prd.md §0.5). */
export function PreviewLine({ tone = "page" }: { tone?: "page" | "app" }) {
  if (!PREVIEW) return null;
  return (
    <p className={`${s.line} ${tone === "app" ? s.app : ""}`}>
      {config.sooth
        ? "Preview. Sooth is deployed on Chikyū, but wallet sign-in or the live price is not connected, so prices, balances and transactions here are samples. Verify shows the real contracts."
        : "Preview. Sooth is not deployed on Chikyū yet, so prices, balances and transactions here are samples."}
    </p>
  );
}
