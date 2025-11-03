import { AnalysisData } from '../types/analysis.ts'
import { analysisQueryFn, AnalysisQueryKey } from "../queries/analysis.ts"
import { fenAtom } from "./game.ts"
import { atomWithQuery } from "jotai-tanstack-query"
import { rateLimitAtom } from "./rateLimit.ts"

export const analysisAtom = atomWithQuery<AnalysisData, Error, AnalysisData, AnalysisQueryKey>(get => ({
	queryKey: ['analysis', get(fenAtom)],
	queryFn: analysisQueryFn,
	staleTime: Infinity,
	enabled: !get(rateLimitAtom).isRateLimited,
}))

export const fenCpAtom = atomWithQuery<AnalysisData, Error, number | null, AnalysisQueryKey>(get => ({
	queryKey: ['analysis', get(fenAtom)],
	queryFn: analysisQueryFn,
	staleTime: Infinity,
	enabled: !get(rateLimitAtom).isRateLimited,
	select: (data) => {
		if ('error' in data || !data.pvs.length) return null
		return data.pvs[0].cp
	}
}))