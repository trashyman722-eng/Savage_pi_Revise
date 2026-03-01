// core/types.ts

// Define the types for the state machine

// Define possible events
export type Event =  
    | 'START'
    | 'STOP'
    | 'PAUSE'
    | 'RESUME';

// Define possible states
export type State = 
    | 'IDLE'
    | 'RUNNING'
    | 'PAUSED'
    | 'STOPPED';

// Define the state machine interface
export interface StateMachine {
    currentState: State;
    // Function to handle events and transition between states
    handleEvent(event: Event): void;
}

// Example of initial state
export const initialStateMachine: StateMachine = {
    currentState: 'IDLE',
    handleEvent(event) {
        switch (this.currentState) {
            case 'IDLE':
                if (event === 'START') this.currentState = 'RUNNING';
                break;
            case 'RUNNING':
                if (event === 'STOP') this.currentState = 'STOPPED';
                else if (event === 'PAUSE') this.currentState = 'PAUSED';
                break;
            case 'PAUSED':
                if (event === 'RESUME') this.currentState = 'RUNNING';
                break;
            case 'STOPPED':
                if (event === 'START') this.currentState = 'RUNNING';
                break;
            default:
                throw new Error(`Unhandled state: ${this.currentState}`);
        }
    }
};