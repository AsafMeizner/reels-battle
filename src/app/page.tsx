'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import axios, { AxiosResponse } from 'axios'
import { usePusher } from '../hooks/usePusher'
import JoinRoom from '../components/JoinRoom'
import RoleSelection from '../components/RoleSelection'
import BattleLobby from '../components/BattleLobby'

type Role = 'sharer' | 'watcher'
type PlayersMap = Record<string, Role | null>

interface RoundStartData { sharerIds: string[] }
interface OfferData       { to: string; from: string; sdp: RTCSessionDescriptionInit }
interface AnswerData      { to: string; from: string; sdp: RTCSessionDescriptionInit }
interface IceData         { to: string; from: string; candidate: RTCIceCandidateInit }
interface VoteData        { which: 'A' | 'B' }

export default function Page() {
  const [step, setStep]       = useState<'join'|'role'|'lobby'|'share'|'watch'>('join')
  const [room, setRoom]       = useState<string>('')
  const [players, setPlayers] = useState<PlayersMap>({})
  const [role, setRole]       = useState<Role | null>(null)
  const [sharers, setSharers] = useState<string[]>([])
  const [streams, setStreams] = useState<Record<string,MediaStream>>({})
  const [votes, setVotes]     = useState<{A:number;B:number}>({ A: 0, B: 0 })

  // 1️⃣ Hoist sendEvent so it exists before any useEffect
  const sendEvent = useCallback(
    (event: string, data: unknown): Promise<AxiosResponse<unknown, unknown>> => {
      return axios.post('/api/event', { channel: room, event, data })
    },
    [room]
  )

  const { events, socketId } = usePusher(room, [
    'lobbyUpdate','roundStart','offer','answer','iceCandidate','newVote'
  ])

  // Merge lobby updates
  useEffect(() => {
    const lu = events.lobbyUpdate as { players?: PlayersMap } | undefined
    if (lu?.players) {
      setPlayers(prev => ({ ...prev, ...lu.players! }))
    }
  }, [events.lobbyUpdate])

  // Handle roundStart
  useEffect(() => {
    const rs = events.roundStart as RoundStartData | undefined
    if (!rs) return
    setSharers(rs.sharerIds)
    if (role === 'sharer' && rs.sharerIds.includes(socketId)) {
      setStep('share')
    } else if (role === 'watcher') {
      setStep('watch')
    }
  }, [events.roundStart, role, socketId])

  // WebRTC peer connections
  const pcs = useRef<Record<string, RTCPeerConnection>>({})

  // Incoming offer (watcher)
  useEffect(() => {
    const o = events.offer as OfferData | undefined
    if (!o || o.to !== socketId) return

    const pc = new RTCPeerConnection({ iceServers:[{urls:'stun:stun.l.google.com:19302'}] })
    pcs.current[o.from] = pc

    pc.ontrack = e => {
      setStreams(s => ({ ...s, [o.from]: e.streams[0] }))
    }
    pc.onicecandidate = e => {
      if (e.candidate) {
        sendEvent('iceCandidate', { to: o.from, from: socketId, candidate: e.candidate })
      }
    }

    ;(async () => {
      await pc.setRemoteDescription(o.sdp)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendEvent('answer', { to: o.from, from: socketId, sdp: answer })
    })()
  }, [events.offer, socketId, sendEvent])

  // Incoming answer (sharer)
  useEffect(() => {
    const a = events.answer as AnswerData | undefined
    if (!a || a.to !== socketId) return
    pcs.current[a.from].setRemoteDescription(a.sdp)
  }, [events.answer, socketId])

  // ICE candidates
  useEffect(() => {
    const c = events.iceCandidate as IceData | undefined
    if (!c || c.to !== socketId) return
    pcs.current[c.from].addIceCandidate(new RTCIceCandidate(c.candidate))
  }, [events.iceCandidate, socketId])

  // Tally votes
  useEffect(() => {
    const v = events.newVote as VoteData | undefined
    if (v) {
      setVotes(prev => ({ ...prev, [v.which]: prev[v.which] + 1 }))
    }
  }, [events.newVote])

  // —— Step Handlers ——
  const handleJoin = useCallback((code: string) => {
    setRoom(code)
    setStep('role')
    // Defer broadcast until after subscription
    setTimeout(() => {
      setPlayers(p => ({ ...p, [socketId]: null }))
      sendEvent('lobbyUpdate', { players: { [socketId]: null } })
    }, 0)
  }, [sendEvent, socketId])

  const handleRole = useCallback((r: Role) => {
    setRole(r)
    setPlayers(p => ({ ...p, [socketId]: r }))
    sendEvent('lobbyUpdate', { players: { [socketId]: r } })
    setStep('lobby')
  }, [sendEvent, socketId])

  const startRound = useCallback(() => {
    const pool = Object.entries(players)
      .filter(([, r]) => r === 'sharer')
      .map(([id]) => id)
    const [A, B] = shuffle(pool).slice(0, 2)
    sendEvent('roundStart', { sharerIds: [A, B] })
  }, [players, sendEvent])

  const startShare = useCallback(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video:true })
    for (const other of sharers) {
      if (other === socketId) continue
      const pc = new RTCPeerConnection({ iceServers:[{urls:'stun:stun.l.google.com:19302'}] })
      pcs.current[other] = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      pc.onicecandidate = e => {
        if (e.candidate) {
          sendEvent('iceCandidate', { to: other, from: socketId, candidate: e.candidate })
        }
      }
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendEvent('offer', { to: other, from: socketId, sdp: offer })
    }
  }, [sharers, socketId, sendEvent])

  const castVote = useCallback((which: 'A'|'B') => {
    sendEvent('newVote', { which })
  }, [sendEvent])

  // —— Render by step ——
  if (step === 'join')   return <JoinRoom onJoin={handleJoin} />
  if (step === 'role')   return <RoleSelection onSelect={handleRole} />
  if (step === 'lobby')  return <BattleLobby players={players} onStart={startRound} />
  if (step === 'share')  return (
    <div className="p-6">
      <button
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        onClick={startShare}
      >
        Start Screen Share
      </button>
    </div>
  )
  if (step === 'watch') return (
    <div className="p-6 space-y-4">
      <div className="flex space-x-2">
        {sharers.map(id => (
          <video
            key={id}
            autoPlay
            playsInline
            className="w-1/2 border"
            ref={(el) => {
              if (el) el.srcObject = streams[id] ?? null
            }}
          />
        ))}
      </div>
      <div className="space-x-4">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => castVote('A')}
        >
          Vote A
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => castVote('B')}
        >
          Vote B
        </button>
      </div>
      <p>
        Votes — A: <strong>{votes.A}</strong> | B: <strong>{votes.B}</strong>
      </p>
    </div>
  )
  return null
}

// Fisher–Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
