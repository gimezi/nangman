import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('characters')
    .select('id, nickname, class, combat_power')
    .eq('user_id', session.userId)
    .order('combat_power', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { nickname, class: cls, combat_power } = body

  if (!nickname || !cls || combat_power == null) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('characters')
    .insert({ user_id: session.userId, nickname, class: cls, combat_power })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
