import { AnalysisData } from '../types/analysis.ts'
import { analysisQueryFn, AnalysisQueryKey } from "../queries/analysis.ts"
import { fenAtom } from "./game.ts"
import { atomWithQuery } from "jotai-tanstack-query"

export const analysisAtom = atomWithQuery<AnalysisData, Error, AnalysisData, AnalysisQueryKey>(get => ({
	queryKey: ['analysis', get(fenAtom)],
	queryFn: analysisQueryFn,
	staleTime: Infinity,
}))