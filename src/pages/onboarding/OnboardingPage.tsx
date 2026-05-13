import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWizard } from '../../components/onboarding/OnboardingWizard';
import { onboardingService } from '../../lib/onboardingService';
import { tenantService } from '../../lib/tenantService';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../lib/logger';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const tenant = await tenantService.getCurrentTenant();

        if (!tenant) {
          navigate('/login');
          return;
        }

        setTenantId(tenant.id);

        const isComplete = await onboardingService.isOnboardingComplete(tenant.id);
        if (isComplete) {
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        logger.error('Error checking onboarding status:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkOnboardingStatus();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleComplete = () => {
    navigate('/dashboard');
  };

  if (loading || !tenantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return <OnboardingWizard tenantId={tenantId} onComplete={handleComplete} />;
};
