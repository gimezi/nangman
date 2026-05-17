import CharacterList from './CharacterList'
import { CLASSES } from '@/models/classes'

export type Character = {
  id: string
  nickname: string
  class: string
  combat_power: number
  server?: string | null
}

export default function CharactersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">내 캐릭터</h1>
      </div>
      <CharacterList classes={CLASSES} />
    </div>
  )
}
