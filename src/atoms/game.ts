import { Chess } from "cm-chess";
import { atom } from "jotai";

export const gameAtom = atom<{ game: Chess }>({ game: new Chess() })
export const fenAtom = atom<string>(get => get(gameAtom).game.fen())
// this will only show the main line, but might not be what we're currently looking at
export const uciListAtom = atom<string[]>(get => get(gameAtom).game.history().map(move => move.uci))
export const uciAtom = atom(get => get(uciListAtom).join(','))

export const sanListAtom = atom<string[]>(get => get(gameAtom).game.history().map(move => move.san))

export const undoMoveAtom = atom(null, (get, set) => {
	const { game } = get(gameAtom)
	game.undo()
	set(gameAtom, { game })
})

// export const turnAtom = atom(get => get(gameAtom).game.turn() === 'w' ? 'white' : 'black')
// export const lastMove = atom(get => get(gameAtom).game.turn() === 'w' ? 'white' : 'black')