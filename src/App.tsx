import { useEffect, useState } from 'react'
import './App.css'
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard"
import type { Arrow } from "react-chessboard/dist/chessboard/types"

type Results = {
	white: number
	draws: number
	black: number
}

type Move = Results & {
	uci: string
	san: string
}

type Data = Results & {
	moves: Move[]
	opening: {
		eco: string
		name: string
	} | null
}

function App() {
	const [game] = useState(new Chess())
	const [moves, setMoves] = useState<Pick<Move, 'uci' | 'san'>[]>([])
	const [data, setData] = useState<Data | null>(null)

	const san = moves.map(move => move.san)
	const uci = moves.map(move => move.uci)
	const uciComma = uci.join(',')

	//const uciSpace = uci.join(' ')

	useEffect(() => {
		(async function go() {
			const response = await fetch(`https://explorer.lichess.ovh/masters?play=${uciComma}`)
			if (response.ok) {
				setData(await response.json())
				// game.moves()
			}
		})()
	}, [uciComma])

	const n = moves.length

	return (
		<>
			<h1 className="">Opening Explorer PoC</h1>
			<p>
				<strong>Moves:</strong> {san.map((move, i) => <>
					{i % 2 ? ' ' : ` ${i / 2 + 1}.`} <span key={i} onClick={() => {
						const nextMoves = moves.slice(0, i + 1)
						setMoves(nextMoves)
						game.reset()
						nextMoves.forEach(move => game.move(move.san))
					}} style={{ cursor: 'pointer' }}>{move}</span>
				</>)}
			</p>
			<p>
				<strong>Name:</strong> {data?.opening && `${data?.opening.eco} ${data?.opening.name}`}
			</p>
			<div className="flex">
				<div className="flex-1">
					{moves.length ? <span onClick={() => {
						const nextMoves = moves.slice(0, -1)
						setMoves(nextMoves)
						game.undo()
					}} style={{ cursor: 'pointer' }}>..</span> : undefined}
					<p>
						<strong>Next Move:</strong>
					</p>
					<ul className="list-disc list-inside">
						{data?.moves.map(move =>
							<li key={move.uci} onClick={() => {
								setMoves([...moves, move])
								game.move(move.san)
							}} style={{ cursor: 'pointer' }}>{Math.floor(n / 2) + 1}. {n % 2 ? '...' : ''}{move.san}</li>
						)}
					</ul>
				</div>
				<div className="flex-1">
					<Chessboard
						position={game.fen()} customArrows={data?.moves.map(move => move.uci.split(/(?=..$)/) as Arrow)}
						onPieceDrop={(sourceSquare, targetSquare) => {
							try {
								const result = game.move({ from: sourceSquare, to: targetSquare })
								setMoves([...moves, { uci: result.lan, san: result.san }])
								return true
							}
							catch(e) {
								return false
							}
						}}
					/>
				</div>
			</div>
		</>
	)
}

export default App
