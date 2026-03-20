import type { ReactNode } from 'react';
import { AuthBackground } from './AuthBackground';

interface AuthLayoutProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
}

export const AuthLayout = ({ leftContent, rightContent }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex font-body">
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        <AuthBackground />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 py-12 w-full">
          {leftContent}
        </div>
      </div>

      <div className="w-full lg:w-[40%] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 lg:bg-slate-50 lg:bg-none p-6 sm:p-8">
        {rightContent}
      </div>
    </div>
  );
};
