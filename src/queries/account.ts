// https://lichess.org

import { QueryFunction } from "@tanstack/react-query"
import { AccountData } from "../types/account"

type Token = string

export type AccountQueryKey = ['account', Token]
export const accountQueryFn: QueryFunction<AccountData, AccountQueryKey> = async ({ queryKey: [, token], signal }) => {
	const res = await fetch('https://lichess.org/api/account', {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		signal,
	})
	return res.json()
}

// could do https://lichess.org/api/account/preferences to get board color