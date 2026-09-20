import { NextResponse } from 'next/server'
import { ensureUser } from '@/lib/data'
import { syncGithub } from '@/lib/github'

export async function POST() {
  const userId = await ensureUser()
  const result = await syncGithub(userId)
  return NextResponse.json(result)
}
