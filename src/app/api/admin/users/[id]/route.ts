import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const { role } = await request.json()

  if (role !== 'member' && role !== 'admin') {
    return NextResponse.json({ error: '올바르지 않은 권한이에요.' }, { status: 400 })
  }

  // 자기 자신의 권한은 변경 불가
  if (id === guard.session!.userId) {
    return NextResponse.json({ error: '자신의 권한은 변경할 수 없어요.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params

  if (id === guard.session!.userId) {
    return NextResponse.json({ error: '자신의 계정은 삭제할 수 없어요.' }, { status: 400 })
  }

  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
