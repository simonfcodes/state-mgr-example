import { LightningElement } from 'lwc';
import { createState, State } from 'c/stateMgr';

export default class StateConsumer extends LightningElement {
    state = createState()

    handleNameChange(event: CustomEvent<{value: string}>) {
        const newName = event.detail.value
        this.state.value.setName(newName) // No error, but also no type enforcement. setName should be typed to only accept a string. 
        this.state.value.setName(true) // This line should throw a Typescript error, but it doesn't. The type of setName is being inferred as (...args: unknown[]) => void, which is too permissive.        
    }

}