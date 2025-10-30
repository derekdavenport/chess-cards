import { QueryFunction } from "@tanstack/query-core"
import { Db, ExplorerData, Uci } from "../types/explorer"
import { checkRateLimitResponse } from "../util/rateLimit"

export type ExplorerQueryKey = ['explorer', Db, Uci]
export const explorerQueryFn: QueryFunction<ExplorerData, ExplorerQueryKey> = async ({ queryKey: [, db, fen], signal }) => {
	const res = await fetch(`https://explorer.lichess.ovh/${db}?${new URLSearchParams({ fen })}`, { signal })
	checkRateLimitResponse(res)
	return res.json()
}