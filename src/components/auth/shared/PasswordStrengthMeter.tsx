import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { PASSWORD_RULES, getPasswordStrength } from './passwordPolicy';

interface PasswordStrengthMeterProps {
  password: string;
  /** Dark variant for the auth canvas; default is the light in-app styling. */
  dark?: boolean;
}

const LEVEL_BAR: Record<string, string> = {
  weak: 'bg-danger',
  medium: 'bg-warning',
  strong: 'bg-success',
};

const LEVEL_TEXT_LIGHT: Record<string, string> = {
  weak: 'text-danger',
  medium: 'text-warning',
  strong: 'text-success',
};

const LEVEL_TEXT_DARK: Record<string, string> = {
  weak: 'text-red-300',
  medium: 'text-amber-300',
  strong: 'text-emerald-300',
};

export const PasswordStrengthMeter = ({ password, dark = false }: PasswordStrengthMeterProps) => {
  const { t } = useTranslation();
  const strength = getPasswordStrength(password);

  return (
    <div>
      {password && strength.level && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              {t('auth.passwordStrength.label')}
            </span>
            <span className={`text-xs font-medium ${(dark ? LEVEL_TEXT_DARK : LEVEL_TEXT_LIGHT)[strength.level]}`}>
              {t(`auth.passwordStrength.${strength.level}`)}
            </span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${dark ? 'bg-white/10' : 'bg-slate-200'}`}>
            <div
              className={`h-full ${LEVEL_BAR[strength.level]} transition-all duration-300`}
              style={{ width: strength.width }}
            />
          </div>
        </div>
      )}
      <ul className={`mt-2 space-y-1 text-xs ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.key} className="flex items-center gap-2">
              <CheckCircle
                className={`w-3 h-3 ${
                  met
                    ? dark ? 'text-emerald-400' : 'text-success'
                    : dark ? 'text-slate-600' : 'text-slate-300'
                }`}
              />
              {t(`auth.passwordRules.${rule.key}`)}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
