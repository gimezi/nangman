import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PartiesClient from './PartiesClient'

export default async function PartiesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <PartiesClient isAdmin={session.role === 'admin'} />
}
