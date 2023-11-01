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
		const responsePromise = fetch(`https://lichess.org/api/study/${id}.pgn`, {
			method: 'HEAD',
		})
		setLichessStudyUrlMessage(undefined)
		const response = await responsePromise
		if (!response.ok) {
			return setLichessStudyUrlMessage('no Lichess Study at that address')
		}
		setLichessStudyId(id)
		setLichessStudyUrlMessage('')
	}

	function handleChangeOrientation(orientation: string) {
		setOrientation(orientation)
	}

	function downloadDeck() {
		if (!lichessStudyUrlMessage && downloadLinkRef.current) {
			downloadLinkRef.current.setAttribute('href', `https://chess-api.context.cards/v1/deck?${new URLSearchParams({
				id: lichessStudyId,
				orientation,
			})}`)
			console.log(downloadLinkRef.current.getAttribute('href'))
			downloadLinkRef.current.click()
		}
	}

	const [lichessStudyId, setLichessStudyId] = useState<string>('')
	const [lichessStudyUrlMessage, setLichessStudyUrlMessage] = useState<string | undefined>('paste in a Lichess Study address')
	const [orientation, setOrientation] = useState('')
	const studyInputRef = useRef<HTMLInputElement | null>(null)
	const downloadLinkRef = useRef<HTMLAnchorElement | null>(null)
	return <>
		<main className="container text-center m-auto">
			<header className="prose m-auto">
				<h1 className="my-10"><img src="/chess-cards.png" className="inline max-h-20 m-0 rounded-lg" /> Chess Cards</h1>
			</header>

			<div className="flex items-center space-x-4 max-w-screen-md m-auto">
				<div>
					From Lichess Study
					<img src="/lichess.png" className="h-auto" />
				</div>
				<div>
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
					</svg>
				</div>

				<div>
					To Anki Deck
					<img src="/anki.png" className="h-auto" />
				</div>
			</div>

			<div className="flex flex-col my-8 space-y-2">
				<p>
					Choose a <a href="https://lichess.org/study">Lichess Study</a> and paste the address below
				</p>
				<div className="form-control w-full max-w-xs mx-auto">
					<label className="label" htmlFor="lichessStudyUrl">
						<span className="label-text">Lichess Study Address</span>
						<span className="label-text-alt text-red-500">{lichessStudyUrlMessage ?? <span className="loading loading-spinner loading-xs text-primary" />}</span>
					</label>
					<input
						id="lichessStudyUrl" name="lichessStudyUrl" type="text" ref={studyInputRef}
						placeholder="https://lichess.org/study/whCVdUeM"
						pattern={lichessStudyUrlRegExpString}
						required
						onChange={e => handleChangeLichessStudyUrl(e.target.value)}
						className="input input-bordered w-full" />
				</div>
				<div className="form-control w-full max-w-xs mx-auto">
					<label className="label" htmlFor="orientation">
						<span className="label-text">Play as</span>
					</label>
					<select
						id="orientation" name="orientation"
						className="select select-bordered w-full"
						onChange={e => handleChangeOrientation(e.target.value)}
					>
						<option value="">Use Study Orientation</option>
						<option value="white">Force White</option>
						<option value="black">Force Black</option>
					</select>

				</div>
				<div className="tooltip mx-auto" data-tip={lichessStudyUrlMessage ? 'first give a Lichess Study address' : 'download deck'}>
					<button
						disabled={!!lichessStudyUrlMessage} onClick={downloadDeck}
						className="btn btn-primary"
					>download</button>
				</div>

				<p>
					Study using<br />
					<a href="https://apps.ankiweb.net/#download">Anki Desktop</a>, <a href="https://ankiweb.net/decks">Anki Web</a>, <a href="https://play.google.com/store/apps/details?id=com.ichi2.anki">AnkiDroid</a>, or <a href="https://apps.apple.com/us/app/ankimobile-flashcards/id373493387">AnkiMobile Flashcards</a>
				</p>

				<div className="prose m-auto">
					<h3 className="mt-10">Further Development</h3>
					<p>
						Support this project <a role="button" className="btn btn-secondary" href="https://donate.stripe.com/fZe17v5kN6vQaIMfYY">Donate</a>
					</p>
					<h4>Ideas</h4>
					<ul className="text-left">
						<li>Import from other sources such as private studies, ChessBase, and PGN</li>
						<li>Variations on playing side</li>
					</ul>
				</div>
			</div>
		</main >
		<a download ref={downloadLinkRef}></a>
	</>
}

export default App
