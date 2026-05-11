import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin as supabase } from '@/lib/supabase'

type Params = { params: Promise<{ scheduleId: string }> }

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { scheduleId } = await params
  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const weekDate = searchParams.get('weekDate')

  if (!characterId || !weekDate) {
    return NextResponse.json({ error: 'characterId and weekDate are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('raid_applications')
    .delete()
    .eq('raid_schedule_id', scheduleId)
    .eq('character_id', characterId)
    .eq('week_date', weekDate)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
