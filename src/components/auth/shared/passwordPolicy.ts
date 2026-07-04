// Single source of truth for the account password policy. Extracted from
// PasswordChangeModal so the self-service reset page enforces the identical
// rules. The returned messages are shown verbatim in error banners.

export interface PasswordRule {
  key: 'minLength' | 'uppercase' | 'lowercase' | 'number';
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'minLength', test: (pw) => pw.length >= 6 },
  { key: 'uppercase', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lowercase', test: (pw) => /[a-z]/.test(pw) },
  { key: 'number', test: (pw) => /[0-9]/.test(pw) },
];

export const validatePassword = (password: string): string | null => {
  if (password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
};

export type PasswordStrengthLevel = 'weak' | 'medium' | 'strong';

export interface PasswordStrength {
  level: PasswordStrengthLevel | null;
  width: string;
}

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (password.length === 0) {
    return { level: null, width: '0%' };
  }

  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (strength <= 2) return { level: 'weak', width: '33%' };
  if (strength <= 4) return { level: 'medium', width: '66%' };
  return { level: 'strong', width: '100%' };
};
