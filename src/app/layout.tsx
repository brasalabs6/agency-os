import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: { default: "AgencyOS Leads", template: "%s · AgencyOS" }, description: "Internal agent-first lead operating system" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><body>{children}</body></html>;
}
