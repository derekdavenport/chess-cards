import { QueryFunction } from "@tanstack/react-query"
import { StudiesList } from "../types/study"
import { ExtractAtomValue } from "jotai"
import { tokenAtom } from "../auth"
import { usernameAtom } from "../atoms/user"

export type ListStudiesQueryKey = ['study', ExtractAtomValue<typeof usernameAtom>, ExtractAtomValue<typeof tokenAtom>]
export const listStudiesQueryFn: QueryFunction<StudiesList, ListStudiesQueryKey> = async ({ queryKey: [, username, token] }) => {
	const res = await fetch(`https://lichess.org/api/study/by/${username}`, {
		headers: {
			'Authorization': `Bearer ${token}`,
		},
	})
	const body = await res.text()
	const studies: StudiesList = []
	for (const line of body.split('\n')) {
		if (line) studies.push(JSON.parse(line))
	}
	return studies
}