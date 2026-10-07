import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, messages, normalizeLocale, translate } from "@/lib/i18n/messages";

describe("i18n", () => {
  it("keeps Portuguese and English dictionaries aligned", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages["pt-BR"]).sort());
  });

  it("defaults unknown locale values to pt-BR", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("pt-BR")).toBe("pt-BR");
    expect(normalizeLocale("es")).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it("interpolates variables in both languages", () => {
    expect(translate("pt-BR", "leads.found", { count: 3 })).toBe("3 leads encontrados");
    expect(translate("en", "leads.found", { count: 3 })).toBe("3 leads found");
  });
});
