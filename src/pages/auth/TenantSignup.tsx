import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, Check, User, Mail, Shield, ChevronRight, ChevronLeft,
  HardDrive, Eye, EyeOff, RefreshCw, ArrowRight, Phone, Globe,
  Lock, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { tenantService } from '../../lib/tenantService';
import { useToast } from '../../hooks/useToast';
import type { Database } from '../../types/database.types';
import { logger } from '../../lib/logger';

type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];

type WizardStep = 'plan' | 'company' | 'admin' | 'verify';
const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: 'plan', label: 'Select Plan', icon: HardDrive },
  { key: 'company', label: 'Lab Details', icon: Building2 },
  { key: 'admin', label: 'Admin Account', icon: User },
  { key: 'verify', label: 'Verify Email', icon: Mail },
];

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
];

export const TenantSignup = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<WizardStep>('plan');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    slug: '',
    phone: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  });

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stepError, setStepError] = useState('');

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await tenantService.listPlans();
        setPlans(data);
        if (data.length > 0) {
          setSelectedPlanId(data[1]?.id || data[0].id);
        }
      } catch {
        showToast('Failed to load subscription plans', 'error');
        logger.error(error);
      }
    };
    loadPlans();
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleCompanyNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      companyName: value,
      slug: value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const passwordStrength = PASSWORD_RULES.filter(r => r.test(formData.adminPassword)).length;
  const passwordsMatch = formData.adminPassword === formData.confirmPassword && formData.confirmPassword.length > 0;
  const allPasswordRulesPass = passwordStrength === PASSWORD_RULES.length;

  const canProceedFromPlan = !!selectedPlanId;
  const canProceedFromCompany = formData.companyName.trim().length >= 2 && formData.slug.trim().length >= 2;
  const canProceedFromAdmin =
    formData.adminFullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail) &&
    allPasswordRulesPass &&
    passwordsMatch;

  const goNext = () => {
    setStepError('');
    const idx = currentStepIndex;
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].key);
    }
  };

  const goBack = () => {
    setStepError('');
    const idx = currentStepIndex;
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].key);
    }
  };

  const sendOtp = async () => {
    setOtpError('');
    setOtpSending(true);
    try {
      await tenantService.sendOtp(formData.adminEmail, formData.companyName);
      setOtpSent(true);
      startCooldown();
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otpDigits];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtpDigits(newOtp);
      const nextIdx = Math.min(index + digits.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value;
    setOtpDigits(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const verifyAndCreateAccount = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setOtpError('');
    setOtpVerifying(true);

    try {
      const verified = await tenantService.verifyOtp(formData.adminEmail, code);
      if (!verified) {
        setOtpError('Invalid verification code');
        setOtpVerifying(false);
        return;
      }

      setLoading(true);
      await tenantService.createTenant({
        name: formData.companyName,
        slug: formData.slug,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminFullName: formData.adminFullName,
        planId: selectedPlanId,
      });

      showToast('Your lab is ready! Please sign in to get started.', 'success');
      navigate('/login');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to create account', 'error');
      logger.error(error);
    } finally {
      setOtpVerifying(false);
      setLoading(false);
    }
  };

  // Auto-send OTP when entering the verify step
  useEffect(() => {
    if (currentStep === 'verify' && !otpSent && !otpSending) {
      sendOtp();
    }
  }, [currentStep]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="flex min-h-screen">
        {/* Left Panel - Decorative */}
        <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex-col justify-between p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
            <div className="absolute bottom-32 right-0 w-96 h-96 bg-teal-400 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold tracking-tight">xSuite</span>
            </div>
            <p className="text-slate-400 text-sm">Data Recovery Management Platform</p>
          </div>

          <div className="relative z-10 space-y-8">
            <h2 className="text-2xl font-semibold leading-snug">
              Launch your data recovery lab with confidence
            </h2>
            <div className="space-y-5">
              {[
                { title: 'Case Management', desc: 'Track every recovery from intake to delivery' },
                { title: 'Client Portal', desc: 'Clients check status in real time' },
                { title: 'Financial Suite', desc: 'Quotes, invoices, and payments — all in one' },
                { title: 'Inventory & Parts', desc: 'Donor drives, parts, and stock at a glance' },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <div className="mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-slate-400 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-slate-500 text-xs">Trusted by data recovery labs worldwide</p>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col">
          {/* Mobile header */}
          <div className="lg:hidden px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">xSuite</span>
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="px-6 lg:px-12 xl:px-20 pt-8 pb-4">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isActive
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium hidden sm:block ${
                          isActive ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="flex-1 mx-3 mt-[-20px] sm:mt-0">
                        <div
                          className={`h-0.5 rounded transition-all duration-300 ${
                            idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 px-6 lg:px-12 xl:px-20 py-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              {stepError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  {stepError}
                </div>
              )}

              {/* STEP 1: Plan Selection */}
              {currentStep === 'plan' && (
                <div>
                  <div className="mb-8">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                      Start Your Data Recovery Lab
                    </h1>
                    <p className="text-slate-500">
                      Choose the plan that fits your lab's needs. Start with a 14-day free trial.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {plans.map(plan => {
                      const limits = (plan.limits as Record<string, number>) || {};
                      const isSelected = selectedPlanId === plan.id;
                      const isPopular = plan.slug === 'professional';

                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-100'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          {isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <span className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                Most Popular
                              </span>
                            </div>
                          )}

                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-slate-900">{plan.name}</h3>
                            {isSelected && (
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="mb-3">
                            <span className="text-3xl font-bold text-slate-900">${plan.price_monthly}</span>
                            <span className="text-slate-500 text-sm">/mo</span>
                          </div>

                          <p className="text-slate-500 text-xs mb-4 min-h-[32px]">{plan.description}</p>

                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              {limits.max_users === -1 ? 'Unlimited' : limits.max_users} team members
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              {limits.max_cases === -1 ? 'Unlimited' : limits.max_cases} cases/month
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              {limits.max_storage_gb === -1 ? 'Unlimited' : `${limits.max_storage_gb}GB`} storage
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between">
                    <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700">
                      Already have an account? Sign in
                    </Link>
                    <button
                      onClick={goNext}
                      disabled={!canProceedFromPlan}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Company/Lab Details */}
              {currentStep === 'company' && (
                <div>
                  <div className="mb-8">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                      Tell Us About Your Lab
                    </h1>
                    <p className="text-slate-500">
                      This information helps us set up your workspace. You can update it later.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Lab / Company Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={e => handleCompanyNameChange(e.target.value)}
                          placeholder="e.g. Phoenix Data Recovery"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Workspace URL <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-0 rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden">
                        <span className="bg-slate-50 text-slate-500 text-sm px-3 py-2.5 border-r border-slate-300 flex-shrink-0 select-none flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          xsuite.com/
                        </span>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="your-lab"
                          className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                          pattern="[a-z0-9-]+"
                        />
                      </div>
                      {formData.slug && (
                        <p className="mt-1 text-xs text-slate-400">
                          Your workspace: <span className="font-medium text-slate-600">{formData.slug}.xsuite.com</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={e => updateField('phone', e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    {selectedPlan && (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5">Selected Plan</p>
                            <p className="font-semibold text-slate-900">{selectedPlan.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">${selectedPlan.price_monthly}/mo</p>
                            <p className="text-xs text-emerald-600 font-medium">14-day free trial</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-8">
                    <button
                      onClick={goBack}
                      className="inline-flex items-center gap-1.5 text-slate-600 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={goNext}
                      disabled={!canProceedFromCompany}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Admin Account */}
              {currentStep === 'admin' && (
                <div>
                  <div className="mb-8">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                      Create Your Admin Account
                    </h1>
                    <p className="text-slate-500">
                      This will be the owner account for <strong className="text-slate-700">{formData.companyName}</strong>.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={formData.adminFullName}
                          onChange={e => updateField('adminFullName', e.target.value)}
                          placeholder="John Doe"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={formData.adminEmail}
                          onChange={e => updateField('adminEmail', e.target.value)}
                          placeholder="john@your-lab.com"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        We'll send a verification code to this email
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.adminPassword}
                          onChange={e => updateField('adminPassword', e.target.value)}
                          placeholder="Create a strong password"
                          className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {formData.adminPassword && (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  i <= passwordStrength
                                    ? passwordStrength <= 2
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-500'
                                    : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {PASSWORD_RULES.map(rule => (
                              <div
                                key={rule.key}
                                className={`flex items-center gap-1.5 text-xs ${
                                  rule.test(formData.adminPassword) ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              >
                                {rule.test(formData.adminPassword) ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                {rule.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={e => updateField('confirmPassword', e.target.value)}
                          placeholder="Re-enter your password"
                          className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                            formData.confirmPassword
                              ? passwordsMatch
                                ? 'border-emerald-300'
                                : 'border-red-300'
                              : 'border-slate-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formData.confirmPassword && !passwordsMatch && (
                        <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-8">
                    <button
                      onClick={goBack}
                      className="inline-flex items-center gap-1.5 text-slate-600 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={goNext}
                      disabled={!canProceedFromAdmin}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Email Verification (OTP) */}
              {currentStep === 'verify' && (
                <div>
                  <div className="mb-8 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                      Verify Your Email
                    </h1>
                    <p className="text-slate-500">
                      We sent a 6-digit verification code to
                    </p>
                    <p className="font-semibold text-slate-700 mt-1">{formData.adminEmail}</p>
                  </div>

                  {otpError && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      {otpError}
                    </div>
                  )}

                  {otpSending && !otpSent ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">Sending verification code...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center gap-3 mb-8">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={el => { otpInputRefs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={digit}
                            onChange={e => handleOtpChange(idx, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(idx, e)}
                            onFocus={e => e.target.select()}
                            className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            autoFocus={idx === 0}
                          />
                        ))}
                      </div>

                      <div className="text-center mb-8">
                        <button
                          onClick={verifyAndCreateAccount}
                          disabled={otpVerifying || loading || otpDigits.join('').length !== 6}
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
                        >
                          {otpVerifying || loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {loading ? 'Setting up your lab...' : 'Verifying...'}
                            </>
                          ) : (
                            <>
                              Verify & Create Lab
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-center space-y-3">
                        <div className="text-sm text-slate-500">
                          Didn't receive the code?{' '}
                          {resendCooldown > 0 ? (
                            <span className="text-slate-400">
                              Resend in {resendCooldown}s
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setOtpDigits(['', '', '', '', '', '']);
                                setOtpError('');
                                sendOtp();
                              }}
                              disabled={otpSending}
                              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${otpSending ? 'animate-spin' : ''}`} />
                              Resend Code
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setOtpSent(false);
                            setOtpDigits(['', '', '', '', '', '']);
                            setOtpError('');
                            goBack();
                          }}
                          className="text-sm text-slate-400 hover:text-slate-600"
                        >
                          Change email address
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 lg:px-12 xl:px-20 py-4 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400">
              By creating an account you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
