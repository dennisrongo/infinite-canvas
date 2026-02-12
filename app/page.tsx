import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-light-canvas dark:bg-dark-canvas">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-4">
            Infinite Canvas
          </h1>
          <p className="text-light-text dark:text-dark-text mb-8">
            Create, organize, and connect notes on an unlimited canvas
          </p>
          <div className="space-x-4">
            <Link
              href="/auth/register"
              className="px-6 py-3 bg-light-primary dark:bg-dark-primary text-white rounded-lg hover:opacity-90 transition"
            >
              Register
            </Link>
            <Link
              href="/auth/login"
              className="px-6 py-3 border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary rounded-lg hover:opacity-90 transition"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
