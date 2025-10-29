declare module 'cm-chess' {
	type Color = 'w' | 'b'
	type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
	type Piece = {
		color: Color
		type: PieceSymbol
	}
	type Square =
		'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8' |
		'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7' |
		'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6' |
		'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5' |
		'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4' |
		'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3' |
		'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2' |
		'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1'

	type Promotion = 'q' | 'r' | 'n' | 'b'
	type Move = {
		captured?: boolean
		color: Color
		commentAfter: string | undefined
		commentMove: string | undefined
		fen: string
		flags: string
		from: Square
		gameOver?: true
		inCheck?: true
		inCheckmate?: true
		nag?: string
		next: Move | undefined
		piece: PieceSymbol
		ply: number
		promotion?: Promotion
		previous: Move | null
		san: SAN
		to: Square
		uci: string
		variation: Move[]
		variations: Move[][]
	}
	type AddMove = Pick<Move, 'from' | 'to' | 'promotion'> | SAN

	type FEN = {
		empty: '8/8/8/8/8/8/8/8 w - - 0 1',
		start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
	}
	const FEN: FEN

	const EVENT_TYPE = {
		illegalMove: "illegalMove",
		legalMove: "legalMove",
		undoMove: "undoMove",
		initialized: "initialized"
	} as const

	type ILLEGAL_MOVE_EVENT = { type: EVENT_TYPE.illegalMove, move: Move, previousMove?: Move }
	type LEGAL_MOVE_EVENT = { type: EVENT_TYPE.legalMove, move: Move, previousMove?: Move }
	type UNDO_MOVE_EVENT = { type: EVENT_TYPE.undoMove, move: Move }
	type INITIALIZED_EVENT = { type: EVENT_TYPE.initialized, fen: string }
	type Event = ILLEGAL_MOVE_EVENT | LEGAL_MOVE_EVENT | UNDO_MOVE_EVENT | INITIALIZED_EVENT

	type SAN = string

	class Chess {
		constructor(fenOrProps?: string | { fen?: string, pgn?: string });
		/**
		 * @returns {string} the FEN of the last move, or the setUpFen(), if no move was made.
		 */
		fen(move?: Move): string;
		/**
		 * @returns {string} the setUp FEN in the header or the default start-FEN
		 */
		setUpFen(): string;
		/**
		 * @returns {Record<string, string>} the header tags of the PGN.
		 */
		header(): {
			StudyName?: string;
			ChapterName?: string;
			Event: string;
			Site: string;
			Date: string;
			Round: string;
			White: string;
			Black: string;
			Result: string;
			UTCDate: string;
			UTCTime: string;
			Variant: string;
			ECO: string;
			Opening: string;
			Annotator?: string;
			FEN: string;
			SetUp?: string;
			Orientation: 'white' | 'black';
			ChapterMode: string;
		};
		/**
		 * @param move optional
		 * @returns {boolean} true, if the game is over at that move
		 */
		gameOver(move?: Move): boolean;
		/**
		 * @param move optional
		 * @returns {boolean} true, if the game is in draw at that move
		 */
		inDraw(move?: Move): boolean;
		/**
		 * @param move optional
		 * @returns {boolean} true, if the game is in statemate at that move
		 */
		inStalemate(move?: Move): boolean;
		/**
		 * @param move optional
		 * @returns {boolean} true, if the game is in draw, because of unsufficiant material at that move
		 */
		insufficientMaterial(move?: Move): boolean;
		/**
		 * @param move optional
		 * @returns {boolean} true, if the game is in draw, because of threefold repetition at that move
		 */
		inThreefoldRepetition(move?: Move): boolean;
		/**
		 * @param move optional
		 * @returns {boolean} true, if the game is in checkmate at that move
		 */
		inCheckmate(move?: Move): boolean;
		/**
		 * @param move optional
		 * @returns {boolean} true, if the game is in check at that move
		 */
		inCheck(move?: Move): boolean;
		/**
		 * cm-chess uses cm-pgn for the history and header. See https://github.com/shaack/cm-pgn
		 * @returns {Object[]} the moves of the game history
		 */
		history(): Move[];
		/**
		 * @returns {null|move} the last move of the main variation or `null`, if no move was made
		 */
		lastMove(): Move | null;
		/**
		 * Load a FEN
		 * @param fen
		 */
		load(fen: string): void;
		pgn: {
			render: () => string;
		};
		/**
		 * Load a PGN with variations, NAGs, header and annotations. cm-chess uses cm-pgn
		 * fot the header and history. See https://github.com/shaack/cm-pgn
		 * @param pgn
		 */
		loadPgn(pgn: string): void;
		/**
		 * Make a move in the game.
		 * @param move
		 * @param previousMove optional, the previous move (for variations)
		 * @param sloppy to allow sloppy SAN
		 * @returns {{}|null}
		 */
		move(moveOrSan: AddMove, previousMove?: Move, sloppy?: boolean): Move | null;
		/**
		 * Return all valid moves
		 * @param options {{ square: "e2", piece: "n", verbose: true }}
		 * Fields with { verbose: true }
		 * - `color` indicates the color of the moving piece (w or b).
		 * - `from` and `to` fields are from and to squares in algebraic notation.
		 * - `piece`, `captured`, and `promotion` fields contain the lowercase representation of the applicable piece (pnbrqk). The captured and promotion fields are only present when the move is a valid capture or promotion.
		 * - `san` is the move in Standard Algebraic Notation (SAN).
		 * - `flags` field contains one or more of the string values:
		 *      n - a non-capture
		 *      b - a pawn push of two squares
		 *      e - an en passant capture
		 *      c - a standard capture
		 *      p - a promotion
		 *      k - kingside castling
		 *      q - queenside castling
		 *   A flags value of pc would mean that a pawn captured a piece on the 8th rank and promoted.
		 * @param move
		 * @returns {{}}
		 */
		moves(options?: {
			square?: Square;
			piece?: PieceSymbol;
			verbose?: boolean;
		}, move?: Move): Move[];
		/**
		 * Don't make a move, just validate, if it would be a correct move
		 * @param move
		 * @param previousMove optional, the previous move (for variations)
		 * @param sloppy to allow sloppy SAN
		 * @returns the move object or null if not valid
		 */
		validateMove(move: Move, previousMove?: Move, sloppy?: boolean): Move | null;
		/**
		 * Render the game as PGN with header, comments and NAGs
		 * @param renderHeader optional, default true
		 * @param renderComments optional, default true
		 * @param renderNags optional, default true
		 * @returns {string} the PGN of the game.
		 */
		renderPgn(renderHeader?: boolean, renderComments?: boolean, renderNags?: boolean): string;
		/**
		 * Get the position of the specified figures at a specific move
		 * @param type "p", "n", "b",...
		 * @param color "b" or "w"
		 * @param move
		 * @returns {Object[]} the pieces (positions) at a specific move
		 */
		pieces(type?: PieceSymbol, color?: Color, move?: Move): (Piece & { square: Square })[];
		/**
		 * get the piece on a square
		 * @param square
		 * @param move
		 * @returns {{color: any, type: any}|null}
		 */
		piece(square: Square, move?: Move): Piece | null;
		/**
		 * @returns {string} "b" or "w" the color to move in the main variation
		 */
		turn(): Color;
		/**
		 * Undo a move and all moves after it
		 * @param move
		 */
		undo(move?: Move): void;
		plyCount(): number;
		fenOfPly(plyNumber: number): string;
		addObserver(callback: (event: Event) => void): void;
	}

}

declare module 'cm-chess/src/Fen.js' {
	class Fen {
		constructor(fen: string)
		position: any
		colorToPlay: Color
		castling: any
		enPassantTargetSquare: Square // really [a-h][36]
		plyClock: number
		moveNumber: number
	}
}