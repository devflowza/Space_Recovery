import type { ReactNode } from 'react';
import { HardDrive } from 'lucide-react';
import { AuthBackground } from './AuthBackground';
import { RecoveryMotif } from './RecoveryMotif';

interface AuthShellProps {
  /** Brand column shown beside the panel on lg+ screens. Omit to center the panel. */
  aside?: ReactNode;
  /** The elevated glass panel content. */
  children: ReactNode;
  /** Bottom row (trust chips). */
  footer?: ReactNode;
}

/**
 * Full-bleed immersive scaffold for the auth zone: one dark canvas
 * (AuthBackground) with the platter motif as the focal instrument, a wordmark
 * header, an optional brand column, and the glass form panel. Replaces the old
 * 60/40 split AuthLayout. Non-themed + lint-exempt (see DESIGN.md).
 */
export const AuthShell = ({ aside, children, footer }: AuthShellProps) => {
  return (
    <div className="relative min-h-dvh overflow-hidden flex flex-col">
      <AuthBackground />

      <header className="relative z-10 px-6 sm:px-10 pt-6">
        <div className="inline-flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-sky-300" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="font-display-auth text-xl font-semibold text-white tracking-tight">xSuite</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center px-6 sm:px-10 py-10">
        <div
          className={`w-full max-w-6xl mx-auto grid items-center gap-12 xl:gap-20 ${
            aside ? 'lg:grid-cols-[1.1fr,minmax(0,26.5rem)]' : ''
          }`}
        >
          {aside && (
            <div className="relative hidden lg:block">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40"
              >
                <RecoveryMotif size={640} />
              </div>
              <div className="relative">{aside}</div>
            </div>
          )}

          <div className={`w-full ${aside ? 'max-w-md lg:max-w-none mx-auto lg:mx-0' : 'max-w-md mx-auto'} relative`}>
            {!aside && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25"
              >
                <RecoveryMotif size={620} />
              </div>
            )}
            <div className="relative bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-slate-950/60 p-7 sm:p-8">
              {children}
            </div>
          </div>
        </div>
      </main>

      {footer && (
        <footer className="relative z-10 px-6 sm:px-10 pb-6 flex justify-center lg:justify-start lg:ps-10">
          {footer}
        </footer>
      )}
    </div>
  );
};
