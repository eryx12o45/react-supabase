import { useCallback, useEffect, useRef, useState } from 'react'

import { Count, Filter, PostgrestError, Returning } from '../../types.ts'
import { useClient } from '../use-client.ts'
import { initialState } from './state.ts'

export type UseUpdateState<Data = any> = {
    count?: number | null
    data?: Data | Data[] | null
    error?: PostgrestError | null
    fetching: boolean
}

export type UseUpdateResponse<Data = any> = [
    UseUpdateState<Data>,
    (
        values: Partial<Data>,
        filter?: Filter<any, any, any, any, any>,
        options?: UseUpdateOptions,
    ) => Promise<Pick<UseUpdateState<Data>, 'count' | 'data' | 'error'>>,
]

export type UseUpdateOptions = {
    count?: Count
    returning?: Returning
}

export type UseUpdateConfig = {
    filter?: Filter<any, any, any, any, any>
    options?: UseUpdateOptions
}

export function useUpdate<Data = any>(
    table: string,
    config: UseUpdateConfig = { options: {} },
): UseUpdateResponse<Data> {
    const client = useClient()
    const isMounted = useRef(false)
    const [state, setState] = useState<UseUpdateState>(initialState)

    /* eslint-disable react-hooks/exhaustive-deps */
    const execute = useCallback(
        async (
            values: Partial<Data>,
            filter?: Filter<any, any, any, any, any>,
            options?: UseUpdateOptions,
        ) => {
            const refine = filter ?? config.filter
            if (refine === undefined)
                throw new Error(
                    'update() should always be combined with `filter`',
                )

            setState({ ...initialState, fetching: true })
            const source = client
                .from(table)
                .update(values, options ?? config.options)
            const { count, data, error } = await refine(source)

            const res = { count, data, error }
            if (isMounted.current) setState({ ...res, fetching: false })
            return res
        },
        [client],
    )
    /* eslint-enable react-hooks/exhaustive-deps */

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    return [state, execute]
}
