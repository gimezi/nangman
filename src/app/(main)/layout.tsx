import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation nickname={session.nickname} role={session.role} />
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
