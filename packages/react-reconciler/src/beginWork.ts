import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { UpdateQueue, processUpdateQueue } from './updateQueue';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	Fragment,
	HostText
} from './workTags';
import { mountChildFibers, reconcileChildFibers } from './childFibers';
import { renderWithHooks } from './fiberHooks';
import { Lane } from './fiberLeans';
import { Ref } from './fiberFlags';

// 递归中的递阶段
export const beginWork = (workInProgress: FiberNode, renderLane: Lane) => {
	//比较，然后返回子fiberNode

	switch (workInProgress.tag) {
		case HostRoot:
			return updateHostRoot(workInProgress, renderLane);

		case HostComponent:
			return updateHostComponent(workInProgress, renderLane);

		case HostText:
			return null;

		case FunctionComponent:
			return updateFunctionComponent(workInProgress, renderLane);

		case Fragment:
			return updateFragment(workInProgress);

		default:
			if (__DEV__) {
				console.warn('在beginWork 中，出现未实现的类型！');
			}
			break;
	}

	return null;
};

function updateFragment(workInProgress: FiberNode) {
	const nextChildren = workInProgress.pendingProps;
	reconcileChildren(workInProgress, nextChildren);
	return workInProgress.child;
}

function updateFunctionComponent(workInProgress: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(workInProgress, renderLane);
	reconcileChildren(workInProgress, nextChildren);
	return workInProgress.child;
}

function updateHostRoot(workInProgress: FiberNode, renderLane: Lane) {
	const baseState = workInProgress.memoizedState;
	const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>;

	const pending = updateQueue.shared.pending;

	updateQueue.shared.pending = null;

	const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
	workInProgress.memoizedState = memoizedState;

	const nextChildren = workInProgress.memoizedState;

	reconcileChildren(workInProgress, nextChildren);

	return workInProgress.child;
}

// TODO: renderLane
function updateHostComponent(workInProgress: FiberNode, renderLane: Lane) {
	// 根据element创建fibreNode
	const nextProps = workInProgress.pendingProps;
	const nextChildren = nextProps.children;

	markRef(workInProgress.alternate, workInProgress);
	reconcileChildren(workInProgress, nextChildren);

	return workInProgress.child;
}
function reconcileChildren(
	workInProgress: FiberNode,
	children?: ReactElementType
) {
	const current = workInProgress.alternate;

	if (current !== null) {
		// update
		workInProgress.child = reconcileChildFibers(
			workInProgress,
			current?.child,
			children
		);
	} else {
		// mount
		workInProgress.child = mountChildFibers(workInProgress, null, children);
	}

	// reconcileChildFibers(workInProgress, current?.child, children);
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
	const ref = workInProgress.ref;

	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref !== ref)
	) {
		workInProgress.flags |= Ref;
	}
}
