/**
 * Static content for the landing page
 */

export const siteConfig = {
  name: 'Infinite Canvas',
  tagline: 'Think Spatially, Write Freely',
  copyright: `© ${new Date().getFullYear()} Infinite Canvas`,
};

export const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#' },
  { label: 'About', href: '#' },
] as const;

export const heroContent = {
  headline: 'Think Spatially,',
  headlineGradient: 'Write Freely',
  subheadline: 'The visual workspace for your best ideas. Connect notes, build mind maps, and organize research on an infinite glass canvas.',
  primaryCta: {
    label: 'Start Creating',
    href: '/auth/register',
  },
  secondaryCta: {
    label: 'View Demo',
    href: '#',
  },
};

export const featuresContent = {
  badge: 'Workflow',
  title: 'Designed for Flow',
  subtitle: 'Minimalist tools that stay out of your way until you need them.',
  features: [
    {
      id: 'markdown',
      icon: 'markdown',
      title: 'Markdown Native',
      description: "Don't break your writing flow. Use standard syntax to format text, create lists, and structure your thoughts instantly.",
      colorClass: 'blue',
    },
    {
      id: 'connectors',
      icon: 'hub',
      title: 'Smart Connectors',
      description: 'Draw relationships effortlessly. Lines snap to objects and adjust automatically as you move ideas around the canvas.',
      colorClass: 'purple',
    },
    {
      id: 'sync',
      icon: 'devices',
      title: 'Live Sync',
      description: 'Your infinite canvas is everywhere you are. Real-time synchronization across desktop, tablet, and mobile browsers.',
      colorClass: 'pink',
    },
  ] as const,
};

export const footerLinks = [
  { label: 'Support', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Privacy Policy', href: '#' },
] as const;

export const socialLinks = [
  { label: 'Facebook', href: '#', icon: 'facebook' },
  { label: 'Instagram', href: '#', icon: 'instagram' },
  { label: 'Twitter', href: '#', icon: 'twitter' },
  { label: 'YouTube', href: '#', icon: 'youtube' },
] as const;
