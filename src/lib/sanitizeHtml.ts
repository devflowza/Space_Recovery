const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
];

const ALLOWED_ATTRIBUTES = ['style', 'class'];

const ALLOWED_STYLES = [
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'text-decoration',
];

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function sanitizeNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode(false);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      if (!ALLOWED_TAGS.includes(tagName)) {
        const fragment = document.createDocumentFragment();
        Array.from(element.childNodes).forEach((child) => {
          const sanitizedChild = sanitizeNode(child);
          if (sanitizedChild) {
            fragment.appendChild(sanitizedChild);
          }
        });
        return fragment;
      }

      const newElement = document.createElement(tagName);

      ALLOWED_ATTRIBUTES.forEach((attr) => {
        if (element.hasAttribute(attr)) {
          const value = element.getAttribute(attr);
          if (attr === 'style' && value) {
            const sanitizedStyle = sanitizeStyles(value);
            if (sanitizedStyle) {
              newElement.setAttribute('style', sanitizedStyle);
            }
          } else if (value) {
            newElement.setAttribute(attr, value);
          }
        }
      });

      Array.from(element.childNodes).forEach((child) => {
        const sanitizedChild = sanitizeNode(child);
        if (sanitizedChild) {
          newElement.appendChild(sanitizedChild);
        }
      });

      return newElement;
    }

    return null;
  }

  function sanitizeStyles(styleString: string): string {
    const styles = styleString.split(';').filter((s) => s.trim());
    const sanitizedStyles: string[] = [];

    styles.forEach((style) => {
      const [property, value] = style.split(':').map((s) => s.trim());
      if (property && value && ALLOWED_STYLES.includes(property.toLowerCase())) {
        sanitizedStyles.push(`${property}: ${value}`);
      }
    });

    return sanitizedStyles.join('; ');
  }

  const body = doc.body;
  const sanitizedBody = document.createElement('div');

  Array.from(body.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(child);
    if (sanitizedChild) {
      sanitizedBody.appendChild(sanitizedChild);
    }
  });

  return sanitizedBody.innerHTML;
}

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
