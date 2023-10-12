import { useEffect, useState } from 'react'
import './App.css'
import { Chess, type Move } from "chess.js";
import { Chessboard } from "react-chessboard"
import type { Arrow, CustomSquareStyles, Square } from "react-chessboard/dist/chessboard/types"

type Results = {
	white: number
	draws: number
	black: number
}

type BookMove = Results & {
	uci: string
	san: string
}

type Data = Results & {
	moves: BookMove[]
	opening: {
		eco: string
		name: string
	} | null
}

const captureBG = 'radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 80%, rgba(20,85,30,0.3) 80%'
const moveBG = 'radial-gradient(circle, rgba(20,85,30,0.3) 0%, rgba(20,85,30,0.3) 20%, rgba(0,0,0,0) 20%'

function App() {
	const [game] = useState(new Chess())
	const [moves, setMoves] = useState<Pick<BookMove, 'uci' | 'san'>[]>([])
	const [data, setData] = useState<Data | null>(null)

	const san = moves.map(move => move.san)
	const uci = moves.map(move => move.uci)
	const uciComma = uci.join(',')

	//const uciSpace = uci.join(' ')

	useEffect(() => {
		(async function go() {
			const response = await fetch(`https://explorer.lichess.ovh/masters?play=${uciComma}`)
			if (response.ok) {
				const data = await response.json() as Data
				setData(data)
				setCustomArrows(data.moves.map(move => move.uci.split(/(?=..$)/) as Arrow))
				// game.moves()
			}
		})()
	}, [uciComma])

	const n = moves.length

	const [selectedSquare, setSelectedSquare] = useState<Square>()
	const [legalMoves, setLegalMoves] = useState<Move[]>([])
	const [legalSquare, setLegalSquare] = useState<Square | undefined>()
	const [customArrows, setCustomArrows] = useState<Arrow[] | undefined>()
	const customSquareStyles: CustomSquareStyles = {}
	// 	...legalMoves.reduce((styles, square) => {
	// 		styles[square] = { background: 'radial-gradient(circle, rgba(20,85,30,0.3) 0%, rgba(20,85,30,0.3) 20%, rgba(0,0,0,0) 20%' }
	// 		return styles
	// 	}, ({} as CustomSquareStyles)),
	// }
	if (selectedSquare) {
		customSquareStyles[selectedSquare] = { background: 'rgba(20,85,30,.5)' }
	}
	// show previous move
	if (moves.length) {
		customSquareStyles[moves[moves.length - 1].uci.slice(0, 2) as Square] = { background: 'rgba(155,199,0,.41)' }
		customSquareStyles[moves[moves.length - 1].uci.slice(2) as Square] = { background: 'rgba(155,199,0,.41)' }
	}
	for (const legalMove of legalMoves) {
		// console.log('legalMove', legalMove)
		customSquareStyles[legalMove.to] = { background: legalMove.captured ? captureBG : moveBG }
	}
	if (legalSquare) {
		customSquareStyles[legalSquare] = { background: 'rgba(20,85,30,0.3)' }
	}

	return (
		<>
			<h1 className="text-xl">Opening Explorer PoC</h1>
			<p>
				<strong>Moves:</strong> {san.map((move, i) => <>
					{i % 2 ? ' ' : ` ${i / 2 + 1}.`} <span key={i} onClick={() => {
						const nextMoves = moves.slice(0, i + 1)
						setMoves(nextMoves)
						setSelectedSquare(undefined)
						setLegalMoves([])
						game.reset()
						nextMoves.forEach(move => game.move(move.san))
					}} style={{ cursor: 'pointer' }}>{move}</span>
				</>)}
			</p>
			<p>
				<strong>Name:</strong> {data?.opening && `${data?.opening.eco} ${data?.opening.name}`}
			</p>
			<div className="flex flex-row">
				<div className="basis-1/4 md:basis-1/2">
					{moves.length ? <span onClick={() => {
						const nextMoves = moves.slice(0, -1)
						setMoves(nextMoves)
						setSelectedSquare(undefined)
						game.undo()
					}} style={{ cursor: 'pointer' }}>..</span> : undefined}
					<p>
						<strong>Next Move:</strong>
					</p>
					<ul className="list-disc list-inside">
						{data?.moves.map(move =>
							<li key={move.uci} onClick={() => {
								setMoves([...moves, move])
								setSelectedSquare(undefined)
								setLegalMoves([])
								game.move(move.san)
							}} style={{ cursor: 'pointer' }}>{Math.floor(n / 2) + 1}. {n % 2 ? '...' : ''}{move.san}</li>
						)}
					</ul>
				</div>
				<div className="grow">
					<Chessboard
						position={game.fen()} customArrows={customArrows}
						onSquareClick={(square) => {
							// console.log(selectedSquare, legalMoves, square)
							if (square == selectedSquare) {
								setSelectedSquare(undefined)
								//setCustomArrows(data?.moves.map(move => move.uci.split(/(?=..$)/) as Arrow))
								setLegalMoves([])
							}
							else {
								if (game.turn() == game.get(square).color) {
									setSelectedSquare(square)
									const moves = game.moves({ square, verbose: true })
									//setCustomArrows(moves.map(move => [move.from, move.to]))
									setLegalMoves(moves.map(move => move))
								}
								// click move
								else if (selectedSquare && legalMoves.find(move => move.to == square) !== undefined) {
									const result = game.move({ from: selectedSquare, to: square })
									setMoves([...moves, { uci: result.lan, san: result.san }])
									setSelectedSquare(undefined)
									setLegalMoves([])
									setLegalSquare(undefined)
								}
								else {
									setSelectedSquare(undefined)
									//setCustomArrows(data?.moves.map(move => move.uci.split(/(?=..$)/) as Arrow))
									setLegalMoves([])
								}
							}
						}}
						onMouseOverSquare={(square) => {
							if (legalMoves.find(move => move.to == square) !== undefined) {
								setLegalSquare(square)
							}
							else {
								setLegalSquare(undefined)
							}
						}}
						isDraggablePiece={({piece}) => {
							//console.log(piece, sourceSquare)
							return piece[0] == game.turn()
						}}
						
						// I think since this function comes from dnd, changes don't work in hot update, must refresh
						onPieceDragBegin={(_piece, sourceSquare) => {
							// console.log('onPieceDragBegin', piece, sourceSquare)
							setSelectedSquare(sourceSquare)
							const moves = game.moves({ square: sourceSquare, verbose: true })
							//setCustomArrows(moves.map(move => [move.from, move.to]))
							setLegalMoves(moves)
						}}
						onDragOverSquare={(square) => {
							if (legalMoves.find(move => move.to == square) !== undefined) {
								setLegalSquare(square)
							}
							else {
								setLegalSquare(undefined)
							}
						}}
						onPieceDragEnd={(piece, sourceSquare) => {
							console.log('onPieceDragEnd', piece, sourceSquare)
						}}
						onPieceClick={(piece) => {
							console.log('onPieceClick', piece)
						}}
						onPieceDrop={(sourceSquare, targetSquare) => {
							try {
								const result = game.move({ from: sourceSquare, to: targetSquare })
								setMoves([...moves, { uci: result.lan, san: result.san }])
								setSelectedSquare(undefined)
								setLegalMoves([])
								setLegalSquare(undefined)
								return true
							}
							catch (e) {
								setSelectedSquare(undefined)
								setLegalMoves([])
								setLegalSquare(undefined)
								return false
							}
						}}
						customDropSquareStyle={{}}
						customSquareStyles={customSquareStyles}
					/>
				</div>
			</div>
		</>
	)
}

export default App
