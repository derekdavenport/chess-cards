import { atom, ExtractAtomValue, useAtom } from "jotai"
import { atomWithQuery } from "jotai-tanstack-query"
import { Chess, FEN, Event, Square, Move, Promotion, Color } from "cm-chess";
import { useContext, useState } from "react";
import { QueryClient, QueryFunction, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AuthContext, IAuthContext } from "react-oauth2-code-pkce";
import { tokenAtom } from "../auth";

export const Route = createFileRoute('/study')({
  component: Study,
})

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

const dbAtom = atom<DB>('lichess')
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
type AnalysisData = {
	fen: string,
	knodes: number,
	depth: number,
	pvs: Pv[],
} | {
	error: string
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

// https://lichess.org/api/account

const usernameAtom = atom('heyf00L')
type ListStudiesQueryKey = ['study', ExtractAtomValue<typeof usernameAtom>, ExtractAtomValue<typeof tokenAtom>]
type StudiesList = {
    id: string,
    name: string,
    createdAt: number,
    updatedAt: number,
}[]
const listStudiesQueryFn: QueryFunction<StudiesList, ListStudiesQueryKey> = async ({ queryKey: [, username, token] }) => {
	const res = await fetch(`https://lichess.org/api/study/by/${username}`, {
		headers: {
			'Authorization': `Bearer ${token}`,
		},
	})
	const body = await res.text()
	const studies: StudiesList = []
	const lines = body.split('\n')
	for (const line of lines) {
		if (line) studies.push(JSON.parse(line))
	}
	return studies
}
const studiesListAtom = atomWithQuery<StudiesList, Error, StudiesList, ListStudiesQueryKey>(get => ({
	queryKey: ['study', get(usernameAtom), get(tokenAtom)],
	queryFn: listStudiesQueryFn,
	staleTime: 1000 * 60 * 1,
}))

const nextMoveCpsAtom = atom<{ [uci: string]: number }>((get) => {
	const analysis = get(analysisAtom).data
	if (!analysis || 'error' in analysis) return {}
	return analysis.pvs.reduce((evals, pv) => {
		const uci = pv.moves.split(' ')[0]
		return {
			...evals,
			[uci]: pv.cp,
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
	const nextMoveCps = get(nextMoveCpsAtom)
	const cp = nextMoveCps[move!.uci]
	if (cp) {
		move!.commentMove = `[%ce ${cp}][%eval ${(cp / 100).toFixed(2)}]`
	}
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

function getMoveCp({ commentMove }: Move): number | undefined {
	if (!commentMove) return
	const ceMatch = commentMove.match(/\[%ce (\d+)\]/)
	if (!ceMatch) return
	return parseFloat(ceMatch[1])
}

function getCpDiff(move: Move, cp: number): number | undefined {
	const moveCp = getMoveCp(move)
	if (moveCp === undefined) return
	return move.color == 'w' ? cp - moveCp : moveCp - cp
}

function diffToNag(cpDiff: number | undefined): string | undefined {
	if (cpDiff === undefined) return
	if (cpDiff >= 100) {
		return '2' // inaccuracy
	}
	if (cpDiff >= 300) {
		return '4' // mistake
	}
}

function getNextMoveCps(analysisData: AnalysisData, lastColor: Color) {
	if ('error' in analysisData) return []
	const nextMoveCps = analysisData.pvs.sort((a, b) => a.cp - b.cp).map(({ moves, cp }) => {
		const uci = moves.split(' ')[0]
		return { uci, cp }
	})
	// if previous turn was black (now it's white's turn), best moves are the highest cp
	if (lastColor === 'b') {
		nextMoveCps.reverse()
	}
	return nextMoveCps
}

/**
 * Some considerations. Lichess says to make only one api call at a time.
 * Also better to keep this somewhat syncronous so the moves are added in the right order.
 * @param queryClient 
 * @param game 
 * @param db 
 * @param maxDepth 
 * @param variationsCount 
 * @param playedPercent 
 * @param bestMovesCount 
 * @returns 
 */
async function buildPGN(
	queryClient: QueryClient,
	game: Chess,
	analysis: AnalysisData,
	db: DB,
	maxDepth: number,
	variationsCount: number,
	playedPercent: number,
	bestMovesCount: number,
	myMoveMethod: string
): Promise<string | null> {
	let cancelled = false
	async function addMoves(lastMove: Move, depth: number): Promise<void> {
		if (cancelled || depth > maxDepth) return

		const explorerDataPromise = queryClient.fetchQuery<ExplorerData, Error, ExplorerData, ExplorerQueryKey>({ queryKey: ['explorer', db, lastMove.fen], queryFn: explorerQueryFn })
		const analysisDataPromise = queryClient.fetchQuery<AnalysisData, Error, AnalysisData, AnalysisQueryKey>({ queryKey: ['analysis', lastMove.fen], queryFn: analysisQueryFn })
		let explorerData: ExplorerData, analysisData: AnalysisData
		try {
			explorerData = await explorerDataPromise
			analysisData = await analysisDataPromise
		} catch (error) {
			cancelled = true
			// if 429 need to wait 1 minute before resuming
			return
		}
		// return here in case an error happened in another call while awaiting
		if (cancelled) return
		
		const nextMoveCps = getNextMoveCps(analysisData, lastMove.color)
		const uciToCp = nextMoveCps.reduce((map, { uci, cp }) => {
			map[uci] = cp
			return map
		}, {} as { [uci: string]: number })

		// if the last move wasn't me, then it's my turn
		// So just do the best move (or if not available, most common)
		if (lastMove.color !== myColor) {
			let uci: string, cp: number | undefined
			if (myMoveMethod === 'best' && nextMoveCps.length) {
				({ uci, cp } = nextMoveCps[0])
			}
			else {
				({ uci } = explorerData.moves[0])
				cp = uciToCp[uci]
			}
			const addedMove = game.move(uciToMove(uci), lastMove)
			if (cp !== undefined) {
				addedMove!.commentMove = `[%ce ${cp}][%eval ${(cp / 100).toFixed(2)}]`
				addedMove!.nag = diffToNag(getCpDiff(lastMove, cp))
			}
			return await addMoves(addedMove!, depth + 1)
		}

		const totalGames = explorerData.white + explorerData.draws + explorerData.black
		const commonMovesPlayedEnough = explorerData.moves.slice(0, variationsCount).filter(move => {
			const moveTotalGames = move.white + move.draws + move.black
			const movePlayedPercent = moveTotalGames / totalGames * 100
			return movePlayedPercent >= playedPercent
		})
		const bestMovesNotInPlayedMoves = nextMoveCps.slice(0, bestMovesCount).filter(({ uci }) => {
			return commonMovesPlayedEnough.findIndex(({ uci: playedUci }) => playedUci === uci) === -1
		})
		const nextMoveUcis = commonMovesPlayedEnough.map(m => m.uci).concat(bestMovesNotInPlayedMoves.map(m => m.uci))

		for (const uci of nextMoveUcis) {
			const move = uciToMove(uci)
			const addedMove = game.move(move, lastMove)
			let comment: string | undefined, nag: string | undefined
			let cp = uciToCp[uci]
			if (cp === undefined) {
				// see if we can look up this position directly
				const analysisData = await queryClient.fetchQuery<AnalysisData, Error, AnalysisData, AnalysisQueryKey>({ queryKey: ['analysis', addedMove!.fen], queryFn: analysisQueryFn })
				if (!('error' in analysisData) && analysisData.pvs.length) {
					const nextMoveCps = getNextMoveCps(analysisData, lastMove.color)
					cp = nextMoveCps[0].cp
				}
			}
			if (cp !== undefined) {
				comment = `[%ce ${cp}][%eval ${(cp / 100).toFixed(2)}]`
				const cpDiff = getCpDiff(lastMove, cp)
				nag = diffToNag(cpDiff)
			}
			// we have evaluations, but this move wasn't in it.
			else if (nextMoveCps.length) {
				const cpEstimate = nextMoveCps[nextMoveCps.length - 1].cp
				const cpDiff = getCpDiff(lastMove, cpEstimate)
				nag = diffToNag(cpDiff)
			}
			addedMove!.commentMove = comment
			addedMove!.nag = nag
			await addMoves(addedMove!, depth + 1)
		}
	}

	const lastMove = game.lastMove()
	if (!lastMove) return null
	// I made the last move
	const myColor = lastMove.color
	if (!('error' in analysis) && analysis.pvs.length) {
		const nextMoveCps = getNextMoveCps(analysis, lastMove.color)
		const cp = nextMoveCps[0].cp
		lastMove.commentMove = `[%ce ${cp}][%eval ${(cp / 100).toFixed(2)}]`
	}
	await addMoves(lastMove, 0)

	const pgn = game.pgn.render()
	// nags are before moves???
	return pgn.replace(/(?<!\{[^}]*?)(\$\d+)(\s+)(\w+)/g, '$3$2$1')
	
}

function Study() {
	const [db, setDb] = useAtom(dbAtom)
	const [uciList] = useAtom(uciListAtom)
	const [{data: moves}] = useAtom(movesAtom)
	const [, addMove] = useAtom(addMoveAtom)
	const [, undoMove] = useAtom(undoMoveAtom)
	const [fen] = useAtom(fenAtom)
	const [{data: analysis, isPending}] = useAtom(analysisAtom)
	const [nextMoveCps] = useAtom(nextMoveCpsAtom)
	const [commonMovesCount, setCommonMovesCount] = useState(5)
	const [playedPercent, setPlayedPercent] = useState(10)
	const [bestMovesCount, setBestMovesCount] = useState(2)
	const [depth, setDepth] = useState(5)
	const [myMoveMethod, setMyMoveMethod] = useState('best')
	const [{game}, setGame] = useAtom(gameAtom)
	const [pgn, setPgn] = useState<string>('')
	const { tokenData, token, logIn, logOut, idToken, error }: IAuthContext = useContext(AuthContext)
	const [{data: studiesList}] = useAtom(studiesListAtom)
	const queryClient = useQueryClient();
	console.log('studiesList', studiesList)

	return <>
	<p>{studiesList && studiesList.map(study => {
		return <div key={study.id}>{study.name}</div>
	})}</p>
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
					<button onClick={() => { addMove(move.san) }}
					className="btn btn-sm btn-outline">
						{move.san} {move.opening && `${move.opening.eco} ${move.opening.name}`} (W:{move.white} D:{move.draws} B:{move.black})
						{move.uci in nextMoveCps && ` Eval: ${(nextMoveCps[move.uci] / 100).toFixed(2)}`}
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
				min='0'
				max='10'
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
				min='0'
				max='50'
				title="Must be between be 0 to 50"
				value={playedPercent}
				onChange={e => setPlayedPercent(Number(e.target.value))}
			/> */}

			<label className="label">Depth</label>
			<div className="tooltip tooltip-bottom" data-tip={`${depth}`}>
				<input type="range" min={1} max={9} step={2} value={depth} className="range range-primary" onChange={e => setDepth(Number(e.target.value))} />
			</div>
		</fieldset>


		<fieldset className="fieldset w-full max-w-xs mx-auto">
			<legend className="fieldset-legend">Include Best Moves</legend>
			<input
				type="number"
				className="input validator"
				required
				placeholder="Type a number between 1 to 10"
				min='0'
				max='5'
				title="Must be between be 0 to 5"
				value={bestMovesCount}
				onChange={e => setBestMovesCount(Number(e.target.value))}
			/>
			<p className="validator-hint">Must be between be 0 to 5</p>
		</fieldset>

		<fieldset className="fieldset w-full max-w-xs mx-auto">
			<legend className="fieldset-legend">My Move</legend>
			<select value={myMoveMethod} onChange={e => setMyMoveMethod(e.target.value)} className="select select-primary">
				<option value="best">Best Move</option>
				<option value="common">Most Common Move</option>
			</select>
		</fieldset>

		<button onClick={async () => {
			if (!analysis) return
			const pgn = await buildPGN(queryClient, game, analysis, db, depth, commonMovesCount, playedPercent, bestMovesCount, myMoveMethod)
			if (pgn) setPgn(pgn)
			setGame({ game })
		}}>Go</button>

		<textarea value={pgn} readOnly className="textarea" />
	</>
}
