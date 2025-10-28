import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { StudiesList, StudyChapters } from "../types/study";
import { createStudyMutationFn, importPGNintoStudyMutationFn, listStudiesQueryFn, ListStudiesQueryKey } from "../queries/study";
import { usernameAtom } from "./account";
import { tokenAtom } from "../auth";
import { Pgn } from "../types/game";
import { atom } from "jotai";

export const studyIdAtom = atom<string>()

export const studiesListAtom = atomWithQuery<StudiesList, Error, StudiesList, ListStudiesQueryKey>(get => {
	const username = get(usernameAtom)
	return {
		queryKey: ['study', username!, get(tokenAtom)],
		queryFn: listStudiesQueryFn,
		staleTime: 1000 * 60 * 1,
		enabled: username === undefined
	}
})

export const createStudyAtom = atomWithMutation<string, { pgn: Pgn }>(get => ({
	mutationKey: ['study', 'create'],
	mutationFn: ({ pgn }, context) => createStudyMutationFn({ username: get(usernameAtom), token: get(tokenAtom), pgn }, context),
}))

export const importPGNintoStudyAtom = atomWithMutation<StudyChapters, { pgn: Pgn, orientation: 'white' | 'black' }>(get => ({
	mutationFn: ({ pgn, orientation }, context) => {
		const token = get(tokenAtom)
		if (!token) {
			throw new Error('not logged in')
		}
		const studyId = get(studyIdAtom)
		if (!studyId) {
			throw new Error('pick a study id')
		}
		// const orientation = get(turnAtom)
		return importPGNintoStudyMutationFn({ studyId, pgn, orientation, token }, context)
	},
})
)