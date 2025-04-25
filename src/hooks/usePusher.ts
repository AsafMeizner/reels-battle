'use client'

import { useEffect, useRef, useState } from 'react'
import Pusher from 'pusher-js'

type EventsMap = Record<string, any>

/**
 * Subscribes to `channelName` and listens for `eventNames`.
 * Exposes incoming `events` and your own `socketId`.
 */
export function usePusher(channelName: string, eventNames: string[]) {
  const pusher = useRef<Pusher | null>(null)
  const [events, setEvents]     = useState<EventsMap>({})
  const [socketId, setSocketId] = useState<string>('')

  useEffect(() => {
    Pusher.logToConsole = false
    pusher.current = new Pusher(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
    )

    // Grab real socket_id once connected
    pusher.current.connection.bind('connected', () => {
      setSocketId(pusher.current!.connection.socket_id!)
    })

    // Subscribe only once we have a channelName
    if (channelName) {
      const channel = pusher.current.subscribe(channelName)
      for (const name of eventNames) {
        channel.bind(name, (payload: any) => {
          setEvents(e => ({ ...e, [name]: payload }))
        })
      }
    }

    return () => {
      if (channelName) pusher.current?.unsubscribe(channelName)
      pusher.current?.connection.unbind('connected')
    }
  }, [channelName, eventNames])

  return { events, socketId }
}
