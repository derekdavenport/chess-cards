import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query"
import { accountQueryFn, AccountQueryKey } from "../queries/account.ts";
import { tokenAtom } from "../auth.ts";
import { AccountData } from "../types/account.ts";

export const accountAtom = atomWithQuery<AccountData, Error, AccountData, AccountQueryKey>(get => ({
	queryKey: ['account', get(tokenAtom)],
	queryFn: accountQueryFn,
	staleTime: Infinity,
}))

export const usernameAtom = atom(get => {
	const { data: account } = get(accountAtom)
	return account?.username
})