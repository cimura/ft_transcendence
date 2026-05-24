import { useNavigate } from "react-router-dom"

export function LobbyPage() {
	const navigate = useNavigate()
	const { rooms, upsertRoom, setCurrentRoom } = useLobbyStore()
  return <div>Lobby</div>
}
