export type Db = 'masters' | 'lichess' | 'player'
export type Uci = string

export interface PositionStats {
	white: number,
	draws: number,
	black: number,
}

export interface ExplorerData extends PositionStats {
	moves: LiMove[],
	recentGames: Game[],
	topGames: Game[]
	opening: Opening | null,
}

export interface Opening {
	eco: string,
	name: string
}
export interface LiMove extends PositionStats {
	uci: string,
	san: string,
	averageRating: number,
	game: string | null,
	opening: Opening | null,
}
export interface Game {
	uci: string,
	id: string,
	winner: 'white' | 'black' | null,
	speed: 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence',
	mode: 'rated' | 'casual',
	black: Player,
	white: Player,
	year: number,
	month: string,
}
export interface Player {
	name: string,
	rating: number,
}