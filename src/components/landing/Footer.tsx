import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { siteConfig, footerLinks, socialLinks } from '@/data/landingData';

interface FooterProps {
  readonly className?: string;
}

const socialIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
};

const socialColorMap: Record<string, string> = {
  facebook: 'hover:text-brand-blue',
  instagram: 'hover:text-brand-neon',
  twitter: 'hover:text-brand-blue',
  youtube: 'hover:text-red-600',
};

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  return (
    <footer className={`bg-gray-50 border-t border-gray-100 py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Left side - Copyright and Links */}
        <div className="flex flex-col md:flex-row items-center gap-8 text-sm text-gray-500 font-medium">
          <span className="text-gray-400 font-normal">{siteConfig.copyright}</span>
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-brand-dark transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side - Social Icons */}
        <div className="flex gap-6 text-gray-400">
          {socialLinks.map((social) => {
            const Icon = socialIconMap[social.icon] || Twitter;
            const hoverColor = socialColorMap[social.icon] || 'hover:text-brand-blue';

            return (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className={`${hoverColor} transition-colors transform hover:-translate-y-1`}
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
