'use client'

import { useState } from 'react'

interface Props {
  onJoin: (code: string) => void
}

export default function JoinRoom({ onJoin }: Props) {
  const [code, setCode] = useState('')
  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <h2 className="text-2xl font-semibold">Enter Room Code</h2>
      <input
        className="border rounded px-3 py-2 w-48 text-center uppercase"
        value={code}
        onChange={e => setCode(e.target.value)}
        maxLength={6}
        placeholder="ABC123"
      />
      <button
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        onClick={() => onJoin(code)}
        disabled={code.length < 6}
      >
        Join Room
      </button>
    </div>
  )
}
