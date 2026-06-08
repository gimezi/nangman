import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '유효하지 않은 요청이에요.' }, { status: 400 })
  }

  const allowed = ['nickname', 'class', 'combat_power', 'server', 'taba', 'abyss', 'geulgi']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key === 'class' ? 'class' : key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 항목이 없어요.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('characters')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
