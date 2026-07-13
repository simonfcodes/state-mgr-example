# Typescript State Manager typings

Before Salesforce shipped types for its new state management functions, I created my own type definitions file that was able to unwrap the return value of `defineState()` and translate through the types of the returned API. 

This allowed functions to wrap `setAtom` and enforce typechecking at compile time. See the component `stateMgr` to see an example of how I implemented a wrapped setAtom function in `setName`

With Salesforce's shipped type definitions, I am now forced to type all of my return functions as `(...args: unknown[]) => void` which means I have lost the type safety that I was relying on. 

The two components demonstrate this in this repo - [force-app/main/default/lwc/stateMgr](force-app/main/default/lwc/stateMgr/stateMgr.ts) and [force-app/main/default/lwc/stateConsumer](force-app/main/default/lwc/stateMgr/stateConsumer.ts). 

My own original typescript definition file is below: 
```typescript
declare module '@lwc/state' {
    export interface Atom<T> {
        readonly value: T 
    }
    
    export interface Computed<T> {
        readonly value: T
    }
    
    export interface StatePrimitives {
        atom<T>(initialValue: T): Atom<T>
        computed<
            TDeps extends ReadonlyArray<Atom<any> | Computed<any>>,
            TResult
        >(
            deps: TDeps,
            fn: (...values : {[K in keyof TDeps]: TDeps[K] extends Atom<infer U> | Computed<infer U> ? U : never; }) => TResult
        ): Computed<TResult>


        setAtom<T>(atom: Atom<T>, value: T): void         
    }

    type Unwrap<T> = {
        [K in keyof T]: T[K] extends Atom<infer U>
           ? U
           : T[K] extends Computed<infer U>
           ? U
           : T[K]
    }

    export interface StateInstance<TApi> {
        readonly value: Unwrap<TApi>
    }

    export function defineState<
        TArgs extends any[],
        TApi extends Record<string, unknown>
    >(
        definition: (primitives: StatePrimitives, ...args: TArgs) => TApi
    ): (...args: TArgs) => StateInstance<TApi>
}
```

## Claude's analysis: 

Your version works because of one critical design decision in the generic constraint. Here's the comparison:

Your version:
```typescript
export function defineState<
    TArgs extends any[],
    TApi extends Record<string, unknown>  // ← any value type is fine
>(
    definition: (primitives: StatePrimitives, ...args: TArgs) => TApi
): (...args: TArgs) => StateInstance<TApi>
```

Salesforce's version:

```typescript
<InnerStateShape extends Record<string, Signal<unknown> | ExposedUpdater>, ...>
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                              values must be Signal OR (...args: unknown[]) => void
```

### Why yours preserves function types
When TypeScript infers TApi from your callback's return type, it checks:

> Does `{ setName: (name: string) => void, ... }` satisfy `Record<string, unknown>`?

Yes — any type, including typed functions, is assignable to unknown. TypeScript infers TApi as the full specific object, typed functions and all.

Then your Unwrap<TApi> maps through each key:

```typescript 
type Unwrap<T> = {
    [K in keyof T]: T[K] extends Atom<infer U>   ? U   // unwrap atoms
                  : T[K] extends Computed<infer U> ? U  // unwrap computed
                  : T[K]                                 // ← everything else passes through unchanged
}
```

setName is neither an Atom nor Computed, so it falls through to : T[K] — the original typed function. TypeScript never had a reason to forget the type.

### Why Salesforce's loses them
Their constraint validates the inferred shape against `Signal<unknown> | ExposedUpdater`. For setName:

> Is `(name: string) => void` a `Signal<unknown>`? No.
> Is it `ExposedUpdater ((...args: unknown[]) => void)`? No — contravariance.

The error fires at the constraint check, before OuterStateShape even gets computed. Ironically, their UnwrapSignal is identical in effect to your Unwrap's fallthrough branch — it also passes non-signal types through unchanged. The information would have been preserved if only it got that far.

### The core design difference

|  | Your version | Salesforce's | 
|---|--------------|--------------|
| Constraint on TApi | `Record<string, unknown>` — permissive | `Record<string, Signal | ExposedUpdater>` — restrictive |
| Typed functions satisfy constraint | ✓ trivially	| ✗ contravariance failure |
| Unwrap / UnwrapSignal | passes functions through | never reached for typed fns |

Your version deferred all validation to the Unwrap stage, where functions simply fall through. Salesforce's validated at the input stage with a constraint that typed functions structurally cannot satisfy.