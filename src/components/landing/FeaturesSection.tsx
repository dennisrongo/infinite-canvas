import { FileText, GitBranch, RefreshCw } from 'lucide-react';
import { featuresContent } from '@/data/landingData';

interface FeaturesSectionProps {
  readonly className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  markdown: FileText,
  hub: GitBranch,
  devices: RefreshCw,
};

const colorConfig: Record<string, { bg: string; text: string; border: string; hover: string }> = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-brand-blue',
    border: 'border-blue-100',
    hover: 'group-hover:text-brand-blue',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-brand-accent',
    border: 'border-purple-100',
    hover: 'group-hover:text-brand-accent',
  },
  pink: {
    bg: 'bg-pink-50',
    text: 'text-brand-neon',
    border: 'border-pink-100',
    hover: 'group-hover:text-brand-neon',
  },
};

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ className = '' }) => {
  return (
    <section id="features" className={`bg-white py-24 relative overflow-hidden ${className}`}>
      {/* Background gradient */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="text-brand-blue font-semibold tracking-wider uppercase text-sm mb-2 block">
            {featuresContent.badge}
          </span>
          <h2 className="text-slate-900 mb-4 text-4xl font-extrabold tracking-tight">
            {featuresContent.title}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            {featuresContent.subtitle}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuresContent.features.map((feature) => {
            const Icon = iconMap[feature.icon] || FileText;
            const colors = colorConfig[feature.colorClass] || colorConfig.blue;

            return (
              <div
                key={feature.id}
                className="group bg-white rounded-2xl p-8 hover:bg-slate-50 transition-colors border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md"
              >
                <div
                  className={`mb-6 inline-flex items-center justify-center w-14 h-14 rounded-2xl ${colors.bg} ${colors.text} group-hover:scale-110 transition-transform duration-300 shadow-sm border ${colors.border}`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className={`text-xl font-bold text-slate-900 mb-3 ${colors.hover} transition-colors`}>
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
