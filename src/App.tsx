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
	averageRating: number
	game: null
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

function splitUci(uci: string) {
	return [uci.slice(0, 2), uci.slice(2)] as [Square, Square]
}

function App() {
	const [game] = useState(new Chess())
	const [moves, setMoves] = useState<Pick<BookMove, 'uci' | 'san'>[]>([])
	const [data, setData] = useState<Data>()

	const san = moves.map(move => move.san)
	const uci = moves.map(move => move.uci)
	const uciComma = uci.join(',')

	//const uciSpace = uci.join(' ')
	// https://lichess.org/api/cloud-eval?fen=rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2
	useEffect(() => {
		(async function go() {
			const response = await fetch(`https://explorer.lichess.ovh/masters?play=${uciComma}`)
			if (response.ok) {
				const data = await response.json() as Data
				setData(data)
				console.log(data.moves)
				const timesPlayed = data.moves.map(move => move.white + move.draws + move.black)
				const max = timesPlayed[0]
				const min = timesPlayed[timesPlayed.length - 1]
				const scale = (x: number) => .2 + (x - min) * (1 - .2) / (max - min) || 1
				setCustomArrows(data.moves.map((move, i) => {
					// eslint-disable-next-line prefer-const
					let [startSquare, endSquare] = splitUci(move.uci)
					// board does not allow castling to corners, must be input as moving 2 spaces
					if (move.san == 'O-O') {
						endSquare = 'g' + endSquare[1] as Square
					}
					else if(move.san == 'O-O-O') {
						endSquare = 'c' + endSquare[1] as Square
					}
					return [startSquare, endSquare, `rgba(0,48,136,${scale(timesPlayed[i])})`]
				}))
				// game.moves()
			}
		})()
	}, [uciComma])

	const [selectedSquare, setSelectedSquare] = useState<Square>()
	const [legalSquare, setLegalSquare] = useState<Square>()
	const [customArrows, setCustomArrows] = useState<Arrow[]>()
	const legalMoves: Move[] = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : []

	const customSquareStyles: CustomSquareStyles = {}
	if (selectedSquare) {
		customSquareStyles[selectedSquare] = { background: 'rgba(20,85,30,.5)' }
	}
	// show previous move
	if (moves.length) {
		const previousMove = moves[moves.length - 1]
		const [startSquare, endSquare] = splitUci(previousMove.uci)
		customSquareStyles[startSquare] = { background: 'rgba(155,199,0,.41)' }
		customSquareStyles[endSquare] = { background: 'rgba(155,199,0,.41)' }
	}
	for (const legalMove of legalMoves) {
		customSquareStyles[legalMove.to] = { background: legalMove.captured ? captureBG : moveBG }
	}
	if (selectedSquare && legalSquare) {
		customSquareStyles[legalSquare] = { background: 'rgba(20,85,30,0.3)' }
	}
	// TODO: draw check

	const n = moves.length

	return (
		<>
			<h1 className="text-xl">Opening Explorer PoC</h1>
			<p>
				<strong>Moves:</strong> {san.map((move, i) => <>
					{i % 2 ? ' ' : ` ${i / 2 + 1}.`} <span key={i} onClick={() => {
						const nextMoves = moves.slice(0, i + 1)
						setMoves(nextMoves)
						setSelectedSquare(undefined)
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
								game.move(move.san)
							}} style={{ cursor: 'pointer' }}>{Math.floor(n / 2) + 1}. {n % 2 ? '...' : ''}{move.san}</li>
						)}
					</ul>
				</div>
				<div className="grow">
					<Chessboard
						position={game.fen()} customArrows={customArrows}
						onSquareClick={(square) => {
							if (square == selectedSquare) {
								setSelectedSquare(undefined)
							}
							else {
								if (game.turn() == game.get(square).color) {
									setSelectedSquare(square)
								}
								// click move
								else if (selectedSquare && legalMoves.some(move => move.to == square)) {
									const result = game.move({ from: selectedSquare, to: square })
									setMoves([...moves, { uci: result.lan, san: result.san }])
									setSelectedSquare(undefined)
									setLegalSquare(undefined)
								}
								else {
									setSelectedSquare(undefined)
								}
							}
						}}
						onMouseOverSquare={(square) => {
							if (legalMoves.some(move => move.to == square)) {
								setLegalSquare(square)
							}
							else {
								setLegalSquare(undefined)
							}
						}}
						onMouseOutSquare={() => {
							setLegalSquare(undefined)
						}}
						isDraggablePiece={({piece}) => {
							//console.log(piece, sourceSquare)
							return piece[0] == game.turn()
						}}
						
						// I think since this function comes from dnd, changes don't work in hot update, must refresh
						onPieceDragBegin={(_piece, sourceSquare) => {
							// console.log('onPieceDragBegin', piece, sourceSquare)
							setSelectedSquare(sourceSquare)
						}}
						onDragOverSquare={(square) => {
							if (legalMoves.some(move => move.to == square)) {
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
								setLegalSquare(undefined)
								return true
							}
							catch (e) {
								setSelectedSquare(undefined)
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
