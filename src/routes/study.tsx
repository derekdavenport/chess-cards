import { useAtom } from "jotai"
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { addMoveAtom, dbAtom, movesAtom, nextMoveCpsAtom, openingAtom } from "../atoms/explorer";
import { analysisAtom } from "../atoms/analysis";
import { uciListAtom, undoMoveAtom, fenAtom, gameAtom, sanListAtom } from "../atoms/game";
import { importPGNintoStudyAtom, studiesListAtom, studyIdAtom } from "../atoms/study";
import { buildPGN } from "../util/game";
import { Db } from "../types/explorer";
import { rateLimitAtom } from "../atoms/rateLimit";
import { RateLimitError, isRateLimitError } from "../util/rateLimit";
import { Move } from "cm-chess";
import MoveCell from "../components/MoveCell";

export const Route = createFileRoute('/study')({
  component: Study,
})

function Study() {
	const [db, setDb] = useAtom(dbAtom)
	const [sanList] = useAtom(sanListAtom)
	const [{data: moves}] = useAtom(movesAtom)
	const [, addMove] = useAtom(addMoveAtom)
	const [, undoMove] = useAtom(undoMoveAtom)
	const [fen] = useAtom(fenAtom)
	const [{data: analysis}] = useAtom(analysisAtom)
	const [nextMoveCps] = useAtom(nextMoveCpsAtom)
	const [commonMovesCount, setCommonMovesCount] = useState(5)
	const [playedPercent, setPlayedPercent] = useState(10)
	const [bestMovesCount, setBestMovesCount] = useState(2)
	const [depth, setDepth] = useState(5)
	const [myMoveMethod, setMyMoveMethod] = useState('best')
	const [{game}, setGame] = useAtom(gameAtom)
	const [pgn, setPgn] = useState<string>('')
	const [studyId, setStudyId] = useAtom(studyIdAtom)
	const [{data: studiesList}] = useAtom(studiesListAtom)
	const [{ mutate: importPGNintoStudy }] = useAtom(importPGNintoStudyAtom)
	const [rateLimit, setRateLimit] = useAtom(rateLimitAtom)
	const [{data: opening}] = useAtom(openingAtom)
	const queryClient = useQueryClient();

	useEffect(() => {
		if (moves) {
			const movesWithoutCp = moves.moves.filter(move => {
				return !(move.uci in nextMoveCps)
			})
			movesWithoutCp.forEach(move => {
			})
		}
	})
	
	// Handle rate limit error from buildPGN
	const handleRateLimit = (error: RateLimitError) => {
		const waitTime = 60 * 1000 // 60 seconds in milliseconds
		setRateLimit({
			rateLimitUntil: Date.now() + waitTime,
			lastRateLimitMessage: error.message
		})
	}
	
	console.log('studiesList', studiesList)

	const movesByTurn: [Move, Move][] = []
	for (let i = 0; i < sanList.length; i += 2) {
		movesByTurn.push([game.history()[i], game.history()[i + 1]])
	}

	return <>

	{/* Rate Limit Status */}
	{rateLimit.isRateLimited && (
		<div className="alert alert-warning mb-4">
			<div>
				<h3>Rate Limit Active</h3>
				<p>{rateLimit.lastRateLimitMessage}</p>
				<p>Please wait before making more requests.</p>
			</div>
		</div>
	)}

		{opening && <div className="text-center mb-4">{opening.eco} {opening.name}</div>}

		{game.fen()}


		<table className="table table-zebra w-full max-w-xs mx-auto">
			<colgroup>
				<col className="w-auto" />
				<col className="w-[50%]" />
				<col className="w-[50%]" />
			</colgroup>
			<tbody>
				{movesByTurn.map(([moveWhite, moveBlack], index) => {
						return <tr key={index / 2}>
							<th>{index + 1}</th>
							<MoveCell move={moveWhite} />
							<MoveCell move={moveBlack} />
						</tr>
					}
				)}
			</tbody>
		</table>

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
			<select value={db} onChange={e => setDb(e.target.value as Db)} className="select select-primary">
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

		Include Highest Average Rated, Include Most Winning (played more than some %)

		<fieldset className="fieldset w-full max-w-xs mx-auto">
			<legend className="fieldset-legend">My Move</legend>
			<select value={myMoveMethod} onChange={e => setMyMoveMethod(e.target.value)} className="select select-primary">
				<option value="best">Best Move</option>
				<option value="common">Most Common Move</option>
			</select>
		</fieldset>

		<fieldset className="fieldset w-full max-w-xs mx-auto">
			<legend className="fieldset-legend">Study</legend>
			<select value={studyId} onChange={e => setStudyId(e.target.value)} className="select select-primary">
				{studiesList ? studiesList.map(study => {
					return <option key={study.id} value={study.id}>{study.name}</option>
				}) : <option>loading...</option>}
			</select>
			<p className="">Can only import into a study. You may <a href="https://lichess.org/study">create a new study on lichess</a>.</p>
		</fieldset>

		<button onClick={async () => {
			if (!analysis) return
			try {
				const orientation = game.lastMove()!.color === 'w' ? 'white' : 'black'
				const pgn = await buildPGN(queryClient, game, analysis, db, depth, commonMovesCount, playedPercent, bestMovesCount, myMoveMethod)
				if (pgn) {
					setPgn(pgn)
					setGame({ game })
					importPGNintoStudy({ pgn, orientation })
				}
			} catch (error) {
				// Handle rate limit error
				if (isRateLimitError(error)) {
					handleRateLimit(error)
				} else {
					console.error('Error building PGN:', error)
				}
			}
		}} disabled={rateLimit.isRateLimited} className="btn btn-primary m-4">
		</button>

		<textarea value={pgn} readOnly className="textarea" />
	</>
}
