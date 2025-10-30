export class RateLimitError extends Error {
	constructor(message: string = "Rate limit exceeded") {
		super(message)
		this.name = "RateLimitError"
	}
}

export function isRateLimitError(error: unknown): error is RateLimitError {
	return error instanceof RateLimitError
}

export function checkRateLimitResponse(response: Response): void {
	if (response.status === 429) {
		const message = "Rate limit exceeded. Please wait 60 seconds before trying again."
		throw new RateLimitError(message)
	}
}