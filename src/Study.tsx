import { atom, ExtractAtomValue, useAtom } from "jotai"
import { atomWithQuery } from "jotai-tanstack-query"
import { Chess, FEN, Event, Square, Move, Promotion } from "cm-chess";
import { useState } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

interface PositionStats {
	white: number,
	draws: number,
	black: number,
}
interface ExplorerData extends PositionStats {
	moves: LiMove[],
	recentGames: Game[],
	topGames: Game[]
	opening: Opening | null,
}
interface Opening {
	eco: string,
	name: string
}
interface LiMove extends PositionStats {
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
//const uciListAtom = atom<string[]>([])
const uciAtom = atom(get => get(uciListAtom).join(','))
type ExplorerQueryKey = ['explorer', ExtractAtomValue<typeof dbAtom>, ExtractAtomValue<typeof uciAtom>]
async function explorerQueryFn({ queryKey: [, db, fen] }: { queryKey: ExplorerQueryKey }): Promise<ExplorerData> {
	const params = new URLSearchParams({ fen })
	const res = await fetch(`https://explorer.lichess.ovh/${db}?${params}`)
	return res.json()
}
const movesAtom = atomWithQuery<ExplorerData, Error, ExplorerData, ExplorerQueryKey>(get => ({
	queryKey: ['explorer', get(dbAtom), get(fenAtom)],
	queryFn: explorerQueryFn,
	staleTime: Infinity,
}))

interface Pv {
	moves: string,
	cp: number,
}
interface AnalysisData {
	fen: string,
	knodes: number,
	depth: number,
	pvs: Pv[],
}
type AnalysisQueryKey = ['analysis', ExtractAtomValue<typeof fenAtom>]
async function analysisQueryFn({ queryKey: [, fen] }: { queryKey: AnalysisQueryKey }): Promise<AnalysisData> {
	const params = new URLSearchParams({
		fen,
		multiPv: '5',
	})
	const res = await fetch(`https://lichess.org/api/cloud-eval?${params}`)
	return res.json()
}
const analysisAtom = atomWithQuery<AnalysisData, Error, AnalysisData, AnalysisQueryKey>(get => ({
	queryKey: ['analysis', get(fenAtom)],
	queryFn: analysisQueryFn,
	staleTime: Infinity,
}))

const nextMoveEvalsAtom = atom<{ [uci: string]: number }>((get) => {
	const analysis = get(analysisAtom).data
	if (!analysis) return {}
	return analysis.pvs.reduce((evals, pv) => {
		const uci = pv.moves.split(' ')[0]
		return {
			...evals,
			[uci]: pv.cp / 100
		}
	}, {})
})

// const game = new Chess()
// Stash in object to make 'mutable'. Remember to set after any changes.
const gameAtom = atom<{ game: Chess }>({ game: new Chess() })
// const gameSignalAtom = atom<Event>({ type: 'initialized', fen: game.fen() })
// gameSignalAtom.onMount = set => game.addObserver((event) => {
// 	set(event)
// 	console.log('game event', event)
// })

//const gameAtom = atom(() => ({ game, lastMove: game.lastMove() })) //{ fen: FEN.start })
const fenAtom = atom<string>(get => get(gameAtom).game.fen())

const uciListAtom = atom<string[]>(get => get(gameAtom).game.history().map(move => move.uci))



const addMoveAtom = atom(null, (get, set, san: string) => {
	const { game } = get(gameAtom)
	const move = game.move(san)
	set(gameAtom, { game })
	// console.log('added move', san, move, game.fen())
})

const undoMoveAtom = atom(null, (get, set) => {
	const { game } = get(gameAtom)
	game.undo()
	set(gameAtom, { game })
})

function uciToMove(uci: string) {
	return { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci.length > 4 ? uci[4] as Promotion : undefined }
}

async function buildPGN(queryClient: QueryClient, game: Chess, db: DB, maxDepth: number, variationsCount: number, playedPercent: number, bestMovesCount: number): Promise<string> {
	//game.history().map(move => move.uci).join

	async function addMoves(fen: string, db: DB, depth: number) {
		if (depth > maxDepth) return
		const explorerDataPromise = queryClient.fetchQuery<ExplorerData, Error, ExplorerData, ExplorerQueryKey>({ queryKey: ['explorer', db, fen], queryFn: explorerQueryFn })
		//, () => fetch(`https://explorer.lichess.ovh/${db}?fen=${encodeURIComponent(game.fen())}`))
		const analysisDataPromise = queryClient.fetchQuery<AnalysisData, Error, AnalysisData, AnalysisQueryKey>({ queryKey: ['analysis', fen], queryFn: analysisQueryFn })
		//const analysisResponsePromise = fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(game.fen())}&multiPv=5`)

		const explorerData = await explorerDataPromise
		const analysisData = await analysisDataPromise
		// get just the evals
		const nextMoveEvals = analysisData.pvs.sort((a, b) => a.cp - b.cp).map(({ moves, cp }) => {
			const uci = moves.split(' ')[0]
			return {
				uci,
				cp,
			}
		}).slice(0, bestMovesCount)
		// if it's white's turn, best moves are the highest cp
		if (game.turn() === 'w') {
			nextMoveEvals.reverse()
		}
		
		const lastMove = game.lastMove() ?? undefined //game.history().length ? game.history()[game.history().length - 1] : undefined
		const totalGames = explorerData.white + explorerData.draws + explorerData.black
		const commonMovesPlayedEnough = explorerData.moves.slice(0, variationsCount).filter(move => {
			const moveTotalGames = move.white + move.draws + move.black
			const movePlayedPercent = moveTotalGames / totalGames * 100
			return movePlayedPercent >= playedPercent
		})
		commonMovesPlayedEnough.forEach(({ uci }) => {
			game.move(uciToMove(uci), lastMove)
		})
		nextMoveEvals.forEach(({ uci, cp }) => {
			// if we haven't added this move
			if (lastMove?.variations.findIndex(([move]) => move.uci === uci) !== -1) {
				game.move(uciToMove(uci), lastMove)
			}
		})
		return
		//addMoves(game.fen(), db, depth + 1)

	}

	addMoves(game.fen(), db, 0)

	return game.pgn.render()
	
}

function Study() {
	const [db, setDb] = useAtom(dbAtom)
	const [uciList] = useAtom(uciListAtom)
	const [{data: moves}] = useAtom(movesAtom)
	const [, addMove] = useAtom(addMoveAtom)
	const [, undoMove] = useAtom(undoMoveAtom)
	const [fen] = useAtom(fenAtom)
	const [{data: analysis, isPending}] = useAtom(analysisAtom)
	const [nextMoveEvals] = useAtom(nextMoveEvalsAtom)
	const [commonMovesCount, setCommonMovesCount] = useState(2);
	const [playedPercent, setPlayedPercent] = useState(25);
	const [bestMovesCount, setBestMovesCount] = useState(1);
	const [depth, setDepth] = useState(5);
	const [{game}] = useAtom(gameAtom);

	const queryClient = useQueryClient();

	return <>
	{fen}<br />


		Starting Position
		{uciList.join(' ')}

		<ol>
			<li key="start" className="my-2">
				<button onClick={() => {

				}} className="btn btn-sm btn-outline">
					Start Position
				</button>
			</li>
			<li className="my-2">
				<button onClick={() => undoMove()} className="btn btn-sm btn-outline">
					Undo Last Move
				</button>
			</li>
			{moves && moves.moves.map((move) => (
				<li key={move.uci} className="my-2">
					<button onClick={() => { console.log(move); addMove(move.san) }}
					className="btn btn-sm btn-outline">
						{move.san} {move.opening && `${move.opening.eco} ${move.opening.name}`} (W:{move.white} D:{move.draws} B:{move.black})
						{move.uci in nextMoveEvals && ` Eval: ${nextMoveEvals[move.uci].toFixed(2)}`}
					</button>
				</li>
			))}
		</ol>

		Add moves
		<fieldset className="fieldset  w-full max-w-xs mx-auto">
			<legend className="fieldset-legend">Database Moves</legend>

			<label className="label">Database</label>
			<select value={db} onChange={e => setDb(e.target.value as DB)} className="select select-primary">
				<option value="masters">Masters</option>
				<option value="lichess">Lichess</option>
				<option value="player">Player</option>
			</select>

			<label className="label">Variations</label>
			<input
				type="number"
				className="input validator"
				required
				placeholder="Type a number between 1 to 10"
				min="0"
				max="10"
				title="Must be between be 0 to 10"
				value={commonMovesCount}
				onChange={e => setCommonMovesCount(Number(e.target.value))}
			/>
			<p className="validator-hint">Must be between be 0 to 10</p>

			<label className="label">Exclude Moves Played Less Than</label>
			<div className="tooltip tooltip-bottom" data-tip={`${playedPercent}%`}>
				<input type="range" min={0} max={50} value={playedPercent} className="range range-primary" onChange={e => setPlayedPercent(Number(e.target.value))} />
			</div>
			{/* <input
				type="number"
				className="input validator"
				required
				placeholder="Type a number between 0 to 50"
				min="0"
				max="50"
				title="Must be between be 0 to 50"
				value={playedPercent}
				onChange={e => setPlayedPercent(Number(e.target.value))}
			/> */}

			<label className="label">Depth</label>
			<input type="range" min={1} max="10" value={depth} className="range range-primary" onChange={e => setDepth(Number(e.target.value))} />
		</fieldset>


		<fieldset className="fieldset w-full max-w-xs mx-auto">
			<legend className="fieldset-legend">Include Best Moves</legend>
			<input
				type="number"
				className="input validator"
				required
				placeholder="Type a number between 1 to 10"
				min="0"
				max="5"
				title="Must be between be 0 to 5"
				value={bestMovesCount}
				onChange={e => setBestMovesCount(Number(e.target.value))}
			/>
			<p className="validator-hint">Must be between be 0 to 5</p>
		</fieldset>

		<fieldset className="fieldset w-full max-w-xs mx-auto">
			<legend className="fieldset-legend">My Move</legend>
			<select className="select select-primary">
				<option value="">Best Move</option>
				<option value="">Most Common Move</option>
			</select>
		</fieldset>

		<button onClick={() => buildPGN(queryClient, game, db, depth, commonMovesCount, playedPercent, bestMovesCount)}>Go</button>
	</>
}

export default Study