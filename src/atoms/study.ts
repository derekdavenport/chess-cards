import { atomWithQuery } from "jotai-tanstack-query";
import { StudiesList } from "../types/study";
import { listStudiesQueryFn, ListStudiesQueryKey } from "../queries/study";
import { usernameAtom } from "./user";
import { tokenAtom } from "../auth";

export const studiesListAtom = atomWithQuery<StudiesList, Error, StudiesList, ListStudiesQueryKey>(get => ({
	queryKey: ['study', get(usernameAtom), get(tokenAtom)],
	queryFn: listStudiesQueryFn,
	staleTime: 1000 * 60 * 1,
}))