'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { signToken, setSessionCookie, clearSessionCookie } from '@/lib/auth'

export async function login(prevState: { error: string } | null, formData: FormData) {
  const nickname = formData.get('nickname') as string
  const password = formData.get('password') as string

  if (!nickname || !password) {
    return { error: '닉네임과 비밀번호를 입력해주세요.' }
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, nickname, password_hash, role')
    .eq('nickname', nickname)
    .single()

  if (error || !user) {
    return { error: '닉네임을 찾을 수 없어요.' }
  }

  if (!user.password_hash) {
    return { error: '아직 회원가입이 완료되지 않은 계정이에요.' }
  }

  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    return { error: '비밀번호가 틀렸어요.' }
  }

  const token = await signToken({
    userId: user.id,
    nickname: user.nickname,
    role: user.role as 'member' | 'admin',
  })

  await setSessionCookie(token)
  redirect('/')
}

export async function signup(prevState: { error: string } | null, formData: FormData) {
  const nickname = formData.get('nickname') as string
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string

  if (!nickname || !password || !passwordConfirm) {
    return { error: '모든 항목을 입력해주세요.' }
  }

  if (!/^\d{4}$/.test(password)) {
    return { error: '비밀번호는 숫자 4자리만 입력 가능해요.' }
  }

  if (password !== passwordConfirm) {
    return { error: '비밀번호가 일치하지 않아요.' }
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('nickname', nickname)
    .single()

  if (error || !user) {
    return { error: '길드원 목록에 없는 닉네임이에요.' }
  }

  if (user.password_hash) {
    return { error: '이미 가입된 닉네임이에요.' }
  }

  const hash = await bcrypt.hash(password, 10)
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('id', user.id)

  if (updateError) {
    return { error: '회원가입 중 오류가 발생했어요.' }
  }

  redirect('/login?registered=1')
}

export async function logout() {
  await clearSessionCookie()
  redirect('/login')
}
