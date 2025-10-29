import { AddMove, Chess, Color, Move, Promotion, Square } from "cm-chess"
import { Fen } from 'cm-chess/src/Fen.js'
import { AnalysisData } from "../types/analysis"
import { analysisQueryFn, AnalysisQueryKey } from "../queries/analysis"
import { Db, ExplorerData, LiMove } from "../types/explorer"
import { explorerQueryFn, ExplorerQueryKey } from "../queries/explorer"
import { QueryClient } from "@tanstack/react-query"

function uciToMove(uci: string, game: Chess, lastMove: Move): AddMove {
	const move: AddMove = { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci.length > 4 ? uci[4] as Promotion : undefined }
	// cm-chess wants king to move 2 squares for castles, but lichess shows it moving to corner
	if (game.piece(move.from, lastMove)?.type == 'k') {
		if (uci == 'e1a1') {
			move.to = 'c1'
		}
		else if (uci == 'e1h1') {
			move.to = 'g1'
		}
		else if (uci == 'e8a8') {
			move.to = 'c8'
		}
		else if (uci == 'e8h8') {
			move.to = 'g8'
		}
	}
	return move
}

function getCpFromMoveComment({ commentMove }: Move): number | undefined {
	if (!commentMove) return
	const ceMatch = commentMove.match(/\[%ce (\d+)\]/)
	if (!ceMatch) return
	return parseFloat(ceMatch[1])
}

function getCpDiff(move: Move, cp: number): number | undefined {
	const moveCp = getCpFromMoveComment(move)
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

function getMoveCps(analysisData: AnalysisData) {
	if ('error' in analysisData) return []
	const nextMoveCps = analysisData.pvs.sort((a, b) => a.cp - b.cp).map(({ moves, cp }) => {
		const uci = moves.split(' ')[0]
		return { uci, cp }
	})
	// if white to play, best moves are the highest cp
	const fen = new Fen(analysisData.fen)
	if (fen.colorToPlay === 'w') {
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
	db: Db,
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
			// TODO: if 429 need to wait 1 minute before resuming
			return
		}
		// return here in case an error happened in another call while awaiting
		if (cancelled) return

		const nextMoveCps = getMoveCps(analysisData)

		let nextMoveUcis: string[]
		// my turn
		if (lastMove.color !== myColor) {
			let uci: string
			if (myMoveMethod === 'best' && nextMoveCps.length) {
				({ uci } = nextMoveCps[0])
			}
			else if (explorerData.moves.length) {
				({ uci } = explorerData.moves[0])
			}
			else {
				// didn't find any moves
				return
			}
			nextMoveUcis = [uci]
		}
		// their turn
		else {
			const commonMovesPlayedEnough = getCommonMovesPlayedEnough(explorerData, variationsCount, playedPercent)
			const bestMovesNotInPlayedMoves = getBestMovesNotInPlayedMoves(nextMoveCps, bestMovesCount, commonMovesPlayedEnough)
			nextMoveUcis = commonMovesPlayedEnough.map(m => m.uci).concat(bestMovesNotInPlayedMoves.map(m => m.uci))
		}

		const uciToCp = getUciToCpMap(nextMoveCps)
		for (const uci of nextMoveUcis) {
			const addedMove = game.move(uciToMove(uci, game, lastMove), lastMove)
			if (addedMove === null) {
				throw new Error(uci + ' was not a legal move at ' + game.fen())
			}
			let cp: number | undefined = uciToCp[uci]
			if (cp === undefined) {
				cp = await fetchMoveCp(queryClient, addedMove)
			}
			// estimate CP?
			tagMove(cp, addedMove, lastMove)

			await addMoves(addedMove, depth + 1)
		}
	}

	const lastMove = game.lastMove()
	if (!lastMove) return null
	// I made the last move
	const myColor = lastMove.color
	if (!('error' in analysis) && analysis.pvs.length) {
		const nextMoveCps = getMoveCps(analysis)
		const cp = nextMoveCps[0].cp
		lastMove.commentMove = `[%ce ${cp}][%eval ${(cp / 100).toFixed(2)}]`
	}
	// [ECO "A40"]
	// [Opening "Englund Gambit: Main Line"]
	// [StudyName "Englund"]
	await addMoves(lastMove, 0)

	const pgn = game.pgn.render()
	// nags are before moves???
	return pgn.replace(/(?<!\{[^}]*?)(\$\d+)(\s+)(\S+)/g, '$3$2$1')

}

export { uciToMove, getCpFromMoveComment as getMoveCp, getCpDiff, diffToNag, getMoveCps as getNextMoveCps, buildPGN }

function tagMove(cp: number | undefined, addedMove: Move, lastMove: Move) {
	if (cp === undefined) return
	addedMove.commentMove = `[%ce ${cp}][%eval ${(cp / 100).toFixed(2)}]`
	addedMove.nag = diffToNag(getCpDiff(lastMove, cp))
}

function getUciToCpMap(nextMoveCps: { uci: string; cp: number }[]) {
	return nextMoveCps.reduce((map, { uci, cp }) => {
		map[uci] = cp
		return map
	}, {} as { [uci: string]: number} )
}

async function fetchMoveCp(queryClient: QueryClient, addedMove: Move): Promise<number | undefined> {
	const analysisData = await queryClient.fetchQuery<AnalysisData, Error, AnalysisData, AnalysisQueryKey>({ queryKey: ['analysis', addedMove.fen], queryFn: analysisQueryFn })
	if (!('error' in analysisData) && analysisData.pvs.length) {
		const nextMoveCps = getMoveCps(analysisData)
		return nextMoveCps[0].cp
	}
}

function getBestMovesNotInPlayedMoves(nextMoveCps: { uci: string; cp: number }[], bestMovesCount: number, commonMovesPlayedEnough: LiMove[]) {
	return nextMoveCps.slice(0, bestMovesCount).filter(({ uci }) => {
		return commonMovesPlayedEnough.findIndex(({ uci: playedUci }) => playedUci === uci) === -1
	})
}

function getCommonMovesPlayedEnough(explorerData: ExplorerData, variationsCount: number, playedPercent: number) {
	const totalGames = explorerData.white + explorerData.draws + explorerData.black
	return explorerData.moves.slice(0, variationsCount).filter(move => {
		const moveTotalGames = move.white + move.draws + move.black
		const movePlayedPercent = moveTotalGames / totalGames * 100
		return movePlayedPercent >= playedPercent
	})
}
