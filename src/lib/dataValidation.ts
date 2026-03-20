const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const sanitizeUuidFields = (data: Record<string, unknown>, uuidFields: string[]): Record<string, unknown> => {
  const sanitized = { ...data };

  uuidFields.forEach(field => {
    const value = sanitized[field];
    if (value === '' || value === undefined) {
      sanitized[field] = null;
    } else if (typeof value === 'string' && value !== null && !UUID_REGEX.test(value)) {
      sanitized[field] = null;
    }
  });

  return sanitized;
};
