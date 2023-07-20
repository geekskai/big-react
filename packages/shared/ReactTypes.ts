export type Type = any;
export type Key = string | null;
export type Ref = { current: any } | ((instance: any) => void) | null;
export type Props = any;
export type ElementType = any;

export interface ReactElementType {
	$$typeof: symbol | number;
	type: ElementType;
	key: Key;
	props: Props;
	ref: Ref;
	__mark: string;
}

export type Action<State> = State | ((preState: State) => State);
