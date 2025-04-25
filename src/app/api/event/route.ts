import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS:  true
})

interface EventPayload<T = unknown> {
  channel: string
  event: string
  data: T
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as EventPayload
  const { channel, event, data } = body

  if (!channel || !event) {
    return NextResponse.json(
      { error: 'channel and event are required' },
      { status: 400 }
    )
  }

  try {
    await pusher.trigger(channel, event, data)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown Pusher error'
    console.error('Pusher trigger error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
