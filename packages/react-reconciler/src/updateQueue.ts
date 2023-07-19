import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane, NoLane, isSubsetOfLanes } from './fiberLeans';

export interface Update<State> {
	action: Action<State>;
	lane: Lane;
	next: Update<any> | null;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane
): Update<State> => {
	return {
		action,
		lane,
		next: null
	};
};

export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	} as UpdateQueue<State>;
};

export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	// updateQueue.shared.pending = update;
	const pending = updateQueue.shared.pending;

	if (pending === null) {
		// 假设进来的update为 a, update.next 也是 a,  那么pending 为: a -> a
		update.next = update;
	} else {
		// 假设进来的update为b
		//  c.next = b.next = a
		update.next = pending.next;
		// b.next = c
		pending.next = update;
	}

	//  pending为c: c->a->b->c
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): {
	memoizedState: State;
	baseState: State;
	baseQueue: Update<State> | null;
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
		baseState,
		baseQueue: null
	};

	if (pendingUpdate !== null) {
		// 第一个update
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<any>;

		let newBaseState = baseState;
		let newBaseQueueFirst: Update<State> | null = null;
		let newBaseQueueLast: Update<State> | null = null;

		// newState是本次一次计算得出的结果
		let newState = baseState;

		// 因为pendingUpdate 是一个环状链表
		do {
			const updateLane = pending.lane;
			if (!isSubsetOfLanes(renderLane, updateLane)) {
				// 优先级不够 被跳过
				// clone 就是这个被跳过的update，先保存起来
				const clone = createUpdate(pending.action, pending.lane);
				// 先判断当前这个是不是第一个被跳过的
				if (newBaseQueueFirst === null) {
					// 是当前第一个被跳过的 first=u0 last=u0
					newBaseQueueFirst = clone;
					newBaseQueueLast = clone;
					newBaseState = newState;
				} else {
					// first u0 -> u1->u2
					// last  u2
					// 形成单项链表
					(newBaseQueueLast as Update<State>).next = clone;
					newBaseQueueLast = clone;
				}
			} else {
				// 优先级足够的情况下
				if (newBaseQueueLast !== null) {
					const clone = createUpdate(pending.action, NoLane);
					newBaseQueueLast.next = clone;
					newBaseQueueLast = clone;
				}

				const action = pending.action;
				if (action instanceof Function) {
					newState = action(baseState);
				} else {
					newState = action;
				}
			}
			pending = pending.next as Update<any>;
		} while (pending !== first);

		// 本次计算没有update被跳过
		if (newBaseQueueLast === null) {
			newBaseState = newState;
		} else {
			// 存在update被跳过 将单项链表闭合，形成环状的链表
			newBaseQueueLast.next = newBaseQueueFirst;
		}
		result.memoizedState = newState;
		result.baseState = newBaseState;
		result.baseQueue = newBaseQueueLast;
	}
	return result;
};
