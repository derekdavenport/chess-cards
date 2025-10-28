import { atom } from 'jotai'
import { TAuthConfig, TRefreshTokenExpiredEvent } from "react-oauth2-code-pkce"

export const tokenAtom = atom<string>('')
export const authConfig: TAuthConfig = {
	clientId: 'chess.context.cards',
	authorizationEndpoint: 'https://lichess.org/oauth',
	tokenEndpoint: 'https://lichess.org/api/token',
	redirectUri: 'http://localhost:5173',
	scope: 'study:read study:write',
	state: 'nothing',
	autoLogin: false,
	decodeToken: false,
	onRefreshTokenExpire: (event: TRefreshTokenExpiredEvent) => event.logIn(undefined, undefined, "replace"), // 'redirect' | 'replace' | 'popup'
}