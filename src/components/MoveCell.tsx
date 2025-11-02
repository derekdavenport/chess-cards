import { useAtom } from "jotai"
import { gameAtom } from "../atoms/game"
import { Move } from "cm-chess"
import { getCpFromMoveComment, prettyEval } from "../util/game"

function MoveCell({ move, cp }: { move: Move, cp: number | undefined }) {
	const [{game}, setGame] = useAtom(gameAtom)
	cp = getCpFromMoveComment(move) ?? cp

	if (!move) {
		return <td></td>
	}
	if (move == game.lastMove()) {
		return (
			<td className="cursor-default">
				<div className="flex">
					<div className="flex-1 font-bold">{move.san}</div>
					<div className="flex-none">{prettyEval(cp)}</div>
				</div>
			</td>
		)
	}
	return (
		<td className="hover:bg-base-300 cursor-pointer"
			onClick={() => { 
				game.undo(move.next)
				setGame({ game })
			}}
		>
			<div className="flex">
				<div className="flex-1 font-bold">{move.san}</div>
				<div className="flex-none">{prettyEval(cp)}</div>
			</div>
		</td>
	)
}

export default MoveCell
