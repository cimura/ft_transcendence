import React, { useState } from 'react'
import type { CreateRoomDto } from '../../types/room'

interface Props {
  onSubmit: (dto: CreateRoomDto) => void
  onClose: () => void
}

export function CreateRoomModal({ onSubmit, onClose }: Props) {
  const [name, setName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4)

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) return
	onSubmit({ name: name.trim(), maxPlayers })
	onClose()
  }

  return (
	<div>
		<h2>create room</h2>
		<form onSubmit={handleSubmit}>
			<input
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder='room name'
				maxLength={30}
			/>
			<select
				value={maxPlayers}
				onChange={(e) => setMaxPlayers(Number(e.target.value) as 2 | 3 | 4)}
			>
				<option value={2}>2 people</option>
				<option value={3}>3 people</option>
				<option value={4}>4 people</option>
			</select>
			<button type='submit'>create</button>
			<button type='button' onClick={onClose}>cancel</button>
		</form>
	</div>
  )
}
