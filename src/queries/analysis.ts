import { QueryFunction } from "@tanstack/react-query"
import { AnalysisData } from "../types/analysis"
import { Fen } from "../types/game"
import { checkRateLimitResponse } from "../util/rateLimit"

const MAX_PV = '5'
export type AnalysisQueryKey = ['analysis', Fen]
export const analysisQueryFn: QueryFunction<AnalysisData, AnalysisQueryKey> = async ({ queryKey: [, fen], signal }) => {
	const params = new URLSearchParams({
		fen,
		multiPv: MAX_PV,
	})
	const res = await fetch(`https://lichess.org/api/cloud-eval?${params}`, { signal })
	checkRateLimitResponse(res)
	return res.json()
}