import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B]">
      <header className="bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#475569] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
            Infinite Canvas
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#1E293B] dark:text-[#F1F5F9]">{session.email}</span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow p-8">
            <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Welcome to Infinite Canvas!
            </h2>
            <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              You are now logged in. Start creating your canvases and notes!
            </p>
            <div className="p-4 bg-[#F8FAFC] dark:bg-[#1E293B] rounded-lg border border-[#E2E8F0] dark:border-[#475569]">
              <p className="text-sm text-[#1E293B] dark:text-[#F1F5F9]">User ID: {session.userId}</p>
              <p className="text-sm text-[#1E293B] dark:text-[#F1F5F9]">Email: {session.email}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
