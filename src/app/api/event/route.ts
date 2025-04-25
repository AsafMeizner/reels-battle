// app/api/event/route.ts
import { NextResponse } from 'next/server'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS:  true
})

export async function POST(request: Request) {
  const { channel, event, data } = await request.json()
  if (!channel || !event) {
    return NextResponse.json({ error: 'channel and event are required' }, { status: 400 })
  }
  try {
    await pusher.trigger(channel, event, data)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Pusher trigger error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
