import { Chess, Color, Move, Promotion, Square } from "cm-chess"
import { AnalysisData } from "../types/analysis"
import { analysisQueryFn, AnalysisQueryKey } from "../queries/analysis"
import { Db, ExplorerData } from "../types/explorer"
import { explorerQueryFn, ExplorerQueryKey } from "../queries/explorer"
import { QueryClient } from "@tanstack/react-query"

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

export { uciToMove, getMoveCp, getCpDiff, diffToNag, getNextMoveCps, buildPGN }