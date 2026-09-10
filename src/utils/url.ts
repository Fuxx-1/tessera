const safeAbsoluteProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);
const safeImageAbsoluteProtocols = new Set(["http:", "https:", "blob:"]);

export function isSafeHref(href: string) {
  const trimmedHref = href.trim();
  if (!trimmedHref) {
    return false;
  }

  const normalizedHref = normalizeUrlLikeValue(trimmedHref);
  if (
    normalizedHref.startsWith("javascript:") ||
    normalizedHref.startsWith("vbscript:") ||
    normalizedHref.startsWith("data:")
  ) {
    return false;
  }

  if (
    trimmedHref.startsWith("#") ||
    trimmedHref.startsWith("/") ||
    trimmedHref.startsWith("./") ||
    trimmedHref.startsWith("../")
  ) {
    return true;
  }

  try {
    return safeAbsoluteProtocols.has(new URL(trimmedHref).protocol);
  } catch {
    return !/^[a-z][a-z0-9+.-]*:/i.test(trimmedHref);
  }
}

export function getSafeHref(href: string | undefined) {
  return href && isSafeHref(href) ? href : undefined;
}

export function isSafeImageSrc(src: string | undefined) {
  if (!src) {
    return false;
  }

  const trimmedSrc = src.trim();
  if (!trimmedSrc) {
    return false;
  }

  const normalizedSrc = normalizeUrlLikeValue(trimmedSrc);
  if (
    normalizedSrc.startsWith("javascript:") ||
    normalizedSrc.startsWith("vbscript:") ||
    normalizedSrc.startsWith("data:") ||
    normalizedSrc.startsWith("file:")
  ) {
    return false;
  }

  if (
    trimmedSrc.startsWith("/") ||
    trimmedSrc.startsWith("./") ||
    trimmedSrc.startsWith("../")
  ) {
    return true;
  }

  try {
    return safeImageAbsoluteProtocols.has(new URL(trimmedSrc).protocol);
  } catch {
    return !/^[a-z][a-z0-9+.-]*:/i.test(trimmedSrc);
  }
}

export function getSafeImageSrc(src: string | undefined) {
  return src && isSafeImageSrc(src) ? src.trim() : undefined;
}

export function getSafeLinkRel(rel: string | undefined, target: string | undefined) {
  if (target?.toLowerCase() !== "_blank") {
    return rel;
  }

  const tokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
  tokens.add("noopener");
  tokens.add("noreferrer");
  return Array.from(tokens).join(" ");
}

export function normalizeUrlLikeValue(value: string) {
  return value.trim().toLowerCase().replace(/[\u0000-\u001F\u007F\s]+/g, "");
}
