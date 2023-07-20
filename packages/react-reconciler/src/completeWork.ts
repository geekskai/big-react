// 递归中的归阶段

import {
	Container,
	Instance,
	appendInitialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './fiber';
import {
	FunctionComponent,
	HostComponent,
	Fragment,
	HostRoot,
	HostText
} from './workTags';
import { NoFlags, Ref, Update } from './fiberFlags';

function markRef(fiber: FiberNode) {
	fiber.flags |= Ref;
}

function markUpdate(fiber: FiberNode) {
	fiber.flags |= Update;
}

// 递归中的归
export const completeWork = (wip: FiberNode) => {
	const newProps = wip.pendingProps;
	const current = wip.alternate;

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// update
				// 1. props 是否变化{onClick:xx} {onClick:'xxxx'}
				// 2. 变了 Update flag
				markUpdate(wip);

				// 标记Ref
				if (current.ref !== wip.ref) {
					markRef(wip);
				}
			} else {
				// mount
				// 1. 构建DOM
				const instance = createInstance(wip.type, newProps);

				// 2. 将DOM插入到DOM树中
				appendAllChildren(instance, wip);
				wip.stateNode = instance;

				// 标记Ref
				if (wip.ref !== null) {
					markRef(wip);
				}
			}

			bubbleProperties(wip);
			return null;

		case HostText:
			if (current !== null && wip.stateNode) {
				// update
				const oldText = current.memoizedProps.content;
				const newText = newProps.content;

				if (oldText !== newText) {
					markUpdate(wip);
				}
			} else {
				// 1. 构建DOM
				const instance = createTextInstance(newProps.content);
				wip.stateNode = instance;
			}

			bubbleProperties(wip);

			return null;

		case HostRoot:
		case FunctionComponent:
		case Fragment:
			bubbleProperties(wip);
			return null;

		default:
			if (__DEV__) {
				console.log(`🚀 ~ file: completeWork.ts:24 ~ 未处理的wip:`, wip);
			}
			break;
	}
};

function appendAllChildren(parent: Container | Instance, wip: FiberNode) {
	let node = wip.child;

	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node.stateNode);
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === wip) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return; // 回到原点
			}
			node = node.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags;
	let child = wip.child;

	while (child !== null) {
		subtreeFlags |= child.subtreeFlags;
		subtreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}

	wip.subtreeFlags |= subtreeFlags;
}
