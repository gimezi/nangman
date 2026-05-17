import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { data, error } = await supabase
    .from('users')
    .select('id, nickname, role, created_at, characters(id, nickname, class, combat_power, server)')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { nickname } = await request.json()
  if (!nickname?.trim()) return NextResponse.json({ error: '닉네임을 입력해주세요.' }, { status: 400 })

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('nickname', nickname.trim())
    .single()

  if (existing) return NextResponse.json({ error: '이미 존재하는 닉네임이에요.' }, { status: 409 })

  const { data, error } = await supabase
    .from('users')
    .insert({ nickname: nickname.trim(), password_hash: '', role: 'member' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
