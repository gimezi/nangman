import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const { nickname, class: cls, combat_power, server } = await request.json()

  if (!nickname || !cls || combat_power == null) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('characters')
    .update({ nickname, class: cls, combat_power, server: server ?? null })
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
  const { error } = await supabase.from('characters').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
