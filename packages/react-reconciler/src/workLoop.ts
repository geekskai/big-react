import { scheduleMicroTask } from 'hostConfig';
import { beginWork } from './beginWork';
import { commitMutationEffects } from './commitWork';
import { completeWork } from './completeWork';
import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber';
import { MutationMask, NoFlags } from './fiberFlags';
import {
	Lane,
	NoLane,
	SyncLane,
	getHightPriorityLane,
	markRootFinished,
	mergeLanes
} from './fiberLeans';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { HostRoot } from './workTags';

let workInProgress: FiberNode | null = null;

// 用于保存本次更新的lane
let wipRootRenderLane: Lane = NoLane;

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
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

	//  NoLane 代表没有更新
	if (updateLane === NoLane) {
		return;
	}

	if (updateLane === SyncLane) {
		// 同步优先级 用微任务调度
		if (__DEV__) {
			console.log('在微任务中调度，优先级：', updateLane);
		}
		//   将每次产生的更新就会将 render阶段的入口函数performSyncWorkOnRoot 放进一个syncQueue数组队列中，
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
		//  通过微任务的形式依次循环执行，
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// 其他优先级 用宏任务调度
	}
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	//  由于这个函数会多次执行，需要选出优先级最高的执行
	const nextLane = getHightPriorityLane(root.pendingLanes);

	if (nextLane !== SyncLane) {
		// 非同步优先级，可能是其他比SyncLane低的优先级，也可能是NoLane
		ensureRootIsScheduled(root);
		return;
	}

	if (__DEV__) {
		console.warn('render 阶段开始');
	}

	//初始化
	prepareFreshStack(root, lane);

	do {
		try {
			// render 阶段
			workLoop();
			break;
		} catch (error) {
			if (__DEV__) {
				console.log(`🚀 ~ file: workLoop.ts:16 ~ error:`, error);
			}
		}
	} while (true);

	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	root.finishLane = lane;
	wipRootRenderLane = NoLane;

	// wip fiberNode树,树中的flags
	commitRoot(root);
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

	// 判断是否存在3个子阶段需要执行的操作
	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subtreeHasEffect || rootHasEffect) {
		// beforeMutation
		//  mution Placement
		//  layout
		commitMutationEffects(finishedWork);
		root.current = finishedWork;
	} else {
		root.current = finishedWork;
	}
}

function workLoop() {
	while (workInProgress !== null) {
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
