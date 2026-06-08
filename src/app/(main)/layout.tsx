import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PublicHeader from '@/components/PublicHeader'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
