import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthBackground as AnimatedBackground } from '../../components/auth/shared/AuthBackground';
import { ProgressIndicator } from './onboarding/components/ProgressIndicator';
import { StepContainer } from './onboarding/components/StepContainer';
import { WelcomeStep } from './onboarding/steps/WelcomeStep';
import { LocationStep } from './onboarding/steps/LocationStep';
import { AccountStep } from './onboarding/steps/AccountStep';
import { ConfigurationStep } from './onboarding/steps/ConfigurationStep';
import { useOnboardingFlow } from './onboarding/hooks/useOnboardingFlow';
import { STEPS } from './onboarding/constants';

export const OnboardingWizard = () => {
  const flow = useOnboardingFlow();
  const prevStepRef = useRef(0);

  const direction = flow.step >= prevStepRef.current ? 1 : -1;
  prevStepRef.current = flow.step;

  const currentStepMeta = STEPS[flow.step];

  return (
    <div className="min-h-screen flex flex-col font-body">
      <AnimatedBackground />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <span className="font-display text-xl text-white tracking-tight">
          xSuite
        </span>
        <Link
          to="/login"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors font-body"
        >
          Already have an account? <span className="text-blue-400">Log in</span>
        </Link>
      </header>

      <div className="relative z-10 px-4 py-4">
        <ProgressIndicator currentStep={flow.step} />
      </div>

      <StepContainer
        step={currentStepMeta}
        stepIndex={flow.step}
        direction={direction}
      >
        {flow.step === 0 && (
          <WelcomeStep
            formData={flow.formData}
            errors={flow.errors}
            slugAvailable={flow.slugAvailable}
            slugChecking={flow.slugChecking}
            updateField={flow.updateField}
            checkSlugAvailability={flow.checkSlugAvailability}
            onNext={flow.nextStep}
          />
        )}
        {flow.step === 1 && (
          <LocationStep
            formData={flow.formData}
            errors={flow.errors}
            countries={flow.countries}
            updateField={flow.updateField}
            onNext={flow.nextStep}
            onBack={flow.prevStep}
          />
        )}
        {flow.step === 2 && (
          <AccountStep
            formData={flow.formData}
            errors={flow.errors}
            updateField={flow.updateField}
            onNext={flow.nextStep}
            onBack={flow.prevStep}
          />
        )}
        {flow.step === 3 && (
          <ConfigurationStep
            formData={flow.formData}
            errors={flow.errors}
            plans={flow.plans}
            plansLoading={flow.plansLoading}
            submitting={flow.submitting}
            updateField={flow.updateField}
            onBack={flow.prevStep}
            onSubmit={flow.submit}
          />
        )}
      </StepContainer>
    </div>
  );
};
