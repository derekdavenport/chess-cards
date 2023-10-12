import { useEffect, useState } from 'react'
import './App.css'
import a from './assets/a.tsv'
import b from './assets/b.tsv'
import c from './assets/c.tsv'
import d from './assets/d.tsv'
import e from './assets/e.tsv'

type RawOpening = {
	eco: string
	epd: string
	name: string
	pgn: string
	uci: string
}

type Openings = Record<string, RawOpening>

const book = [a, b, c, d, e].reduce((acc: Openings, rawOpenings: RawOpening[]) => {
	return rawOpenings.reduce((acc, rawOpening) => {
		acc[rawOpening.uci] = rawOpening
		return acc
	}, acc)
}, {})

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
}

function App() {
	const [moves, setMoves] = useState<Move[]>([])
	const [data, setData] = useState<Data | null>(null)

	const san = moves.map(move => move.san)
	const uci = moves.map(move => move.uci)
	const uciComma = uci.join(',')

	// remove moves until we find a name
	let uciSpace = ''
	let i = uci.length
	for (; !(uciSpace in book) && i > 0; i--) {
		uciSpace = uci.slice(0, i).join(' ')
	}
	// i++
	// const extraMoves = san.slice(i).reduce((extraMoves, san, j) => {
	// 	if (i % 2) { // odd
	// 		if (!j) { // first extra move
	// 			extraMoves += `${(i - 1) / 2 + 1}. ...`
	// 		}
	// 	}
	// 	else {
	// 		extraMoves += `${i / 2 + 1}. `
	// 	}
	// 	extraMoves += san + ' '
	// 	i++
	// 	return extraMoves
	// }, '')

	useEffect(() => {
		(async function go() {
			const response = await fetch(`https://explorer.lichess.ovh/masters?play=${uciComma}`)
			if (response.ok) {
				setData(await response.json())
			}
		})()
	}, [uciComma])

	const n = moves.length

	return (
		<>
			<h1>Opening Explorer PoC</h1>
			<p>
				<strong>Moves:</strong> {san.map((move, i) => <>
					{i % 2 ? ' ' : ` ${i / 2 + 1}.`} <span onClick={() => setMoves(moves.slice(0, i + 1))} style={{ cursor: 'pointer' }}>{move}</span>
				</>)}
			</p>
			<p>
				<strong>Name:</strong> {book[uciSpace]?.eco} {book[uciSpace]?.name}
			</p>
			{moves.length ? <span onClick={() => setMoves(moves.slice(0, -1))} style={{ cursor: 'pointer' }}>..</span> : undefined}
			<p>
				<strong>Next Move:</strong>
			</p>
			<ul>
				{data?.moves.map(move => {
					return <li key={move.uci} onClick={() => setMoves([...moves, move])} style={{ cursor: 'pointer' }}>{Math.floor(n / 2) + 1}. {n % 2 ? '...' : ''}{move.san}</li>
				})}
			</ul>
		</>
	)
}

export default App
