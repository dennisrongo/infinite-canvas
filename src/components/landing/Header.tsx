import Link from 'next/link';
import { siteConfig, navLinks } from '@/data/landingData';

interface HeaderProps {
  readonly className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  return (
    <header
      className={`w-full py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100/50 supports-[backdrop-filter]:bg-white/60 ${className}`}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer group">
        <div className="text-brand-blue group-hover:text-brand-accent transition-colors duration-300 text-2xl">
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
          </svg>
        </div>
        <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-accent">
          {siteConfig.name}
        </span>
      </Link>

      {/* Navigation */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="hover:text-brand-blue transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Auth Buttons */}
      <div className="flex items-center gap-4">
        <Link
          href="/auth/login"
          className="text-sm font-medium text-gray-500 hover:text-brand-blue transition-colors hidden sm:block"
        >
          Login
        </Link>
        <Link
          href="/auth/register"
          className="bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
};

export default Header;
