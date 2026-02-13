import { Header, HeroSection, FeaturesSection, Footer } from '@/components/landing';

export default function Home() {
  return (
    <main className="min-h-screen font-sans text-brand-dark antialiased bg-white selection:bg-brand-accent selection:text-white">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <Footer />
    </main>
  );
}
