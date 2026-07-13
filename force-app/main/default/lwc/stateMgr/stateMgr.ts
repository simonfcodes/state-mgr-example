import { defineState } from '@lwc/state'

export interface State {
    id: string
    name: string
    email: string
    age: number
    isActive: boolean
}

export const createState = defineState(
    ({atom, computed, setAtom}) => {
        const state = atom<State>({
            id: '',
            name: '',
            email: '', 
            age: 0,
            isActive: false
        })

        const patchState = (partialState: Partial<State>) => {
            setAtom(state, ({...state, ...partialState}))
        }

        const setName = (name: string) => {
            setAtom(state, ({...state, name: name}))
        }

        // This line is what allows me to export patchState as a function that can be called with any number of arguments, 
        // even though it only takes one argument. This is necessary because the LWC state management system expects an updater function 
        // that can take any number of arguments, but in this case we only need to pass in a single argument (the partial state).
        type Updater = (...args: unknown[]) => void

        return {
            state,
            // Remove the type assertion here to expose the Typescript error at line 12. 
            patchState: patchState as Updater,
            setName: setName as Updater
        }
    }
)