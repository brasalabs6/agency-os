import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, translate, type MessageKey } from "./messages";

export async function getLocale() {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getI18n() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
