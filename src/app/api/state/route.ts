import { NextResponse } from 'next/server'
import { loadState } from '@/lib/data'

export async function GET() {
  const state = await loadState()
  return NextResponse.json(state)
}
