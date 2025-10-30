import { atom } from "jotai"
import { atomWithReset, RESET } from "jotai/utils"

interface RateLimitInitialState {
	isRateLimited: false
	rateLimitUntil: null
	lastRateLimitMessage: null
}
interface RateLimitUpdate {
	rateLimitUntil: number
	lastRateLimitMessage: string
}
interface RateLimitActiveState extends RateLimitUpdate {
	isRateLimited: true,
}
export type RateLimitState = RateLimitInitialState | RateLimitActiveState

const primitiveRateLimitAtom = atomWithReset<RateLimitState>({
	isRateLimited: false,
	rateLimitUntil: null,
	lastRateLimitMessage: null,
})

const rateLimitTimeoutIdAtom = atom<number | undefined>()
export const rateLimitAtom = atom(
	get => get(primitiveRateLimitAtom),
	(get, set, update: RateLimitUpdate | typeof RESET) => {
		if (update === RESET) {
			set(primitiveRateLimitAtom, RESET)
			return
		}
		const timeoutId = get(rateLimitTimeoutIdAtom)
		if (timeoutId) {
			clearTimeout(timeoutId)
		}
		const newTimeoutId = setTimeout(() => {
			set(primitiveRateLimitAtom, RESET)
		}, update.rateLimitUntil - Date.now())
		set(rateLimitTimeoutIdAtom, newTimeoutId)
		set(primitiveRateLimitAtom, { isRateLimited: true, ...update })
	}
)