import * as React from 'react'
import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
	component: RootComponent,
	notFoundComponent: () => <div>404 Not Found</div>,
})

function RootComponent() {
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
			</nav>
			<Outlet />
		</main >
		<TanStackRouterDevtools position="bottom-right" />
	</>
}
