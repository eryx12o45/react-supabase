import React, { useEffect, useReducer } from 'react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { SupabaseRealtimePayload } from '@supabase/supabase-js'

import { UseSelectConfig, UseSelectState, useSelect } from '../data/index.ts'
import { useSubscription } from './use-subscription.ts'

export type UseRealtimeState<Data = any> = Omit<
    UseSelectState<Data>,
    'count'
> & {
    old?: Data[] | null
}

export type UseRealtimeResponse<Data = any> = [
    UseRealtimeState<Data>,
    () => Promise<Pick<
        UseSelectState<Data>,
        'count' | 'data' | 'error'
    > | null>,
]

export type UseRealtimeAction<Data = any> =
    | { type: 'FETCH'; payload: UseSelectState<Data> }
    | { type: 'SUBSCRIPTION'; payload: SupabaseRealtimePayload<Data> }

export type UseRealtimeConfig = {
    select?: Omit<UseSelectConfig, 'pause'>
}

export type UseRealtimeCompareFn<Data = any> = (
    data: Data,
    payload: Data,
) => boolean

type CompareFnDefaultData<Data> = Data & { id: any }

export function useRealtime<Data = any>(
    table: string,
    config?: UseRealtimeConfig,
    compareFn: UseRealtimeCompareFn<Data> = (a, b) =>
        (<CompareFnDefaultData<Data>>a).id ===
        (<CompareFnDefaultData<Data>>b).id,
): UseRealtimeResponse<Data> {
    if (table === '*')
        throw new Error(
            'Must specify table or row. Cannot listen for all database changes.',
        )

    const [result, reexecute] = useSelect<Data>(table, config?.select)
    const [state, dispatch] = useReducer<
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        React.Reducer<UseRealtimeState<Data>, UseRealtimeAction<Data>>
    >(reducer(compareFn), result)

    useSubscription((payload) => dispatch({ type: 'SUBSCRIPTION', payload }), {
        table,
    })

    useEffect(() => {
        dispatch({ type: 'FETCH', payload: result })
    }, [result])

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return [state, reexecute]
}

const reducer =
    <Data = any>(compareFn: UseRealtimeCompareFn<Data>) =>
    (
        state: UseRealtimeState<Data>,
        action: UseRealtimeAction<Data>,
    ): UseRealtimeState => {
        const old = state.data
        switch (action.type) {
            case 'FETCH':
                return { ...state, old, ...action.payload }
            case 'SUBSCRIPTION':
                switch (action.payload.event) {
                    case 'DELETE':
                        return {
                            ...state,
                            data: state.data?.filter(
                                (x) => !compareFn(x, action.payload.old),
                            ),
                            fetching: false,
                            old,
                        }
                    case 'INSERT':
                        return {
                            ...state,
                            data: [...(old ?? []), action.payload.new],
                            fetching: false,
                            old,
                        }
                    case 'UPDATE': {
                        const data = old ?? []
                        const index = data.findIndex((x) =>
                            compareFn(x, action.payload.new),
                        )
                        return {
                            ...state,
                            data: [
                                ...data.slice(0, index),
                                action.payload.new,
                                ...data.slice(index + 1),
                            ],
                            fetching: false,
                            old,
                        }
                    }
                    default:
                        return state
                }
        }
    }
