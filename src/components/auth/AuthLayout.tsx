'use client';

import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-shrink-0 relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1a2744] to-[#0F172A]">
        {/* Gradient accent overlays */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-brand-accent/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-tight group-hover:text-blue-300 transition-colors">
              Infinite Canvas
            </span>
          </Link>

          {/* Tagline + Decorative Elements */}
          <div className="flex-1 flex flex-col justify-center py-12">
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Think Spatially,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Write Freely.
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Experience the next generation of visual note-taking. Map your thoughts on an infinite plane.
            </p>

            {/* Decorative floating note cards */}
            <div className="mt-10 relative h-48">
              {/* Card 1 */}
              <div className="absolute top-0 left-0 w-52 glass-note !bg-white/[0.06] !border-white/[0.08] !backdrop-blur-md rounded-xl p-4 shadow-xl transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-white/80 text-xs font-semibold tracking-wide">Project Ideas</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-white/10 rounded-full" />
                  <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                  <div className="h-2 w-5/6 bg-white/10 rounded-full" />
                </div>
              </div>

              {/* Card 2 */}
              <div className="absolute top-8 left-36 w-44 glass-note !bg-white/[0.04] !border-purple-400/[0.12] !backdrop-blur-md rounded-xl p-3 shadow-lg transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">Research</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-white/8 rounded-full" />
                  <div className="h-1.5 w-2/3 bg-white/8 rounded-full" />
                </div>
                <div className="mt-2 flex gap-1.5">
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[9px] font-medium rounded-md">
                    Priority
                  </span>
                </div>
              </div>

              {/* Connection line SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                <path
                  d="M 100 50 C 130 80, 140 70, 150 85"
                  fill="none"
                  stroke="rgba(139, 92, 246, 0.3)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
          </div>

          {/* Footer links */}
          <div className="flex gap-4 text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <span className="text-slate-700">&middot;</span>
            <span>© {new Date().getFullYear()} Infinite Canvas</span>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0f1a]">
        {/* Mobile brand header (shown only on < lg) */}
        <div className="lg:hidden flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <span className="text-gray-900 dark:text-white font-bold text-base tracking-tight">
              Infinite Canvas
            </span>
          </Link>
        </div>

        {/* Form content area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            {title && (
              <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
