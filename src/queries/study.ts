import { MutationFunction, QueryFunction } from "@tanstack/react-query"
import { StudiesList, StudyChapters } from "../types/study"
import { ExtractAtomValue } from "jotai"
import { tokenAtom } from "../auth"
import { usernameAtom } from "../atoms/account"
import { Username } from "../types/account"
import { Token } from "../types/auth"
import { Pgn } from "../types/game"

export type ListStudiesQueryKey = ['study', Username, Token]
export const listStudiesQueryFn: QueryFunction<StudiesList, ListStudiesQueryKey> = async ({ queryKey: [, username, token], signal }) => {
	const res = await fetch(`https://lichess.org/api/study/by/${username}`, {
		headers: {
			'Authorization': `Bearer ${token}`,
		},
		signal,
	})
	const body = await res.text()
	const studies: StudiesList = []
	for (const line of body.split('\n')) {
		if (line) studies.push(JSON.parse(line))
	}
	return studies
}

export type ImportPGNIntoStudyMutationKey = ['study', 'import']
export const importPGNintoStudyMutationFn: MutationFunction<StudyChapters, { studyId: string, name?: string, orientation?: 'white' | 'black', pgn: Pgn, token: Token }> = async ({ studyId, name, orientation, pgn, token }, context) => {
	const body = new URLSearchParams({ pgn })
	if (name) body.append('name', name)
	if (orientation) body.append('orientation', orientation)
		try {
	const res = await fetch(`https://lichess.org/api/study/${studyId}/import-pgn`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
	})
	const studyChapters: StudyChapters = await res.json()
	return studyChapters
}
catch (error) {
	console.error(error)
	throw error
}
}


export type CreateStudyQueryKey = ['study', 'create']
export const createStudyMutationFn: MutationFunction<string, { username: string | undefined, pgn: Pgn, token: Token }> = async ({ username, pgn, token }, context) => {
	if (username === undefined) {
		throw new Error('no username')
	}
	// get from cache unless not there then fetch
	const studies = await context.client.ensureQueryData<StudiesList, Error, StudiesList, ListStudiesQueryKey>({ queryKey: ['study', username, token], queryFn: listStudiesQueryFn })
	// this will throw a CORS error. The API doesn't have a way to create new studies, but posting here does create one
	try {
		const res = await fetch(`https://lichess.org/study`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
	}
	catch (error) {
		// expected
		console.error(error)
	}

	const nextStudies = await context.client.fetchQuery<StudiesList, Error, StudiesList, ListStudiesQueryKey>({ queryKey: ['study', username, token], queryFn: listStudiesQueryFn })
	const oldStudyIds = studies.map(({ id }) => id)
	const newStudyIds = nextStudies.filter(({ id }) => !oldStudyIds.includes(id))
	if (newStudyIds.length === 0) {
		throw new Error('Could not create new study')
	}
	if (newStudyIds.length > 1) {
		throw new Error('Not sure which is the new study')
	}
	const studyId = newStudyIds[0].id

	importPGNintoStudyMutationFn({ studyId, pgn, token }, context)

	return studyId
}