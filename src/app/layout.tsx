import type { Metadata } from "next";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = { title: { default: "AgencyOS Leads", template: "%s · AgencyOS" }, description: "Internal agent-first lead operating system" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return <html lang={locale} suppressHydrationWarning><body><I18nProvider locale={locale}>{children}</I18nProvider></body></html>;
}
