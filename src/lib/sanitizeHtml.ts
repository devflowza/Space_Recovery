const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

// Per-tag non-style attributes; `style` is allowed on every tag (sanitized).
const TAG_ATTRS: Record<string, string[]> = {
  a: ['href', 'target'],
  img: ['src', 'alt', 'width', 'height'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
};

const ALLOWED_STYLES = ['color', 'background-color', 'font-weight', 'font-style', 'text-decoration'];

// Raw-text / RCDATA elements: the HTML parser treats their contents as raw text,
// not child elements. Unwrapping them would surface the raw text (which may
// contain "<img onerror=…>" strings) into the output as entity-encoded markup,
// potentially leaking attack strings. Drop these entirely instead of unwrapping.
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'noscript', 'xmp', 'plaintext', 'title']);

// href: http(s) + mailto only. src: http(s) + RASTER data images only (no SVG — it can carry script).
const SAFE_HREF = /^(https?:|mailto:)/i;
const SAFE_IMG_SRC = /^(https?:\/\/|data:image\/(png|jpeg|jpg|gif|webp)(;[\w=-]+)*;base64,)/i;
const NUMERIC = /^\d{1,4}$/;
const BLOCKED_VALUE_PATTERNS = /url\s*\(|expression\s*\(|javascript:|@import|import\s*\(/i;

// The PROPERTY allowlist (ALLOWED_STYLES) is the real security guarantee: none of
// the allowed properties fetch a URL or execute script, so a malicious value is
// inert even if it slips through. The value checks below are defense-in-depth:
// split on the FIRST colon only (so a colon-bearing value isn't truncated, which
// would weaken the filter), reject CSS escapes (e.g. `\75` reconstructs `u`),
// then reject the known dangerous tokens.
function sanitizeStyles(styleString: string): string {
  const out: string[] = [];
  for (const decl of styleString.split(';')) {
    if (!decl.trim()) continue;
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const property = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (
      property && value &&
      ALLOWED_STYLES.includes(property) &&
      !value.includes('\\') &&
      !BLOCKED_VALUE_PATTERNS.test(value)
    ) {
      out.push(`${property}: ${value}`);
    }
  }
  return out.join('; ');
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function sanitizeNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(false);
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Raw-text elements (script, style, textarea, …): drop entirely.
    // Their text children are raw markup strings, not safe DOM content.
    if (RAW_TEXT_ELEMENTS.has(tagName)) return null;

    // Unknown tag: unwrap — keep sanitized children, drop the tag itself.
    if (!ALLOWED_TAGS.includes(tagName)) {
      const fragment = document.createDocumentFragment();
      element.childNodes.forEach((child) => {
        const c = sanitizeNode(child);
        if (c) fragment.appendChild(c);
      });
      return fragment;
    }

    // Images with an unsafe src are dropped entirely (no children to keep).
    if (tagName === 'img') {
      const src = element.getAttribute('src') ?? '';
      if (!SAFE_IMG_SRC.test(src)) return null;
    }

    const newElement = document.createElement(tagName);
    const allowed = TAG_ATTRS[tagName] ?? [];

    // style (any tag)
    if (element.hasAttribute('style')) {
      const safe = sanitizeStyles(element.getAttribute('style') ?? '');
      if (safe) newElement.setAttribute('style', safe);
    }

    for (const attr of allowed) {
      if (!element.hasAttribute(attr)) continue;
      const value = element.getAttribute(attr) ?? '';
      if (attr === 'href') {
        if (SAFE_HREF.test(value)) newElement.setAttribute('href', value);
      } else if (attr === 'src') {
        if (SAFE_IMG_SRC.test(value)) newElement.setAttribute('src', value);
      } else if (attr === 'target') {
        if (value === '_blank') newElement.setAttribute('target', '_blank');
      } else if (attr === 'width' || attr === 'height' || attr === 'colspan' || attr === 'rowspan') {
        if (NUMERIC.test(value)) newElement.setAttribute(attr, value);
      } else if (value) {
        newElement.setAttribute(attr, value);
      }
    }

    // Force safe rel on any anchor that kept an href.
    if (tagName === 'a' && newElement.hasAttribute('href')) {
      newElement.setAttribute('rel', 'noopener noreferrer');
    }

    element.childNodes.forEach((child) => {
      const c = sanitizeNode(child);
      if (c) newElement.appendChild(c);
    });

    return newElement;
  }

  const sanitizedBody = document.createElement('div');
  doc.body.childNodes.forEach((child) => {
    const c = sanitizeNode(child);
    if (c) sanitizedBody.appendChild(c);
  });
  return sanitizedBody.innerHTML;
}

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
