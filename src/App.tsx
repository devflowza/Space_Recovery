import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { TenantConfigProvider } from './contexts/TenantConfigContext';
import { PortalAuthProvider } from './contexts/PortalAuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ProtectedPortalRoute } from './components/ProtectedPortalRoute';
import { ProtectedPlatformAdminRoute } from './components/ProtectedPlatformAdminRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PortalLayout } from './components/layout/PortalLayout';
import { PlatformAdminLayout } from './components/layout/PlatformAdminLayout';

function lazyWithRetry(factory: () => Promise<{ default: React.ComponentType<unknown> }>) {
  return lazy(() =>
    factory().catch((error) => {
      const key = 'chunk_reload_retry';
      const lastRetry = sessionStorage.getItem(key);
      const now = Date.now();
      if (!lastRetry || now - Number(lastRetry) > 10000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
      }
      throw error;
    })
  );
}

const Login = lazyWithRetry(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const OnboardingWizard = lazyWithRetry(() => import('./pages/auth/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const OnboardingPage = lazyWithRetry(() => import('./pages/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const Dashboard = lazyWithRetry(() => import('./pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const SettingsDashboard = lazyWithRetry(() => import('./pages/settings/SettingsDashboard').then(m => ({ default: m.SettingsDashboard })));
const CategoryDetail = lazyWithRetry(() => import('./pages/settings/CategoryDetail').then(m => ({ default: m.CategoryDetail })));
const SystemNumbers = lazyWithRetry(() => import('./pages/settings/SystemNumbers').then(m => ({ default: m.SystemNumbers })));
const GeneralSettings = lazyWithRetry(() => import('./pages/settings/GeneralSettings').then(m => ({ default: m.GeneralSettings })));
const ClientsList = lazyWithRetry(() => import('./pages/clients/ClientsList').then(m => ({ default: m.ClientsList })));
const CustomersListPage = lazyWithRetry(() => import('./pages/customers/CustomersListPage').then(m => ({ default: m.CustomersListPage })));
const CustomerProfilePage = lazyWithRetry(() => import('./pages/customers/CustomerProfilePage').then(m => ({ default: m.CustomerProfilePage })));
const CompaniesListPage = lazyWithRetry(() => import('./pages/companies/CompaniesListPage').then(m => ({ default: m.CompaniesListPage })));
const CompanyProfilePage = lazyWithRetry(() => import('./pages/companies/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
const CasesList = lazyWithRetry(() => import('./pages/cases/CasesList').then(m => ({ default: m.CasesList })));
const CaseDetail = lazyWithRetry(() => import('./pages/cases/CaseDetail').then(m => ({ default: m.CaseDetail })));
const HRDashboard = lazyWithRetry(() => import('./pages/hr/HRDashboard').then(m => ({ default: m.HRDashboard })));
const EmployeesList = lazyWithRetry(() => import('./pages/hr/EmployeesList').then(m => ({ default: m.EmployeesList })));
const EmployeeProfilePage = lazyWithRetry(() => import('./pages/hr/EmployeeProfilePage').then(m => ({ default: m.EmployeeProfilePage })));
const RecruitmentPage = lazyWithRetry(() => import('./pages/hr/RecruitmentPage').then(m => ({ default: m.RecruitmentPage })));
const EmployeeOnboardingPage = lazyWithRetry(() => import('./pages/hr/EmployeeOnboardingPage').then(m => ({ default: m.EmployeeOnboardingPage })));
const PerformanceReviewsPage = lazyWithRetry(() => import('./pages/hr/PerformanceReviewsPage').then(m => ({ default: m.PerformanceReviewsPage })));
const PayrollDashboard = lazyWithRetry(() => import('./pages/payroll/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));
const PayrollHistoryPage = lazyWithRetry(() => import('./pages/payroll/PayrollHistoryPage'));
const ProcessPayrollPage = lazyWithRetry(() => import('./pages/payroll/ProcessPayrollPage'));
const SalaryComponentsPage = lazyWithRetry(() => import('./pages/payroll/SalaryComponentsPage'));
const PayrollPeriodDetailPage = lazyWithRetry(() => import('./pages/payroll/PayrollPeriodDetailPage'));
const PayrollAdjustmentsPage = lazyWithRetry(() => import('./pages/payroll/PayrollAdjustmentsPage'));
const EmployeeLoansPage = lazyWithRetry(() => import('./pages/payroll/EmployeeLoansPage').then(m => ({ default: m.EmployeeLoansPage })));
const PayrollSettingsPage = lazyWithRetry(() => import('./pages/payroll/PayrollSettingsPage').then(m => ({ default: m.PayrollSettingsPage })));
const AttendanceDashboard = lazyWithRetry(() => import('./pages/employee-management/AttendanceDashboard').then(m => ({ default: m.AttendanceDashboard })));
const LeaveManagement = lazyWithRetry(() => import('./pages/employee-management/LeaveManagement').then(m => ({ default: m.LeaveManagement })));
const TimesheetManagement = lazyWithRetry(() => import('./pages/employee-management/TimesheetManagement').then(m => ({ default: m.TimesheetManagement })));
const TemplatesDashboard = lazyWithRetry(() => import('./pages/templates/TemplatesDashboard').then(m => ({ default: m.TemplatesDashboard })));
const TemplateTypeDetail = lazyWithRetry(() => import('./pages/templates/TemplateTypeDetail').then(m => ({ default: m.TemplateTypeDetail })));
const AccountingLocales = lazyWithRetry(() => import('./pages/settings/AccountingLocales').then(m => ({ default: m.AccountingLocales })));
const ClientPortalSettings = lazyWithRetry(() => import('./pages/settings/ClientPortalSettings').then(m => ({ default: m.ClientPortalSettings })));
const ImportExport = lazyWithRetry(() => import('./pages/settings/ImportExport').then(m => ({ default: m.ImportExport })));
const ReportSectionsPage = lazyWithRetry(() => import('./pages/settings/ReportSectionsPage').then(m => ({ default: m.ReportSectionsPage })));
const BillingPage = lazyWithRetry(() => import('./pages/settings/BillingPage'));
const PlansPage = lazyWithRetry(() => import('./pages/settings/PlansPage'));
const SecuritySettingsPage = lazyWithRetry(() => import('./pages/settings/SecuritySettingsPage').then(m => ({ default: m.SecuritySettingsPage })));
const GDPRCompliancePage = lazyWithRetry(() => import('./pages/settings/GDPRCompliancePage').then(m => ({ default: m.GDPRCompliancePage })));

const PortalLogin = lazyWithRetry(() => import('./pages/portal/PortalLogin').then(m => ({ default: m.PortalLogin })));
const PortalDashboard = lazyWithRetry(() => import('./pages/portal/PortalDashboard').then(m => ({ default: m.PortalDashboard })));
const PortalCases = lazyWithRetry(() => import('./pages/portal/PortalCases').then(m => ({ default: m.PortalCases })));
const PortalQuotes = lazyWithRetry(() => import('./pages/portal/PortalQuotes').then(m => ({ default: m.PortalQuotes })));
const PortalReports = lazyWithRetry(() => import('./pages/portal/PortalReports'));
const PortalCommunications = lazyWithRetry(() => import('./pages/portal/PortalCommunications').then(m => ({ default: m.PortalCommunications })));
const PortalSettings = lazyWithRetry(() => import('./pages/portal/PortalSettings').then(m => ({ default: m.PortalSettings })));
const PortalPurchasesPage = lazyWithRetry(() => import('./pages/portal/PortalPurchasesPage').then(m => ({ default: m.PortalPurchasesPage })));

const KBCenterPage = lazyWithRetry(() => import('./pages/kb/KBCenterPage').then(m => ({ default: m.KBCenterPage })));
const KBArticleDetailPage = lazyWithRetry(() => import('./pages/kb/KBArticleDetailPage').then(m => ({ default: m.KBArticleDetailPage })));

const PrintReceiptPage = lazyWithRetry(() => import('./pages/print/PrintReceiptPage').then(m => ({ default: m.PrintReceiptPage })));
const PrintLabelPage = lazyWithRetry(() => import('./pages/print/PrintLabelPage').then(m => ({ default: m.PrintLabelPage })));
const PrintCustomerCopyPage = lazyWithRetry(() => import('./pages/print/PrintCustomerCopyPage').then(m => ({ default: m.PrintCustomerCopyPage })));
const PrintCheckoutPage = lazyWithRetry(() => import('./pages/print/PrintCheckoutPage').then(m => ({ default: m.PrintCheckoutPage })));
const PrintPaymentReceiptPage = lazyWithRetry(() => import('./pages/print/PrintPaymentReceiptPage').then(m => ({ default: m.PrintPaymentReceiptPage })));

const UserManagement = lazyWithRetry(() => import('./pages/users/UserManagement').then(m => ({ default: m.UserManagement })));
const UserProfile = lazyWithRetry(() => import('./pages/users/UserProfile').then(m => ({ default: m.UserProfile })));
const AdminPanel = lazyWithRetry(() => import('./pages/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const SystemLogs = lazyWithRetry(() => import('./pages/admin/SystemLogs').then(m => ({ default: m.SystemLogs })));
const AuditTrails = lazyWithRetry(() => import('./pages/admin/AuditTrails').then(m => ({ default: m.AuditTrails })));
const DatabaseManagement = lazyWithRetry(() => import('./pages/admin/DatabaseManagement').then(m => ({ default: m.DatabaseManagement })));
const RolePermissions = lazyWithRetry(() => import('./pages/admin/RolePermissions').then(m => ({ default: m.RolePermissions })));
const TenantManagement = lazyWithRetry(() => import('./pages/admin/TenantManagement').then(m => ({ default: m.TenantManagement })));
const CloneDrivesList = lazyWithRetry(() => import('./pages/resources/CloneDrivesList').then(m => ({ default: m.CloneDrivesList })));
const StockListPage = lazyWithRetry(() => import('./pages/stock/StockListPage'));
const StockItemDetail = lazyWithRetry(() => import('./pages/stock/StockItemDetail'));
const StockCategoriesPage = lazyWithRetry(() => import('./pages/stock/StockCategoriesPage'));
const StockSalesPage = lazyWithRetry(() => import('./pages/stock/StockSalesPage'));
const StockSaleDetailPage = lazyWithRetry(() => import('./pages/stock/StockSaleDetailPage'));
const StockAdjustmentsPage = lazyWithRetry(() => import('./pages/stock/StockAdjustmentsPage'));
const StockReportsPage = lazyWithRetry(() => import('./pages/stock/StockReportsPage'));
const StockReturnsPage = lazyWithRetry(() => import('./pages/stock/StockReturnsPage'));
const StockLocationsPage = lazyWithRetry(() => import('./pages/stock/StockLocationsPage'));
const StockTransfersPage = lazyWithRetry(() => import('./pages/stock/StockTransfersPage'));
const StockTransferDetail = lazyWithRetry(() => import('./pages/stock/StockTransferDetail'));
const InventoryListPage = lazyWithRetry(() => import('./pages/inventory/InventoryListPage'));
const InventoryFormPage = lazyWithRetry(() => import('./pages/inventory/InventoryFormPage'));
const DonorSearchPage = lazyWithRetry(() => import('./pages/inventory/DonorSearchPage'));

const InvoicesListPage = lazyWithRetry(() => import('./pages/financial/InvoicesListPage'));
const InvoiceDetailPage = lazyWithRetry(() => import('./pages/financial/InvoiceDetailPage'));
const PaymentsList = lazyWithRetry(() => import('./pages/financial/PaymentsList').then(m => ({ default: m.PaymentsList })));
const ExpensesList = lazyWithRetry(() => import('./pages/financial/ExpensesList').then(m => ({ default: m.ExpensesList })));
const RevenueDashboard = lazyWithRetry(() => import('./pages/financial/RevenueDashboard').then(m => ({ default: m.RevenueDashboard })));
const TransactionsList = lazyWithRetry(() => import('./pages/financial/TransactionsList').then(m => ({ default: m.TransactionsList })));
const BankingPage = lazyWithRetry(() => import('./pages/financial/BankingPage').then(m => ({ default: m.BankingPage })));
const VATAuditPage = lazyWithRetry(() => import('./pages/financial/VATAuditPage').then(m => ({ default: m.VATAuditPage })));
const ReportsDashboard = lazyWithRetry(() => import('./pages/financial/ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));

const QuotesListPage = lazyWithRetry(() => import('./pages/quotes/QuotesListPage'));
const QuoteDetailPage = lazyWithRetry(() => import('./pages/quotes/QuoteDetailPage'));
const QuotesRecycleBin = lazyWithRetry(() => import('./pages/quotes/QuotesRecycleBin'));

const SuppliersListPage = lazyWithRetry(() => import('./pages/suppliers/SuppliersListPage'));
const SupplierProfilePage = lazyWithRetry(() => import('./pages/suppliers/SupplierProfilePage'));
const PurchaseOrdersListPage = lazyWithRetry(() => import('./pages/suppliers/PurchaseOrdersListPage'));
const PurchaseOrderDetailPage = lazyWithRetry(() => import('./pages/suppliers/PurchaseOrderDetailPage'));

const PlatformDashboard = lazyWithRetry(() => import('./pages/platform-admin/PlatformDashboard').then(m => ({ default: m.PlatformDashboard })));
const TenantsListPage = lazyWithRetry(() => import('./pages/platform-admin/TenantsListPage').then(m => ({ default: m.TenantsListPage })));
const TenantDetailPage = lazyWithRetry(() => import('./pages/platform-admin/TenantDetailPage').then(m => ({ default: m.TenantDetailPage })));
const SupportTicketsPage = lazyWithRetry(() => import('./pages/platform-admin/SupportTicketsPage').then(m => ({ default: m.SupportTicketsPage })));
const TicketDetailPage = lazyWithRetry(() => import('./pages/platform-admin/TicketDetailPage').then(m => ({ default: m.TicketDetailPage })));
const AnnouncementsPage = lazyWithRetry(() => import('./pages/platform-admin/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })));
const TenantIsolationTestPage = lazyWithRetry(() => import('./pages/platform-admin/TenantIsolationTestPage').then(m => ({ default: m.TenantIsolationTestPage })));
const RateLimitDashboardPage = lazyWithRetry(() => import('./pages/platform-admin/RateLimitDashboardPage').then(m => ({ default: m.RateLimitDashboardPage })));
const PlatformSettingsPage = lazyWithRetry(() => import('./pages/platform-admin/PlatformSettingsPage').then(m => ({ default: m.PlatformSettingsPage })));
const PlansManagementPage = lazyWithRetry(() => import('./pages/platform-admin/PlansManagementPage').then(m => ({ default: m.PlansManagementPage })));
const PlanDetailPage = lazyWithRetry(() => import('./pages/platform-admin/PlanDetailPage').then(m => ({ default: m.PlanDetailPage })));
const CouponsManagementPage = lazyWithRetry(() => import('./pages/platform-admin/CouponsManagementPage').then(m => ({ default: m.CouponsManagementPage })));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-600 mt-4">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: '',
          style: {
            background: 'transparent',
            padding: 0,
            boxShadow: 'none',
          },
        }}
        containerStyle={{
          top: '20px',
          right: '20px',
        }}
      />
      <AuthProvider>
        <TenantConfigProvider>
        <PermissionsProvider>
          <PortalAuthProvider>
            <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup/tenant" element={<OnboardingWizard />} />
              <Route path="/signup" element={<Navigate to="/signup/tenant" replace />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

              <Route path="/health" element={
                <div style={{ padding: '20px', fontFamily: 'monospace' }}>
                  <h1>OK</h1>
                  <p>Status: healthy</p>
                  <p>Timestamp: {new Date().toISOString()}</p>
                </div>
              } />

              <Route path="/portal/login" element={<PortalLogin />} />

              <Route path="/print/receipt/:caseId" element={<ProtectedRoute><PrintReceiptPage /></ProtectedRoute>} />
              <Route path="/print/label/:caseId" element={<ProtectedRoute><PrintLabelPage /></ProtectedRoute>} />
              <Route path="/print/customer-copy/:caseId" element={<ProtectedRoute><PrintCustomerCopyPage /></ProtectedRoute>} />
              <Route path="/print/checkout/:caseId" element={<ProtectedRoute><PrintCheckoutPage /></ProtectedRoute>} />
              <Route path="/print/payment-receipt/:paymentId" element={<ProtectedRoute><PrintPaymentReceiptPage /></ProtectedRoute>} />

              <Route
                path="/portal"
                element={
                  <ProtectedPortalRoute>
                    <ErrorBoundary>
                      <PortalLayout />
                    </ErrorBoundary>
                  </ProtectedPortalRoute>
                }
              >
                <Route path="dashboard" element={<PortalDashboard />} />
                <Route path="cases" element={<PortalCases />} />
                <Route path="quotes" element={<PortalQuotes />} />
                <Route path="reports" element={<PortalReports />} />
                <Route path="purchases" element={<PortalPurchasesPage />} />
                <Route path="communications" element={<PortalCommunications />} />
                <Route path="settings" element={<PortalSettings />} />
                <Route index element={<Navigate to="/portal/dashboard" replace />} />
              </Route>

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
            <Route index element={<Dashboard />} />
            <Route path="cases" element={<CasesList />} />
            <Route path="cases/:id" element={<CaseDetail />} />
            <Route path="clients" element={<ClientsList />} />
            <Route path="customers" element={<CustomersListPage />} />
            <Route path="customers/:id" element={<CustomerProfilePage />} />
            <Route path="companies" element={<CompaniesListPage />} />
            <Route path="companies/:id" element={<CompanyProfilePage />} />
            <Route
              path="suppliers"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <SuppliersListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="suppliers/:id"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <SupplierProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="purchase-orders"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <PurchaseOrdersListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="purchase-orders/:id"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <PurchaseOrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="quotes" element={<QuotesListPage />} />
            <Route path="quotes/recycle-bin" element={<QuotesRecycleBin />} />
            <Route path="quotes/:id" element={<QuoteDetailPage />} />
            {/* Assets route removed - not yet implemented */}
            <Route path="stock" element={<StockListPage />} />
            <Route path="stock/categories" element={<StockCategoriesPage />} />
            <Route path="stock/sales" element={<StockSalesPage />} />
            <Route path="stock/sales/:id" element={<StockSaleDetailPage />} />
            <Route path="stock/adjustments" element={<StockAdjustmentsPage />} />
            <Route path="stock/reports" element={<StockReportsPage />} />
            <Route path="stock/returns" element={<StockReturnsPage />} />
            <Route path="stock/locations" element={<StockLocationsPage />} />
            <Route path="stock/transfers" element={<StockTransfersPage />} />
            <Route path="stock/transfers/:id" element={<StockTransferDetail />} />
            <Route path="stock/:id" element={<StockItemDetail />} />
            <Route path="inventory" element={<InventoryListPage />} />
            <Route path="inventory/new" element={<InventoryFormPage />} />
            <Route path="inventory/donor-search" element={<DonorSearchPage />} />
            <Route path="tools" element={<InventoryListPage />} />
            <Route path="clone-drives" element={<CloneDrivesList />} />
            <Route path="procedures" element={<KBCenterPage />} />
            <Route path="procedures/:id" element={<KBArticleDetailPage />} />
            <Route
              path="finance"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <RevenueDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="invoices"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <InvoicesListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="invoices/:id"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <InvoiceDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="payments"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <PaymentsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="expenses"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <ExpensesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="transactions"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <TransactionsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="banking"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <BankingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="vat-audit"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <VATAuditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                  <ReportsDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['owner', 'admin']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route path="profile" element={<UserProfile />} />
            {/* Integrations route removed - not yet implemented */}

            <Route path="hr">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <HRDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="employees"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <EmployeesList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="employees/:id"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <EmployeeProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="recruitment"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <RecruitmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="onboarding"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <EmployeeOnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="performance"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <PerformanceReviewsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="payroll">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <PayrollDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="process"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <ProcessPayrollPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="components"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <SalaryComponentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="history"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <PayrollHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="periods/:id"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <PayrollPeriodDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="adjustments"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <PayrollAdjustmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="loans"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <EmployeeLoansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <PayrollSettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="attendance">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <AttendanceDashboard />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="leave">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <LeaveManagement />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="timesheets">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'hr']}>
                    <TimesheetManagement />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="templates">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <TemplatesDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="type/:typeCode"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <TemplateTypeDetail />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="settings">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <SettingsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="general-settings"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <GeneralSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="system-numbers"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <SystemNumbers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="localization"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <AccountingLocales />
                  </ProtectedRoute>
                }
              />
              <Route
                path="client-portal"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <ClientPortalSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="import-export"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin', 'accounts']}>
                    <ImportExport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="billing"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <BillingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="plans"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <PlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="report-sections"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <ReportSectionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="security"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <SecuritySettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="gdpr"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <GDPRCompliancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path=":categoryId"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <CategoryDetail />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="admin">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="logs"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <SystemLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <AuditTrails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="database"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <DatabaseManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="role-permissions"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <RolePermissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'admin']}>
                    <TenantManagement />
                  </ProtectedRoute>
                }
              />
            </Route>
            {/* Search route removed - not yet implemented */}
          </Route>

          <Route
            path="/platform-admin"
            element={
              <ProtectedPlatformAdminRoute>
                <ErrorBoundary>
                  <PlatformAdminLayout />
                </ErrorBoundary>
              </ProtectedPlatformAdminRoute>
            }
          >
            <Route index element={<PlatformDashboard />} />
            <Route path="tenants" element={<TenantsListPage />} />
            <Route path="tenants/:id" element={<TenantDetailPage />} />
            <Route path="tickets" element={<SupportTicketsPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="settings" element={<PlatformSettingsPage />} />
            <Route path="plans" element={<PlansManagementPage />} />
            <Route path="plans/:id" element={<PlanDetailPage />} />
            <Route path="coupons" element={<CouponsManagementPage />} />
            <Route path="isolation-tests" element={<TenantIsolationTestPage />} />
            <Route path="rate-limits" element={<RateLimitDashboardPage />} />
          </Route>

              <Route path="*" element={
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                  <p className="text-lg text-gray-600 mb-6">Page not found</p>
                  <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">Go back to dashboard</a>
                </div>
              } />
            </Routes>
          </Suspense>
          </PortalAuthProvider>
        </PermissionsProvider>
        </TenantConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
