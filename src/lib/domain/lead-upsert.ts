import type { CreateLeadInput, Lead, UpdateLeadInput } from "@/lib/domain/types";

const trim = (value: string) => value.trim();

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  return digits;
}

function normalizeEmail(value: string) {
  return trim(value).toLowerCase();
}

function normalizeUrl(value: string) {
  const raw = trim(value);
  if (!raw) return "";
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path === "/" ? "" : path}${parsed.search}`;
  } catch {
    return raw.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
  }
}

function normalizeText(value: string) {
  return trim(value).replace(/\s+/g, " ");
}

function sameString(field: string, left: string | null | undefined, right: string | null | undefined) {
  const a = left ?? "";
  const b = right ?? "";
  if (field === "phone" || field === "whatsapp") return normalizePhone(a) === normalizePhone(b);
  if (field === "email") return normalizeEmail(a) === normalizeEmail(b);
  if (field === "website" || field === "googleMapsUrl" || field === "instagramUrl" || field === "sourceUrl") {
    return normalizeUrl(a) === normalizeUrl(b);
  }
  return normalizeText(a) === normalizeText(b);
}

function sameStringArray(left: string[] | null | undefined, right: string[] | null | undefined, asSet = false) {
  const normalize = (items: string[] | null | undefined) => (items ?? []).map(normalizeText);
  const a = normalize(left);
  const b = normalize(right);
  if (asSet) {
    const aa = [...new Set(a)].sort();
    const bb = [...new Set(b)].sort();
    return aa.length === bb.length && aa.every((value, index) => value === bb[index]);
  }
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function hasStrongLeadIdentityMatch(input: CreateLeadInput, lead: Lead) {
  return Boolean(
    (input.website && lead.website && sameString("website", input.website, lead.website)) ||
    (input.phone && lead.phone && sameString("phone", input.phone, lead.phone)) ||
    (input.email && lead.email && sameString("email", input.email, lead.email)),
  );
}

export function buildLeadEnrichmentPatch(input: CreateLeadInput, current: Lead): UpdateLeadInput | null {
  const patch: UpdateLeadInput = {};

  const stringFields = [
    "segment",
    "city",
    "state",
    "website",
    "googleMapsUrl",
    "instagramUrl",
    "phone",
    "whatsapp",
    "email",
    "opportunityNotes",
    "sourceType",
    "sourceUrl",
  ] as const;

  for (const field of stringFields) {
    const incoming = input[field];
    if (incoming == null) continue;
    if (!sameString(field, incoming, current[field])) Object.assign(patch, { [field]: incoming });
  }

  if (input.score != null && input.score !== current.score) patch.score = input.score;
  if (input.primaryOpportunity != null && input.primaryOpportunity !== current.primaryOpportunity) {
    patch.primaryOpportunity = input.primaryOpportunity;
  }

  if (input.scoreReasons?.length && !sameStringArray(input.scoreReasons, current.scoreReasons)) {
    patch.scoreReasons = input.scoreReasons;
  }

  if (input.tags?.length) {
    const mergedTags = Array.from(new Set([...(current.tags ?? []), ...input.tags]));
    if (!sameStringArray(mergedTags, current.tags, true)) patch.tags = mergedTags;
  }

  if (!Object.keys(patch).length) return null;
  patch.expectedVersion = current.version;
  return patch;
}
