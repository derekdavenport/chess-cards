import { useEffect, useState } from 'react'
import './App.css'

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
  useEffect(() => {
    (async function go() {
      const response = await fetch(`https://explorer.lichess.ovh/masters?play=${moves.map(({uci}) => uci).join(',')}`)
      if (response.ok) {
        setData(await response.json())
      }
    })()
  }, [moves])

  return (
    <>
      <h1>Opening Explorer PoC</h1>
      <p>
        <strong>Moves:</strong> {moves.map(move => move.san).join(', ')}
      </p>
      {moves.length ? <span onClick={() => setMoves(moves.slice(0, -1))} style={{ cursor: 'pointer' }}>..</span> : undefined}
      <p>
        <strong>Next Move:</strong>
      </p>
      <ol>
        {data?.moves.map(move => {
          return <li key={move.uci} onClick={() => setMoves([...moves, move])} style={{ cursor: 'pointer' }}>{move.san}</li>
        })}
      </ol>
    </>
  )
}

export default App
