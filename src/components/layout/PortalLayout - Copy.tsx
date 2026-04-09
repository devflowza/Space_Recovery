import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { CustomerAvatar } from '../ui/CustomerAvatar';
import { FileText, DollarSign, MessageSquare, LogOut, LayoutDashboard, Settings, FileBarChart, ShoppingBag } from 'lucide-react';
import { Button } from '../ui/Button';
import { AnnouncementBanner } from '../shared/AnnouncementBanner';

export const PortalLayout: React.FC = () => {
  const { customer, logout } = usePortalAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  if (!customer) {
    return null;
  }

  const navItems = [
    { path: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/portal/cases', label: 'My Cases', icon: FileText },
    { path: '/portal/quotes', label: 'Quotes', icon: DollarSign },
    { path: '/portal/reports', label: 'Reports', icon: FileBarChart },
    { path: '/portal/purchases', label: 'My Purchases', icon: ShoppingBag },
    { path: '/portal/communications', label: 'Messages', icon: MessageSquare },
    { path: '/portal/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AnnouncementBanner />
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-slate-900">Customer Portal</h1>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-cyan-50 text-cyan-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <CustomerAvatar
                  firstName={customer.customer_name}
                  lastName=""
                  photoUrl={customer.profile_photo_url}
                  size="sm"
                />
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {customer.customer_name}
                  </p>
                  <p className="text-xs text-slate-500">{customer.customer_number}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>

          <nav className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-cyan-50 text-cyan-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-500">
            Need assistance? Contact our support team for help.
          </p>
        </div>
      </footer>
    </div>
  );
};
