import { scheduleMicroTask } from 'hostConfig';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitLayoutEffects,
	commitMutationEffects
} from './commitWork';
import { completeWork } from './completeWork';
import {
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects,
	createWorkInProgress
} from './fiber';
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags';
import {
	Lane,
	NoLane,
	SyncLane,
	getHightPriorityLane,
	lanesToSchedulerPriority,
	markRootFinished,
	mergeLanes
} from './fiberLeans';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { HostRoot } from './workTags';

import {
	unstable_cancelCallback as cancelCallback,
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority,
	unstable_shouldYield,
	unstable_cancelCallback
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null;

// 用于保存本次更新的lane
let wipRootRenderLane: Lane = NoLane;

// 防止执行commit的时候，执行多次操作
let rootDoesHasPassiveEffects = false;

type RootExitStatus = number;

const RootInComplete = 1; // 中断了
const RootCompleted = 2; // 完成了

// TODO: 执行过程中报错了

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishLane = NoLane;
	root.finishedWork = null;
	workInProgress = createWorkInProgress(root.current, {});
	wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	// TODO: 调度功能
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdated(root, lane);
	ensureRootIsScheduled(root);
}
// schedule 阶段入口
function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHightPriorityLane(root.pendingLanes);

	const existingCallback = root.callbackNode;

	//  NoLane 代表没有更新
	if (updateLane === NoLane) {
		if (existingCallback !== null) {
			unstable_cancelCallback(existingCallback);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const curPriority = updateLane;
	const prevPriority = root.callbackPriority;

	if (curPriority === prevPriority) {
		return;
	}

	//出现了不同的优先级 取消之前的调度
	if (existingCallback !== null) {
		unstable_cancelCallback(existingCallback);
	}

	let newCallbackNode = null;

	if (__DEV__) {
		console.log(
			`在${updateLane === SyncLane ? '微' : '宏'}任务中调度，优先级：`,
			updateLane
		);
	}

	if (updateLane === SyncLane) {
		// 同步优先级 用微任务调度

		//   将每次产生的更新就会将 render阶段的入口函数performSyncWorkOnRoot 放进一个syncQueue数组队列中，
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
		//  通过微任务的形式依次循环执行，
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// 其他优先级 用宏任务调度
		const schedulerPriority = lanesToSchedulerPriority(updateLane);
		newCallbackNode = scheduleCallback(
			schedulerPriority,
			// @ts-ignore
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}
	root.callbackNode = newCallbackNode;
	root.callbackPriority = curPriority;
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	// 保证useEffect 回调执行
	const curCallback = root.callbackNode;
	const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects);

	if (didFlushPassiveEffect) {
		if (root.callbackNode !== curCallback) {
			//  触发了更新，且更新的优先级比当前高
			return null;
		}
	}

	const lane = getHightPriorityLane(root.pendingLanes);

	const curCallbackNode = root.callbackNode;
	if (lane === NoLane) {
		return null;
	}

	const needSync = lane === SyncLane || didTimeout;
	// render 阶段
	const exitStatus = renderRoot(root, lane, !needSync);

	ensureRootIsScheduled(root);

	if (exitStatus === RootInComplete) {
		// 中断
		if (root.callbackNode !== curCallbackNode) {
			//  有更高优先级的事情进来
			return null;
		}
		return performConcurrentWorkOnRoot.bind(null, root);
	}

	if (exitStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishLane = lane;
		wipRootRenderLane = NoLane;

		commitRoot(root);
	} else if (__DEV__) {
		console.error(`还未实现的并发更新结束状态`);
	}
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	//  由于这个函数会多次执行，需要选出优先级最高的执行
	const nextLane = getHightPriorityLane(root.pendingLanes);

	if (nextLane !== SyncLane) {
		// 非同步优先级，可能是其他比SyncLane低的优先级，也可能是NoLane
		ensureRootIsScheduled(root);
		return;
	}

	const exitStatus = renderRoot(root, nextLane, false);

	if (exitStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishLane = nextLane;
		wipRootRenderLane = NoLane;

		// wip fiberNode树,树中的flags
		commitRoot(root);
	} else if (__DEV__) {
		console.error(`还未实现的同步更新结束状态`);
	}
}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
	if (__DEV__) {
		console.log(`开始${shouldTimeSlice ? '并发' : '同步'}更新`, root);
	}

	if (wipRootRenderLane !== lane) {
		//初始化
		prepareFreshStack(root, lane);
	}

	do {
		try {
			// render 阶段
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (error) {
			if (__DEV__) {
				console.log(`🚀 ~ file: workLoop.ts:16 ~ error:`, error);
			}
		}
	} while (true);

	// 中断执行
	if (shouldTimeSlice && workInProgress !== null) {
		return RootInComplete;
	}
	// render阶段执行完
	if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
		console.error(`render阶段结束时wip不应该不是null`);
	}

	// TODO: 报错
	return RootCompleted;
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;

	if (finishedWork === null) {
		return;
	}

	if (__DEV__) {
		console.warn(`commit阶段开始`, finishedWork);
	}
	const lane = root.finishLane;

	if (lane === NoLane && __DEV__) {
		console.error('commit阶段finishLane不应该是NoLane');
	}

	// 重置
	root.finishedWork = null;
	root.finishLane = NoLane;

	// 从一个lanes中移除某个lane
	markRootFinished(root, lane);

	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		rootDoesHasPassiveEffects = true;
		// 调度副作用
		scheduleCallback(NormalPriority, () => {
			// 执行副作用
			flushPassiveEffects(root.pendingPassiveEffects);
			return;
		});
	}

	// 判断是否存在3个子阶段需要执行的操作
	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subtreeHasEffect || rootHasEffect) {
		//阶段1/3: beforeMutation

		//阶段2/3  Mutation Placement
		commitMutationEffects(finishedWork, root);

		// fiber Tree 切换
		root.current = finishedWork;

		//阶段3/3  layout
		commitLayoutEffects(finishedWork, root);
	} else {
		root.current = finishedWork;
	}

	rootDoesHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	let didFlushPassiveEffect = false;
	pendingPassiveEffects.unmount.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.unmount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];

	// 在回调的过程中也有可能触发新的更新，需要重新flush一下
	flushSyncCallbacks();
	return didFlushPassiveEffect;
}

function workLoopSync() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}
function workLoopConcurrent() {
	while (workInProgress !== null && !unstable_shouldYield()) {
		performUnitOfWork(workInProgress);
	}
}
function performUnitOfWork(fiber: FiberNode) {
	// 这个next 可能是当前fiber的子fiber 也可能是null
	const next = beginWork(fiber, wipRootRenderLane);
	// 结束之后
	fiber.memoizedProps = fiber.pendingProps;

	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}
function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		completeWork(node);

		const sibling = node.sibling;

		if (sibling !== null) {
			workInProgress = sibling;

			return;
		}
		node = node.return;
		workInProgress = node;
	} while (node !== null);
}
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;

	while (parent !== null) {
		node = parent;
		parent = node.return;
	}

	if (node.tag === HostRoot) {
		return node.stateNode;
	}

	return null;
}
