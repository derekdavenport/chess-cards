import React, { ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Provider } from 'jotai/react'
import { useHydrateAtoms } from 'jotai/react/utils'
import { queryClientAtom } from 'jotai-tanstack-query'
import App from './App.tsx'
import './index.css'
import Study from './Study.tsx'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
			<Provider>
				<HydrateAtoms>
					<Study />
					<App />
				</HydrateAtoms>
			</Provider>
			<ReactQueryDevtools initialIsOpen={false} />
		</PersistQueryClientProvider>
	</React.StrictMode>,
)
