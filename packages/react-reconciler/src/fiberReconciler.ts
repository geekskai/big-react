import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';
import {
	UpdateQueue,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate
} from './updateQueue';
import { ReactElementType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { requestUpdateLane } from './fiberLeans';
import {
	unstable_ImmediatePriority,
	unstable_runWithPriority
} from 'scheduler';

export function createContainer(container: Container) {
	/**
	 * 创建一个FiberNode，对应的tag类型是HostRoot
	 * 如果是一个普通的`<div>...</div>`，在创建其对应的FiberNode的时候，那么对应的tag类型是 HostComponent
	 * 如果是一个函数组件`<App/>`，在创建其对应的FiberNode的时候，那么对应的tag类型是FunctionComponent
	 *
	 * 所以：对于hostRootFiber这个fiber来说有2种含义，
	 * 第一种是：其对应的真实DOM是一个div,
	 * 第二种是：这个div不是普通的div,而且还是整个应用挂载的根节点
	 */
	const hostRootFiber = new FiberNode(HostRoot, {}, null);

	/*
	 * 在FiberRootNode中，将真实DOM和对应的fiber节点进行对应关联，形成关联关系
	 *  1. 将FiberRootNode.current 指向了 hostRootFiber
	 *  2. 将hostRootFiber的真实DOM指向了container
	 */
	const root = new FiberRootNode(container, hostRootFiber);

	/**
	 * FiberNode和 FiberRootNode这两者之间有什么不同呢？
	 * - 首先FiberRootNode对应的fiber节点不是普通的fiber节点，而是整个应用的根fiber节点，所以需要和普通的fiber区别对待
	 * 这个FiberRootNode对应的组件是我们需要挂载的整个应用的根root(也就是：document.getElementById("root"))
	 */

	hostRootFiber.updateQueue = createUpdateQueue();

	return root;
}

// render(<App />) 方法执行的时候就会执行这个方法
export function updateContainer(
	element: ReactElementType | null,
	root: FiberRootNode
) {
	unstable_runWithPriority(unstable_ImmediatePriority, () => {
		const hostRootFiber = root.current;
		const lane = requestUpdateLane();
		const update = createUpdate<ReactElementType | null>(element, lane);
		enqueueUpdate(
			hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
			update
		);
		scheduleUpdateOnFiber(hostRootFiber, lane);
	});

	return element;
}
