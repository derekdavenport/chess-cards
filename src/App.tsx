import { useRef, useState } from 'react'
import './App.css'

const lichessStudyUrlRegExpString = '((https?://)?lichess.org/study/)?(\\w{8})((/\\w{8})?/?)?'
const lichessStudyUrlRegExp = new RegExp('^' + lichessStudyUrlRegExpString + '$')

function App() {
	async function handleChangeLichessStudyUrl(url: string) {
		if (!url.length) {
			return setLichessStudyUrlMessage('paste in a Lichess Study address')
		}
		if (!studyInputRef.current?.checkValidity()) {
			return setLichessStudyUrlMessage('not a Lichess Study address')
		}
		const match = url.match(lichessStudyUrlRegExp)
		if (!match) {
			return setLichessStudyUrlMessage('not a Lichess Study address')
		}
		const id = match[3]
		const response = await fetch(`https://lichess.org/api/study/${id}.pgn`, {
			method: 'HEAD',
		})
		if (!response.ok) {
			return setLichessStudyUrlMessage('no Lichess Study at that address')
		}
		setLichessStudyId(id)
		setLichessStudyUrlMessage('')
	}

	function downloadDeck() {
		if (!lichessStudyUrlMessage && downloadLinkRef.current) {
			downloadLinkRef.current.setAttribute('href', `https://chess-api.context.cards/v1/deck?id=${lichessStudyId}`)
			downloadLinkRef.current.click()
		}
	}

	const [lichessStudyId, setLichessStudyId] = useState<string>()
	const [lichessStudyUrlMessage, setLichessStudyUrlMessage] = useState('paste in a Lichess Study address')
	const studyInputRef = useRef<HTMLInputElement | null>(null)
	const downloadLinkRef = useRef<HTMLAnchorElement | null>(null)
	return <>
		<main className="my-0 mx-auto max-w-xl text-center prose">
			<h1>Chess Cards</h1>
			<div className="flex flex-col space-y-2">
				<div>
					Pick a <a href="https://lichess.org/study">Lichess Study</a> and paste the address below
				</div>
				<div className="form-control w-full">
					<label className="label" htmlFor="lichessStudyUrl">
						<span className="label-text">Lichess Study Address</span>
						<span className="label-text-alt text-red-500">{lichessStudyUrlMessage}</span>
					</label>
					<input
						id="lichessStudyUrl" name="lichessStudyUrl" type="text" ref={studyInputRef}
						placeholder="https://lichess.org/study/whCVdUeM"
						pattern={lichessStudyUrlRegExpString}
						required
						onChange={e => handleChangeLichessStudyUrl(e.target.value)}
						className="input input-bordered w-full" />
				</div>
				<div className="tooltip" data-tip={lichessStudyUrlMessage ? 'first give a Lichess Study address' : 'download deck'}>
					<button
						disabled={!!lichessStudyUrlMessage} onClick={() => downloadDeck()}
						className="btn btn-primary"
					>download</button>
				</div>
				<p>
					Study using <a href="https://apps.ankiweb.net/">Anki</a>
				</p>
			</div>
		</main>
		<a download ref={downloadLinkRef}></a>
	</>
}

export default App
