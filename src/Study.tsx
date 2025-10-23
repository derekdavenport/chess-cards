import { atom, useAtom } from "jotai"
import { atomWithQuery } from "jotai-tanstack-query"

interface PositionStats {
	white: number,
	draws: number,
	black: number,
}
interface ExplorerResponse extends PositionStats {
	moves: Move[],
	recentGames: Game[],
	topGames: Game[]
	opening: Opening | null,
}
interface Opening {
	eco: string,
	name: string
}
interface Move extends PositionStats {
	uci: string,
	san: string,
	averageRating: number,
	game: string | null,
	opening: Opening | null,
}
interface Game {
	uci: string,
	id: string,
	winner: 'white' | "black" | null,
	speed: "ultraBullet" | "bullet" | "blitz" | "rapid" | "classical" | "correspondence",
	mode: "rated" | 'casual',
	black: Player,
	white: Player,
	year: number,
	month: string,
}
interface Player {
	name: string,
	rating: number,
}

type DB = 'masters' | 'lichess' | 'player'
const dbAtom = atom<DB>('masters')
const uciListAtom = atom<string[]>([])
const uciAtom = atom((get) => get(uciListAtom).join(','))
const movesAtom = atomWithQuery((get) => ({
  queryKey: ['explorer', get(dbAtom), get(uciAtom)],
  queryFn: async ({ queryKey: [, db, uci] }) => {
    const res = await fetch(`https://explorer.lichess.ovh/${db}?play=${uci}`)
    return res.json() as Promise<ExplorerResponse>
  },
}))

function Study() {
	const [db, setDb] = useAtom(dbAtom)
	const [uciList, setUciList] = useAtom(uciListAtom)
	const [{data: moves}] = useAtom(movesAtom)

	

	return <>
		<select value={db} onChange={e => setDb(e.target.value as DB)} className="select select-primary">
			<option value="masters">Masters</option>
			<option value="lichess">Lichess</option>
			<option value="player">Player</option>
		</select>

		{uciList.join(' ')}

		<ol>
			<li key="start" className="my-2">
				<button onClick={() => {
					setUciList([])
				}} className="btn btn-sm btn-outline">
					Start Position
				</button>
			</li>
			<li className="my-2">
				<button onClick={() => {
					setUciList(uciList.slice(0, -1))
				}} className="btn btn-sm btn-outline">
					Undo Last Move
				</button>
			</li>
			{moves && moves.moves.map((move) => (
				<li key={move.uci} className="my-2">
					<button onClick={() => {
						setUciList([...uciList, move.uci])
					}} className="btn btn-sm btn-outline">
						{move.san} {move.opening && `${move.opening.eco} ${move.opening.name}`} (W:{move.white} D:{move.draws} B:{move.black})
					</button>
				</li>
			))}
		</ol>
	</>
}

export default Study