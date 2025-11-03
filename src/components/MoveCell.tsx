import { useAtom } from "jotai"
import { gameAtom } from "../atoms/game"
import { Move } from "cm-chess"
import { getCpFromMoveComment, prettyEval } from "../util/game"
import { nextMoveCpsAtom } from "../atoms/explorer"

function MoveCell({ move }: { move?: Move }) {
	const [{game}, setGame] = useAtom(gameAtom)
	const [nextMoveCps] = useAtom(nextMoveCpsAtom)

	if (!move) {
		return <td></td>
	}

	const cp = getCpFromMoveComment(move) ?? nextMoveCps[move.uci]

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