import { AppShell } from "@/components/AppShell";
import "./app.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
