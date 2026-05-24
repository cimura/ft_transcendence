import { useState } from "react"
import { useNavigate } from "react-router-dom"

export function LobbyPage() {
	const navigate = useNavigate()
	const { rooms, upsertRoom, setCurrentRoom } = useLobbyStore()
	const [showModal, setShowModal] = useState(false)

	const handleJoin = (roomId: string) => {
		const room = rooms.find((r) => r.id === roomId)
		if (!room) return
		setCurrentRoom(room)
		navigate(`/room/${roomId}`)
	}

	const newRoom = {
		id: crypto.randomUUID(),
		name: dt.name,
		
		players: [{ userId: 0, username: 'me', isReady: false, isHost: true }],
		maxPlayers: dto.maxPlayers,
	}
}