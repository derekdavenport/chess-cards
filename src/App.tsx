import { Fragment, useEffect, useState } from 'react'
import './App.css'
import { Chess, type Move } from "chess.js";
import { Chessboard } from "react-chessboard"
import type { Arrow, CustomSquareStyles, Square } from "react-chessboard/dist/chessboard/types"

type Results = {
	white: number
	draws: number
	black: number
}

type MoveName = {
	uci: string
	san: string
}

type BookMove = Results & MoveName & {
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

const pgn = `
[Event "English Opening!󠁧󠁢󠁥󠁮󠁧󠁿: English Opening: Symmetrical Variation"]
[Site "https://lichess.org/study/qkiEGvJu/nB01AMgN"]
[Result "*"]
[UTCDate "2021.10.30"]
[UTCTime "18:11:43"]
[Variant "Standard"]
[ECO "A36"]
[Opening "English Opening: Symmetrical Variation, Two Knights, Fianchetto Variation"]
[Annotator "https://lichess.org/@/ChessBeginner210"]
[ChapterMode "gamebook"]

{ To start our English journey, we must be familiar with the Symmetrical Variation, the most basic kind of English Opening. This is an attempt to avoid theory by copying White's moves. Start with the English Opening. }
1. c4 { Correct! } 1... c5 { This is the Symmetrical Variation. Black a) avoids theory, and b) stakes a claim to the d4 square.
Here you should play Nc3. } 2. Nc3 { Usually, Black will play Nc6. } 2... Nc6 { Now how do we prepare to fianchetto our light-squared bishop? } { [%csl Gf1] } 3. g3 { Excellent! } (3. g4 { Right pawn, but you moved it too far. }) (3. Nf3 Nf6 4. d3) 3... Nf6 { Fianchetto your bishop! } 4. Bg2 { Perfect! Notice how all your active pieces are controlling d5 and e4. } { [%csl Gd5,Ge4] } 4... d6 { What pawn move do you make to increase your control over e4? } { [%csl Ge4] } 5. d3 { Great! } (5. f3 { Don't block your light-squared bishop! }) 5... g6 { What's the best square for this knight? } { [%csl Gg1] } 6. Nf3 { Outstanding! } 6... Bg7 { Protect your king! } 7. O-O { That's how you play the Symmetrical Variation. Let's see the second variation. } *
`

type Color = 'R' | 'G' | 'Y' | 'B'
const pgnColors: Record<Color, string> = {
	R: '#882020AA',
	G: '#15781BAA',
	Y: '#e68f00AA',
	B: '#003088AA',
}

const captureBG = 'radial-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,0) 80%, rgba(20,85,30,0.3) 80%)'
const moveBG = 'radial-gradient(rgba(20,85,30,0.3) 0%, rgba(20,85,30,0.3) 20%, rgba(0,0,0,0) 20%)'
const checkBG = 'radial-gradient(rgb(255, 0, 0) 0%, rgb(231, 0, 0) 25%, rgba(169, 0, 0, 0) 89%, rgba(158, 0, 0, 0) 100%)'
const circleBG = (c: Color) => `radial-gradient(rgba(0,0,0,0) 60%, ${pgnColors[c]} 60%, ${pgnColors[c]} 71%, rgba(0,0,0,0) 71%)`

function splitUci(uci: string) {
	return [uci.slice(0, 2), uci.slice(2, 4)] as [Square, Square]
}

function App() {
	const [game] = useState(() => {
		const game = new Chess()
		game.loadPgn(pgn)
		return game
	})
	console.log(game.history(), game.moveNumber(), game.getComment())
	game.undo()
	game.move('e1g1')
	console.log(game.getComments())
	useEffect(() => {
		game.getComments().map(({ comment }) => {
			console.log(comment)
			const arrowRegEx = /\[%cal\s+([^\]]*)\]/g
			const highlightRegEx = /\[%csl\s+([^\]]*)\]/g

			for (let result = arrowRegEx.exec(comment); result != null; result = arrowRegEx.exec(comment)) {
				const arrows = result[1].split(',').map(s => [...splitUci(s.slice(1)), pgnColors[s[0] as Color]] as Arrow)
				setCustomArrows(arrows)
			}

			for (let result = highlightRegEx.exec(comment); result != null; result = highlightRegEx.exec(comment)) {
				const colorSquares = result[1].split(',').map(s => [s.slice(1), s[0]] as [Square, Color])
				setHighlights(colorSquares)
			}
		})
	}, [])
	const [moves, setMoves] = useState<MoveName[]>([])
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
				// console.log(data.moves)
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
					else if (move.san == 'O-O-O') {
						endSquare = 'c' + endSquare[1] as Square
					}
					return [startSquare, endSquare, `rgba(0,48,136,${scale(timesPlayed[i])})`]
				}))
				// game.moves()
			}
		})()
	}, [uciComma])

	const [selectedSquare, setSelectedSquare] = useState<Square>()
	const [placeableSquare, setPlaceableSquare] = useState<Square>()
	const [customArrows, setCustomArrows] = useState<Arrow[]>()
	const [highlights, setHighlights] = useState<[Square, Color][]>([])
	const legalMoves: Move[] = selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : []

	const squareStyles: CustomSquareStyles = {}
	if (selectedSquare) {
		squareStyles[selectedSquare] = { backgroundColor: 'rgba(20,85,30,.5)' } // bgColor so can add (not overwrite) with bgImage when in check
	}
	// show previous move
	if (moves.length) {
		const previousMove = moves[moves.length - 1]
		const [startSquare, endSquare] = splitUci(previousMove.uci)
		squareStyles[startSquare] = { backgroundColor: 'rgba(155,199,0,.41)' }
		squareStyles[endSquare] = { backgroundColor: 'rgba(155,199,0,.41)' }
	}
	for (const legalMove of legalMoves) {
		// should overwrite previous move colors
		squareStyles[legalMove.to] = { backgroundImage: legalMove.captured ? captureBG : moveBG }
	}
	if (selectedSquare && placeableSquare) {
		// should overwrite previous colors
		squareStyles[placeableSquare] = { backgroundColor: 'rgba(20,85,30,0.3)' }
	}
	if (game.inCheck()) {
		// find the king of current turn's color
		const result = game.board().flat().find(v => v && v.color == game.turn() && v.type == 'k')
		if (result) {
			squareStyles[result.square] = { ...squareStyles[result.square], backgroundImage: checkBG }
		}
	}
	for (const [square, color] of highlights) {
		const styles = squareStyles[square]
		if (styles?.backgroundImage) {
			styles.backgroundImage = circleBG(color) + ', ' + styles.backgroundImage
		}
		else {
			squareStyles[square] = { ...styles, backgroundImage: circleBG(color) }
		}
	}


	const n = moves.length

	function makeMove(move: { from: Square, to: Square, promotion?: string }) {
		const result = game.move(move)
		setMoves([...moves, { uci: result.lan, san: result.san }])
		setSelectedSquare(undefined)
		setPlaceableSquare(undefined)
	}

	return (
		<>
			<h1 className="text-xl">Opening Explorer PoC</h1>
			<p>
				<strong>Moves:</strong> {san.map((move, i) => <Fragment key={i}>
					{i % 2 ? ' ' : ` ${i / 2 + 1}.`} <span onClick={() => {
						const nextMoves = moves.slice(0, i + 1)
						setMoves(nextMoves)
						setSelectedSquare(undefined)
						game.reset()
						nextMoves.forEach(move => game.move(move.san))
					}} style={{ cursor: 'pointer' }}>{move}</span>
				</Fragment>)}
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
							else if (game.turn() == game.get(square).color) {
								setSelectedSquare(square)
							}
							// click move
							else if (selectedSquare && legalMoves.some(move => move.to == square)) {
								makeMove({ from: selectedSquare, to: square })
							}
							else {
								setSelectedSquare(undefined)
							}
						}}
						onMouseOverSquare={(square) => {
							// console.log('mouseover', square)
							if (legalMoves.some(move => move.to == square)) {
								setPlaceableSquare(square)
							}
							else {
								setPlaceableSquare(undefined)
							}
						}}
						onMouseOutSquare={() => {
							// would like to do this when mouse goes off board, but also runs during promotion popup
							//setPlaceableSquare(undefined)
						}}
						isDraggablePiece={({ piece }) => {
							return piece[0] == game.turn()
						}}

						// I think since this function comes from dnd, changes don't work in hot update, must refresh
						onPieceDragBegin={(_piece, sourceSquare) => {
							// console.log('onPieceDragBegin', piece, sourceSquare)
							setSelectedSquare(sourceSquare)
						}}
						onDragOverSquare={(square) => {
							// console.log('dragover', square)
							if (legalMoves.some(move => move.to == square)) {
								setPlaceableSquare(square)
							}
							else {
								setPlaceableSquare(undefined)
							}
						}}
						onPieceDragEnd={() => {
							// console.log('onPieceDragEnd', piece, sourceSquare)
							// setSelectedSquare(undefined)
							// setPlaceableSquare(undefined)
						}}
						onPieceClick={() => {
							// console.log('onPieceClick', piece)
						}}
						onPieceDrop={(sourceSquare, targetSquare) => {
							try {
								makeMove({ from: sourceSquare, to: targetSquare })
								return true
							}
							catch (e) {
								setSelectedSquare(undefined)
								setPlaceableSquare(undefined)
								return false
							}
						}}
						onPromotionPieceSelect={(piece) => {
							// console.log(piece, selectedSquare, placeableSquare)
							if (piece && selectedSquare && placeableSquare) {
								makeMove({ from: selectedSquare, to: placeableSquare, promotion: piece[1].toLowerCase() })
								return true
							}
							return false
						}}
						// onPromotionCheck={(square, targetSquare, piece) => {
						// 	console.log(square, targetSquare, piece)
						// 	return true
						// }}
						customDropSquareStyle={{}}
						customSquareStyles={squareStyles}
					/>
				</div>
			</div>
		</>
	)
}

export default App
