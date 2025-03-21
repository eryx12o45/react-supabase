import {
    AuthError,
    Provider,
    Session,
    SignInWithPasswordCredentials,
    User,
} from '@supabase/auth-js'
import { useCallback, useState } from 'react'

import { useClient } from '../use-client.ts'
import { initialState } from './state.ts'

export type UseSignInState = {
    error?: AuthError | null
    fetching: boolean
    session?: Session | null
    user?: User | null
}

export type UseSignInResponse = [
    UseSignInState,
    (
        credentials: SignInWithPasswordCredentials,
        options?: UseSignInOptions,
    ) => Promise<Pick<UseSignInState, 'error' | 'session' | 'user'>>,
]

export type UseSignInOptions = {
    redirectTo?: string
    scopes?: string
}

export type UseSignInConfig = {
    provider?: Provider
    options?: UseSignInOptions
}

export function useSignInWithPassword(): UseSignInResponse {
    const client = useClient()
    const [state, setState] = useState<UseSignInState>(initialState)

    const execute = useCallback(
        async (credentials: SignInWithPasswordCredentials) => {
            setState({ ...initialState, fetching: true })
            const { data, error } = await client.auth.signInWithPassword({
                ...credentials,
            })
            const res = { data, error }
            setState({ ...res, fetching: false })
            return res
        },
        [client],
    )

    return [state, execute]
}
