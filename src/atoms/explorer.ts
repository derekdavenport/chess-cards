import { atomWithQuery } from "jotai-tanstack-query";
import { Db, ExplorerData } from "../types/explorer";
import { explorerQueryFn, ExplorerQueryKey } from "../queries/explorer";
import { atom } from "jotai";
import { fenAtom, gameAtom } from "./game";
import { analysisAtom } from "./analysis";

// Stash in object to make 'mutable'. Remember to set after any changes.

export const nextMoveCpsAtom = atom<{ [uci: string]: number }>((get) => {
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

export const addMoveAtom = atom(null, (get, set, san: string) => {
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

export const dbAtom = atom<Db>('lichess')

export const movesAtom = atomWithQuery<ExplorerData, Error, ExplorerData, ExplorerQueryKey>(get => ({
	queryKey: ['explorer', get(dbAtom), get(fenAtom)],
	queryFn: explorerQueryFn,
	staleTime: Infinity,
}))