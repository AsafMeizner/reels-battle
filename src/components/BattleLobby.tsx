'use client'

interface Props {
  players: Record<string, 'sharer' | 'watcher' | null>
  onStart: () => void
}

export default function BattleLobby({ players, onStart }: Props) {
  const sharerCount  = Object.values(players).filter(r => r === 'sharer').length
  const watcherCount = Object.values(players).filter(r => r === 'watcher').length
  const ready        = sharerCount >= 2 && watcherCount >= 1

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Lobby</h2>
      <p className="mb-4">
        Sharers: <strong>{sharerCount}</strong> | Watchers: <strong>{watcherCount}</strong>
      </p>
      <button
        className={`px-4 py-2 rounded text-white ${
          ready ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
        }`}
        onClick={onStart}
        disabled={!ready}
      >
        Start Round
      </button>
    </div>
  )
}
