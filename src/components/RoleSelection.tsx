'use client'

interface Props {
  onSelect: (role: 'sharer' | 'watcher') => void
}

export default function RoleSelection({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <h2 className="text-2xl font-semibold">Choose Role</h2>
      <div className="space-x-4">
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          onClick={() => onSelect('sharer')}
        >
          Sharer
        </button>
        <button
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          onClick={() => onSelect('watcher')}
        >
          Watcher
        </button>
      </div>
    </div>
  )
}
