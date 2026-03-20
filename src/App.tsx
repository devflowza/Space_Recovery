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

const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const TenantSignup = lazy(() => import('./pages/auth/TenantSignup').then(m => ({ default: m.TenantSignup })));
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const SettingsDashboard = lazy(() => import('./pages/settings/SettingsDashboard').then(m => ({ default: m.SettingsDashboard })));
const CategoryDetail = lazy(() => import('./pages/settings/CategoryDetail').then(m => ({ default: m.CategoryDetail })));
const SystemNumbers = lazy(() => import('./pages/settings/SystemNumbers').then(m => ({ default: m.SystemNumbers })));
const GeneralSettings = lazy(() => import('./pages/settings/GeneralSettings').then(m => ({ default: m.GeneralSettings })));
const ClientsList = lazy(() => import('./pages/clients/ClientsList').then(m => ({ default: m.ClientsList })));
const CustomersListPage = lazy(() => import('./pages/customers/CustomersListPage').then(m => ({ default: m.CustomersListPage })));
const CustomerProfilePage = lazy(() => import('./pages/customers/CustomerProfilePage').then(m => ({ default: m.CustomerProfilePage })));
const CompaniesListPage = lazy(() => import('./pages/companies/CompaniesListPage').then(m => ({ default: m.CompaniesListPage })));
const CompanyProfilePage = lazy(() => import('./pages/companies/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
const CasesList = lazy(() => import('./pages/cases/CasesList').then(m => ({ default: m.CasesList })));
const CaseDetail = lazy(() => import('./pages/cases/CaseDetail').then(m => ({ default: m.CaseDetail })));
const HRDashboard = lazy(() => import('./pages/hr/HRDashboard').then(m => ({ default: m.HRDashboard })));
const EmployeesList = lazy(() => import('./pages/hr/EmployeesList').then(m => ({ default: m.EmployeesList })));
const EmployeeProfilePage = lazy(() => import('./pages/hr/EmployeeProfilePage').then(m => ({ default: m.EmployeeProfilePage })));
const RecruitmentPage = lazy(() => import('./pages/hr/RecruitmentPage').then(m => ({ default: m.RecruitmentPage })));
const EmployeeOnboardingPage = lazy(() => import('./pages/hr/EmployeeOnboardingPage').then(m => ({ default: m.EmployeeOnboardingPage })));
const PerformanceReviewsPage = lazy(() => import('./pages/hr/PerformanceReviewsPage').then(m => ({ default: m.PerformanceReviewsPage })));
const PayrollDashboard = lazy(() => import('./pages/payroll/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));
const PayrollHistoryPage = lazy(() => import('./pages/payroll/PayrollHistoryPage'));
const ProcessPayrollPage = lazy(() => import('./pages/payroll/ProcessPayrollPage'));
const SalaryComponentsPage = lazy(() => import('./pages/payroll/SalaryComponentsPage'));
const PayrollPeriodDetailPage = lazy(() => import('./pages/payroll/PayrollPeriodDetailPage'));
const PayrollAdjustmentsPage = lazy(() => import('./pages/payroll/PayrollAdjustmentsPage'));
const EmployeeLoansPage = lazy(() => import('./pages/payroll/EmployeeLoansPage').then(m => ({ default: m.EmployeeLoansPage })));
const PayrollSettingsPage = lazy(() => import('./pages/payroll/PayrollSettingsPage').then(m => ({ default: m.PayrollSettingsPage })));
const AttendanceDashboard = lazy(() => import('./pages/employee-management/AttendanceDashboard').then(m => ({ default: m.AttendanceDashboard })));
const LeaveManagement = lazy(() => import('./pages/employee-management/LeaveManagement').then(m => ({ default: m.LeaveManagement })));
const TimesheetManagement = lazy(() => import('./pages/employee-management/TimesheetManagement').then(m => ({ default: m.TimesheetManagement })));
const TemplatesDashboard = lazy(() => import('./pages/templates/TemplatesDashboard').then(m => ({ default: m.TemplatesDashboard })));
const TemplateTypeDetail = lazy(() => import('./pages/templates/TemplateTypeDetail').then(m => ({ default: m.TemplateTypeDetail })));
const AccountingLocales = lazy(() => import('./pages/settings/AccountingLocales').then(m => ({ default: m.AccountingLocales })));
const ClientPortalSettings = lazy(() => import('./pages/settings/ClientPortalSettings').then(m => ({ default: m.ClientPortalSettings })));
const ImportExport = lazy(() => import('./pages/settings/ImportExport').then(m => ({ default: m.ImportExport })));
const ReportSectionsPage = lazy(() => import('./pages/settings/ReportSectionsPage').then(m => ({ default: m.ReportSectionsPage })));
const BillingPage = lazy(() => import('./pages/settings/BillingPage'));
const PlansPage = lazy(() => import('./pages/settings/PlansPage'));
const SecuritySettingsPage = lazy(() => import('./pages/settings/SecuritySettingsPage').then(m => ({ default: m.SecuritySettingsPage })));
const GDPRCompliancePage = lazy(() => import('./pages/settings/GDPRCompliancePage').then(m => ({ default: m.GDPRCompliancePage })));

const PortalLogin = lazy(() => import('./pages/portal/PortalLogin').then(m => ({ default: m.PortalLogin })));
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard').then(m => ({ default: m.PortalDashboard })));
const PortalCases = lazy(() => import('./pages/portal/PortalCases').then(m => ({ default: m.PortalCases })));
const PortalQuotes = lazy(() => import('./pages/portal/PortalQuotes').then(m => ({ default: m.PortalQuotes })));
const PortalReports = lazy(() => import('./pages/portal/PortalReports'));
const PortalCommunications = lazy(() => import('./pages/portal/PortalCommunications').then(m => ({ default: m.PortalCommunications })));
const PortalSettings = lazy(() => import('./pages/portal/PortalSettings').then(m => ({ default: m.PortalSettings })));
const PortalPurchasesPage = lazy(() => import('./pages/portal/PortalPurchasesPage').then(m => ({ default: m.PortalPurchasesPage })));

const KBCenterPage = lazy(() => import('./pages/kb/KBCenterPage').then(m => ({ default: m.KBCenterPage })));
const KBArticleDetailPage = lazy(() => import('./pages/kb/KBArticleDetailPage').then(m => ({ default: m.KBArticleDetailPage })));

const PrintReceiptPage = lazy(() => import('./pages/print/PrintReceiptPage').then(m => ({ default: m.PrintReceiptPage })));
const PrintLabelPage = lazy(() => import('./pages/print/PrintLabelPage').then(m => ({ default: m.PrintLabelPage })));
const PrintCustomerCopyPage = lazy(() => import('./pages/print/PrintCustomerCopyPage').then(m => ({ default: m.PrintCustomerCopyPage })));
const PrintCheckoutPage = lazy(() => import('./pages/print/PrintCheckoutPage').then(m => ({ default: m.PrintCheckoutPage })));
const PrintPaymentReceiptPage = lazy(() => import('./pages/print/PrintPaymentReceiptPage').then(m => ({ default: m.PrintPaymentReceiptPage })));

const UserManagement = lazy(() => import('./pages/users/UserManagement').then(m => ({ default: m.UserManagement })));
const UserProfile = lazy(() => import('./pages/users/UserProfile').then(m => ({ default: m.UserProfile })));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const SystemLogs = lazy(() => import('./pages/admin/SystemLogs').then(m => ({ default: m.SystemLogs })));
const AuditTrails = lazy(() => import('./pages/admin/AuditTrails').then(m => ({ default: m.AuditTrails })));
const DatabaseManagement = lazy(() => import('./pages/admin/DatabaseManagement').then(m => ({ default: m.DatabaseManagement })));
const RolePermissions = lazy(() => import('./pages/admin/RolePermissions').then(m => ({ default: m.RolePermissions })));
const TenantManagement = lazy(() => import('./pages/admin/TenantManagement').then(m => ({ default: m.TenantManagement })));
const CloneDrivesList = lazy(() => import('./pages/resources/CloneDrivesList').then(m => ({ default: m.CloneDrivesList })));
const StockListPage = lazy(() => import('./pages/stock/StockListPage'));
const StockItemDetail = lazy(() => import('./pages/stock/StockItemDetail'));
const StockCategoriesPage = lazy(() => import('./pages/stock/StockCategoriesPage'));
const StockSalesPage = lazy(() => import('./pages/stock/StockSalesPage'));
const StockSaleDetailPage = lazy(() => import('./pages/stock/StockSaleDetailPage'));
const StockAdjustmentsPage = lazy(() => import('./pages/stock/StockAdjustmentsPage'));
const StockReportsPage = lazy(() => import('./pages/stock/StockReportsPage'));
const StockReturnsPage = lazy(() => import('./pages/stock/StockReturnsPage'));
const StockLocationsPage = lazy(() => import('./pages/stock/StockLocationsPage'));
const StockTransfersPage = lazy(() => import('./pages/stock/StockTransfersPage'));
const StockTransferDetail = lazy(() => import('./pages/stock/StockTransferDetail'));
const InventoryListPage = lazy(() => import('./pages/inventory/InventoryListPage'));
const InventoryFormPage = lazy(() => import('./pages/inventory/InventoryFormPage'));
const DonorSearchPage = lazy(() => import('./pages/inventory/DonorSearchPage'));

const InvoicesListPage = lazy(() => import('./pages/financial/InvoicesListPage'));
const InvoiceDetailPage = lazy(() => import('./pages/financial/InvoiceDetailPage'));
const PaymentsList = lazy(() => import('./pages/financial/PaymentsList').then(m => ({ default: m.PaymentsList })));
const ExpensesList = lazy(() => import('./pages/financial/ExpensesList').then(m => ({ default: m.ExpensesList })));
const RevenueDashboard = lazy(() => import('./pages/financial/RevenueDashboard').then(m => ({ default: m.RevenueDashboard })));
const TransactionsList = lazy(() => import('./pages/financial/TransactionsList').then(m => ({ default: m.TransactionsList })));
const BankingPage = lazy(() => import('./pages/financial/BankingPage').then(m => ({ default: m.BankingPage })));
const VATAuditPage = lazy(() => import('./pages/financial/VATAuditPage').then(m => ({ default: m.VATAuditPage })));
const ReportsDashboard = lazy(() => import('./pages/financial/ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));

const QuotesListPage = lazy(() => import('./pages/quotes/QuotesListPage'));
const QuoteDetailPage = lazy(() => import('./pages/quotes/QuoteDetailPage'));
const QuotesRecycleBin = lazy(() => import('./pages/quotes/QuotesRecycleBin'));

const SuppliersListPage = lazy(() => import('./pages/suppliers/SuppliersListPage'));
const SupplierProfilePage = lazy(() => import('./pages/suppliers/SupplierProfilePage'));
const PurchaseOrdersListPage = lazy(() => import('./pages/suppliers/PurchaseOrdersListPage'));
const PurchaseOrderDetailPage = lazy(() => import('./pages/suppliers/PurchaseOrderDetailPage'));

const PlatformDashboard = lazy(() => import('./pages/platform-admin/PlatformDashboard').then(m => ({ default: m.PlatformDashboard })));
const TenantsListPage = lazy(() => import('./pages/platform-admin/TenantsListPage').then(m => ({ default: m.TenantsListPage })));
const TenantDetailPage = lazy(() => import('./pages/platform-admin/TenantDetailPage').then(m => ({ default: m.TenantDetailPage })));
const SupportTicketsPage = lazy(() => import('./pages/platform-admin/SupportTicketsPage').then(m => ({ default: m.SupportTicketsPage })));
const TicketDetailPage = lazy(() => import('./pages/platform-admin/TicketDetailPage').then(m => ({ default: m.TicketDetailPage })));
const AnnouncementsPage = lazy(() => import('./pages/platform-admin/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })));
const TenantIsolationTestPage = lazy(() => import('./pages/platform-admin/TenantIsolationTestPage').then(m => ({ default: m.TenantIsolationTestPage })));
const RateLimitDashboardPage = lazy(() => import('./pages/platform-admin/RateLimitDashboardPage').then(m => ({ default: m.RateLimitDashboardPage })));
const PlatformSettingsPage = lazy(() => import('./pages/platform-admin/PlatformSettingsPage').then(m => ({ default: m.PlatformSettingsPage })));
const PlansManagementPage = lazy(() => import('./pages/platform-admin/PlansManagementPage').then(m => ({ default: m.PlansManagementPage })));
const PlanDetailPage = lazy(() => import('./pages/platform-admin/PlanDetailPage').then(m => ({ default: m.PlanDetailPage })));
const CouponsManagementPage = lazy(() => import('./pages/platform-admin/CouponsManagementPage').then(m => ({ default: m.CouponsManagementPage })));

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
              <Route path="/signup/tenant" element={<TenantSignup />} />
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
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <SuppliersListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="suppliers/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <SupplierProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="purchase-orders"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <PurchaseOrdersListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="purchase-orders/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
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
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <RevenueDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="invoices"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <InvoicesListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="invoices/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <InvoiceDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="payments"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <PaymentsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="expenses"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <ExpensesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="transactions"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <TransactionsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="banking"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <BankingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="vat-audit"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <VATAuditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                  <ReportsDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
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
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <HRDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="employees"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <EmployeesList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="employees/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <EmployeeProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="recruitment"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <RecruitmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="onboarding"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <EmployeeOnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="performance"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <PerformanceReviewsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="payroll">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <PayrollDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="process"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <ProcessPayrollPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="components"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <SalaryComponentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="history"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <PayrollHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="periods/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <PayrollPeriodDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="adjustments"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <PayrollAdjustmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="loans"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <EmployeeLoansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <PayrollSettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="attendance">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <AttendanceDashboard />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="leave">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <LeaveManagement />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="timesheets">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hr']}>
                    <TimesheetManagement />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="templates">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <TemplatesDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="type/:typeCode"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <TemplateTypeDetail />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="settings">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SettingsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="general-settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <GeneralSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="system-numbers"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SystemNumbers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="localization"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AccountingLocales />
                  </ProtectedRoute>
                }
              />
              <Route
                path="client-portal"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ClientPortalSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="import-export"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'accounts']}>
                    <ImportExport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="billing"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <BillingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="plans"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="report-sections"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ReportSectionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="security"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SecuritySettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="gdpr"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <GDPRCompliancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path=":categoryId"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <CategoryDetail />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="admin">
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="logs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SystemLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuditTrails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="database"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DatabaseManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="role-permissions"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RolePermissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tenants"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
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
