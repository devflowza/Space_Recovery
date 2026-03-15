export const sanitizeUuidFields = (data: any, uuidFields: string[]): any => {
  const sanitized = { ...data };

  uuidFields.forEach(field => {
    if (field in sanitized && (sanitized[field] === '' || sanitized[field] === undefined)) {
      sanitized[field] = null;
    }
  });

  return sanitized;
};
