export type StudiesList = {
	id: string,
	name: string,
	createdAt: number,
	updatedAt: number,
}[]

type Player = {
	name: string,
	rating: number,
}
export type StudyChapters = {
	chapters: {
		id: string,
		name: string,
		players: [Player, Player],
		status: string,
	}[]
}