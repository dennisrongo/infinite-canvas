import Link from 'next/link';
import { heroContent } from '@/data/landingData';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  readonly className?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ className = '' }) => {
  return (
    <section
      className={`hero-bg pt-20 px-4 sm:px-6 lg:px-8 text-center pb-32 overflow-hidden relative ${className}`}
    >
      {/* Background gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 blur-3xl -z-10 rounded-full" />

      {/* Content */}
      <div className="max-w-4xl mx-auto mb-16 relative z-10">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-slate-900 leading-tight">
          {heroContent.headline}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-accent to-brand-neon">
            {heroContent.headlineGradient}
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          {heroContent.subheadline}
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href={heroContent.primaryCta.href}
            className="inline-flex items-center gap-2 bg-brand-blue text-white px-8 py-3.5 rounded-full text-base font-semibold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transform hover:-translate-y-0.5"
          >
            {heroContent.primaryCta.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={heroContent.secondaryCta.href}
            className="inline-flex items-center gap-2 bg-white text-slate-700 border border-gray-200 px-8 py-3.5 rounded-full text-base font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            {heroContent.secondaryCta.label}
          </Link>
        </div>
      </div>

      {/* Canvas Mockup */}
      <CanvasMockup />
    </section>
  );
};

const CanvasMockup: React.FC = () => {
  return (
    <div className="relative w-full max-w-5xl mx-auto h-[600px] rounded-2xl border border-gray-200/80 shadow-2xl bg-white overflow-hidden group select-none">
      {/* Dot grid background */}
      <div className="absolute inset-0 bg-dot-grid-canvas opacity-40 bg-[length:20px_20px]" />

      {/* Content container */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Connection lines SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <path
            d="M420 220 C 350 220, 280 300, 250 380"
            fill="none"
            stroke="#3B82F6"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <path
            d="M420 220 C 450 250, 400 350, 480 400"
            fill="none"
            stroke="#8B5CF6"
            strokeDasharray="4 4"
            strokeOpacity="0.5"
            strokeWidth="2"
          />
        </svg>

        {/* Main Note - Center */}
        <div className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 z-10">
          <GlassNote
            title="Project Phoenix"
            borderColor="brand-blue"
            hasAvatars
          />
        </div>

        {/* Research Note - Bottom Left */}
        <div className="absolute left-[20%] top-[65%] z-10">
          <ResearchNote />
        </div>
      </div>
    </div>
  );
};

interface GlassNoteProps {
  readonly title: string;
  readonly borderColor?: string;
  readonly hasAvatars?: boolean;
}

const GlassNote: React.FC<GlassNoteProps> = ({ title, borderColor = 'brand-blue', hasAvatars = false }) => {
  const borderClass = borderColor === 'brand-blue' ? 'border-l-brand-blue' : 'border-l-brand-accent';

  return (
    <div className={`glass-note p-6 rounded-2xl w-80 border-l-4 ${borderClass} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-2 h-2 rounded-full bg-${borderColor}`} />
        <h3 className="font-bold text-gray-800 text-sm tracking-wide">{title}</h3>
      </div>

      {/* Content lines */}
      <div className="space-y-3 mb-4">
        <div className="h-2.5 w-full bg-gray-100/80 rounded-full" />
        <div className="h-2.5 w-3/4 bg-gray-100/80 rounded-full" />
        <div className="h-2.5 w-5/6 bg-gray-100/80 rounded-full" />
      </div>

      {hasAvatars && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs text-blue-600 font-bold">
              JD
            </div>
            <div className="w-7 h-7 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs text-purple-600 font-bold">
              AS
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ResearchNote: React.FC = () => {
  return (
    <div className="glass-note p-5 rounded-2xl w-56 border-t-4 border-t-brand-accent shadow-md hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-brand-accent uppercase tracking-widest">
          RESEARCH
        </span>
        <span className="text-gray-300 text-sm">...</span>
      </div>
      <p className="text-sm text-gray-700 font-semibold mb-3">User Interviews Q3</p>
      <div className="flex gap-2 flex-wrap">
        <span className="px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded-md border border-purple-100">
          High Priority
        </span>
      </div>
    </div>
  );
};

export default HeroSection;
