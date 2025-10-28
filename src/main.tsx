import React, { ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Provider } from 'jotai/react'
import { useHydrateAtoms } from 'jotai/react/utils'
import { queryClientAtom } from 'jotai-tanstack-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { AuthProvider } from "react-oauth2-code-pkce"
import { authConfig } from './auth'
import './index.css'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Infinity,
			gcTime: 1000 * 60 * 60 * 24, // 24 hours
		},
	},
})

const persister = createAsyncStoragePersister({
	storage: window.localStorage,
})

const HydrateAtoms = ({ children }: {children: ReactNode }) => {
	useHydrateAtoms([[queryClientAtom, queryClient]])
	return children
}

const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	scrollRestoration: true,
})

declare module '@tanstack/react-router' {
	interface Register {
		// This infers the type of our router and registers it across your entire project
		router: typeof router
	}
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}
		// not sure if I need this, if I get No mutationFn found error (also add default mutation Fn)
		// onSuccess={() => {
		// 	// resume mutations after initial restore from localStorage was successful
		// 	queryClient.resumePausedMutations()
		// }}
		>
			<Provider>
				<HydrateAtoms>
					<AuthProvider authConfig={authConfig}>
						<RouterProvider router={router} />
					</AuthProvider>
				</HydrateAtoms>
			</Provider>
			<ReactQueryDevtools initialIsOpen={false} />
		</PersistQueryClientProvider>
	</React.StrictMode>,
)
