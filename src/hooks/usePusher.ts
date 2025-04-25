'use client'

import { useEffect, useRef, useState } from 'react'
import Pusher from 'pusher-js'

export interface EventsMap {
  [eventName: string]: unknown
}

export interface UsePusherResult {
  events: EventsMap
  socketId: string
}

export function usePusher(
  channelName: string,
  eventNames: string[]
): UsePusherResult {
  // Initialize ref to null
  const pusher = useRef<Pusher | null>(null)
  const [events, setEvents] = useState<EventsMap>({})
  const [socketId, setSocketId] = useState<string>('')

  useEffect(() => {
    // Instantiate Pusher client
    const client = new Pusher(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
    )
    pusher.current = client

    // Once connected, capture socket_id
    const onConnected = () => {
      if (client.connection.socket_id) {
        setSocketId(client.connection.socket_id)
      }
    }
    client.connection.bind('connected', onConnected)

    // Subscribe to the channel and bind events
    if (channelName) {
      const channel = client.subscribe(channelName)
      for (const name of eventNames) {
        channel.bind(name, (payload: unknown): void => {
          setEvents(prev => ({ ...prev, [name]: payload }))
        })
      }
    }

    return () => {
      if (channelName) {
        pusher.current?.unsubscribe(channelName)
      }
      client.connection.unbind('connected', onConnected)
    }
  }, [channelName, eventNames])

  return { events, socketId }
}
