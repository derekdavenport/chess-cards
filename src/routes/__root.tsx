import { useContext, useEffect } from 'react'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AuthContext, IAuthContext } from "react-oauth2-code-pkce"
import { useAtom, useSetAtom } from 'jotai'
import { tokenAtom } from '../auth'
import { usernameAtom } from '../atoms/account'


export const Route = createRootRoute({
	component: RootComponent,
	notFoundComponent: () => <div>404 Not Found</div>,
})

function RootComponent() {
	const { tokenData, token, logIn, logOut, idToken, error }: IAuthContext = useContext(AuthContext)
	const setToken = useSetAtom(tokenAtom)
	const [username] = useAtom(usernameAtom)
	console.log(tokenData, token, logIn, logOut, idToken, error)
	useEffect(() => {
		setToken(token)
	}, [token])
	return <>
		<main className="container text-center m-auto">
			<header className="prose m-auto">
				<h1 className="my-10"><img src="/chess-cards.png" className="inline max-h-20 m-0 rounded-lg" /> Chess Cards</h1>
			</header>
			<nav>
				<Link
					to="/"
					activeProps={{
						className: 'font-bold',
					}}
					activeOptions={{ exact: true }}
				>
					Cards
				</Link>
				{' '}
				<Link
					to="/study"
					activeProps={{
						className: 'font-bold',
					}}
				>
					Create Study
				</Link>
				{' '}
				{token ? <button onClick={() => logOut()}>{username} Log Out</button> : <button onClick={() => logIn()}>Log In</button>}
			</nav>
			<Outlet />
		</main >
		<TanStackRouterDevtools position="bottom-right" />
	</>
}
