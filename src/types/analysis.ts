export interface Pv {
	moves: string,
	cp: number,
}
export type AnalysisData = {
	fen: string,
	knodes: number,
	depth: number,
	pvs: Pv[],
} | {
	error: string
}