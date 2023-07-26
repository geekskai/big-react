# react18

从0到1实现react18的功能

## 初始化搭建整个项目的工程

1. 定义项目结构（monorepo）
2. 定义开发规范（lint、commit、tsc、代码风格）
3. 选择打包工具（rollup）

## 实现JSX

1. 实现ReactElement 构造函数

- 新建 packages/shared/ReactSymbols.ts 用于存放独一无二的类型

2. 实现jsx方法和使用rollup打包

3. 实现 Reconciler(协调器)

- 首先为什么react 需要使用到 Reconciler ?

- 什么是jsx?
  jsx 是由开发者编写的代码，经Babel编译成jsx方法的执行，执行的方法的返回值就是一个react element。
  介于react element和DOM element之间的一种数据结构那就是FiberNode

- 什么是FiberNode（虚拟DOM在react中的实现）
  因为单独的react element无法表现出节点与节点相互之间的关系，无法表达当前组件的状态，所以需要一种新的数据结构，这种数据结构介于React Element与真实dom之间。而且还能表达出节点于节点之间的关系，也要能方便拓展，不仅能做完数据存储单元，还能做完工作单元。

```
class FiberNode {
	type: any;
	tag: WorkTag;
	pendingProps: Props;
	key: Key;
	stateNode: any;
	ref: Ref;

	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;

	memoizedProps: Props | null;
	alternate: FiberNode | null;
	flags: Flags;

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		// 实例
		this.tag = tag;
		this.key = key;
		// HostComponent <div> div DOM
		this.stateNode = null;
		// FunctionComponent 是具体的函数 () => {}
		this.type = null;

		// 构成树状结构
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;

		this.ref = null;

		// 作为工作单元
		this.pendingProps = pendingProps;
		this.memoizedProps = null;

		this.alternate = null;
		// 副作用
		this.flags = NoFlags;
	}
}

```

#### reconciler的工作方式

- 对于同一个节点，比较其React Element 与FiberNode，同时生成子FiberNode，根据比较的结果，生成不同的标记（比如说：插入，移动，删除等）

1. 比如说需要在页面上挂载 `<div>foo</div>`，这段代码经过jsx("div")转换后，生成React Element，然后将React Element与当前的FiberNode进行比较，由于是第一次挂载，当前的FiberNode为null，所以比较的结果是生成新的子FiberNode,然后给子FiberNode打上Placement的标记

2. 如果说将`<div>foo</div>` 更新为`<p>foo</p>`,那么同样这段代码经过jsx("p")转换后，生成React Element,然后拿这个React Element和p对应的 FiberNode(那么此时这个FiberNode就是一个type为div的FiberNode)进行比较，然后生成子fibreNode，将div对应的fiberNode 标记为Deletion，将p对应的fiberNode标记为Placement

3. 当所有ReactElement比较完后，会生成一棵fiberNode树，一共会存在两棵fiberNode树：

- current：与视图中真实UI对应的fiberNode树
- workInProgress：触发更新后，正在reconciler中计算的fiberNode树

### jsx的执行顺序

以DFS（深度优先遍历）的顺序遍历ReactElement，这意味着：

如果有子节点，遍历子节点
如果没有子节点，遍历兄弟节点

这是个递归的过程，存在递、归两个阶段：

递：对应beginWork
归：对应completeWork

## 从入口开始分析

假如有以下代码：

```
const root = document.getElementById("root");

const App = ()=>{

    return <div>hello world</div>
}

ReactDOM.createRoot(root).render(<App />);

```

对于在react-dom中createRoot（简化版本）如下：

```
export function createRoot(container: Container) {
	const root = createContainer(container);

	return {
		render(element: ReactElementType) {
			initEvent(container, 'click');
			return updateContainer(element, root);
		}
	};
}
```

先将createRoot 分开为以下2步分别执行：

第一步：ReactDOM.createRoot(root) 对应执行的是`createContainer(container);`返回`root`,然后看下createContainer的具体实现（简化版本）如下：

```
// container就是#root对应的真实DOM Element
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
	 *  2. 将hostRootFiber的真实DOM指向了container （hostRootFiber.stateNode = FiberRootNode）
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

export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null
		},
    // 省略其他代码...
	} as UpdateQueue<State>;
};

```

第二步：`ReactDOM.createRoot(root).render(<App />);`中的 `render(<App />);`

```
render(element: ReactElementType) {
    // 省略其他代码...
	return updateContainer(element, root);
}

export function updateContainer(element: ReactElementType | null, root: FiberRootNode) {
    // 省略其他代码...

    const hostRootFiber = root.current;

    // 创建新的update对象
    const update = createUpdate<ReactElementType | null>(element);

    // 将新的update对象并将其放入hostRootFiber的updateQueue中
    enqueueUpdate(
        hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
        update
    );

    // 开启调度功能
    scheduleUpdateOnFiber(hostRootFiber);

    // 省略其他代码...

   return element;
}

```

现在看下 `scheduleUpdateOnFiber` 的实现

```
// 简化版的调度功能
export function scheduleUpdateOnFiber(fiber: FiberNode) {
    /**
     * 为啥要先获取root呢？
     * 因为任意一次更新，都是需要从hostRootFiber开始调度的，但是更新不一定只发生在root组件中，也有可能发生在其他任意组件中，
     * 所以只要发生更新，就需要从当前组件的fiber开始向上查找，直到找到 hostRootFiber
     */
	const root = markUpdateFromFiberToRoot(fiber);

    // 此时从root开始渲染，请看renderRoot的具体实现
	renderRoot(root);
}

//  从传入的fiber开始，向上查找，直到找到FiberRootNode为止
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;

   // 如果一个fiber.return存在，那么这个fiber肯定不是hostRootFiber，因为hostRootFiber没有return,只有stateNode
 	while (parent !== null) {
		node = parent;
		parent = node.return;
	}

   // 如果一直向上找直到parent为null，那么判断当前fiber的tag是否是HostRoot，
   // 如果是就直接返回stateNode，因为hostRootFiber.stateNode 就是hostRootFiber
	if (node.tag === HostRoot) {
		return node.stateNode;
	}

	return null;
}

let workInProgress: FiberNode | null = null;

function prepareFreshStack(root: FiberRootNode) {
	// 创建hostRootFiber的workInProgress树
	workInProgress = createWorkInProgress(root.current, {});
}

function renderRoot(root: FiberRootNode) {
	// 初始化
	prepareFreshStack(root);

	do {
		try {
			workLoop();
			break;
		} catch (e) {
			console.warn('workLoop发生错误', e);
			workInProgress = null;
		}
	} while (true);

    // 当执行完了 workLoop 之后，就会形成一个workInProgress树
	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;

	// 实现commit阶段 wip fiberNode树 树中的flags
	commitRoot(root);
}

```

在renderRoot中，初始化的时候会在调用prepareFreshStack，创建一个hostRootFiber类型的workInProgress树，之后进入执行workLoop函数阶段

```

function workLoop() {
	// 第一个workInProgress肯定是初始化的时候hostRootFiber类型的workInProgress
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	// 开始向下递阶段的执行beginWork
	const next = beginWork(fiber);
	fiber.memoizedProps = fiber.pendingProps;

	// 如果递阶段完成了，那么就是归阶段开始
	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}
```

beginWork 的工作流程:
如果是HostRoot类型的，那么就需要计算状态的最新值，然后创造子fiberNode

```
export const beginWork = (wip: FiberNode) => {
	// 比较，创建并返回子fiberNode
	switch (wip.tag) {
		case HostRoot:
			// 目的是计算状态的最新值，然后创造并返回子fiberNode
			return updateHostRoot(wip);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
			break;
	}
	return null;
};

function updateHostRoot(wip: FiberNode) {
	// 取到上一次的值
	const baseState = wip.memoizedState;
	// 从updateQueue中取出即将更新的数据
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	// pending就是即将需要更新的数据，先用一个变量保存起来
	const pending = updateQueue.shared.pending;
	// 更新完了就直接重置为null,因为数据已经保存在pending中了。
	updateQueue.shared.pending = null;
	// 进入计算更新值的阶段，memoizedState就是计算更新后的最终结果
	const { memoizedState } = processUpdateQueue(baseState, pending);
	// 计算更新后的最终结果更新到wip中
	wip.memoizedState = memoizedState;

   // 对于 HostRoot 类型的fiber来说，memoizedState其实就是一个App类型的 ReactElement
	const nextChildren = wip.memoizedState;

	// 在这个函数中创建子fiber，并将其更新到wip.child中,加下来看下这个函数的实现
	reconcileChildren(wip, nextChildren);

	// 返回子fiber
	return wip.child;
}
```

processUpdateQueue就是执行具体更新方法的

```
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null
): { memoizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	};
	if (pendingUpdate !== null) {
		// action 可能是开发者传入的一个函数（this.setState(state=>state+1)）或者一个具体值(比如说：this.setState(state))
		const action = pendingUpdate.action;
		// action 如果是函数比如说：state=>state+1
		if (action instanceof Function) {
			// baseState 1 update (x) => 4x -> memoizedState 4
			result.memoizedState = action(baseState);
		} else {
			// baseState 1 update 2 -> memoizedState 2
			result.memoizedState = action;
		}
	}
	return result;
};
```

通过对比，创建子fiber节点并将其更新到wip.child中

```
function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
	// current 就是当前已经渲染在界面中的fiber树，
	const current = wip.alternate;

	// current.child就是老数据，children就是新数据，需要将两者进行对比，从而产生新的子fiber

	if (current !== null) {
		// update
		wip.child = reconcileChildFibers(wip, current.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
}
```

接下来就是重点ChildReconciler，有2点比较重要，第一点是通过子element创建子fiber的方式，第二点是给子fiber打上flag的标识，

```
function ChildReconciler(shouldTrackEffects: boolean) {
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		// 根据element创建fiber
		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}
	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffects && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	) {
		// 判断当前fiber的类型
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);
				default:
					if (__DEV__) {
						console.warn('未实现的reconcile类型', newChild);
					}
					break;
			}
		}
		// TODO 多节点的情况 ul> li*3

		// HostText
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}

		if (__DEV__) {
			console.warn('未实现的reconcile类型', newChild);
		}
		return null;
	};
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);


```

执行完了所有beginWork之后，就进入了completeWork阶段，completeWork 需要解决的其中一个问题就是：对Host类型的FiberNode构建离屏DOM树

```
function completeUnitOfWork(fiber: FiberNode) {
let node: FiberNode | null = fiber;

    do {
    	completeWork(node);

    	const sibling = node.sibling;

    	if (sibling !== null) {
			// 如果存在sibling，那么sibling 开始进入beginWork
    		workInProgress = sibling;

    		return;
    	}
    	node = node.return;
    	workInProgress = node;
    } while (node !== null);

}
```

### 实现commit阶段的3个子阶段

commit阶段主要是执行root上面的flags和subtreeFlags这些mutation

1. beforeMutation阶段
2. mutation阶段
3. layout阶段

```

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;

	if (finishedWork === null) {
		return;
	}

	if (__DEV__) {
		console.warn('commit阶段开始', finishedWork);
	}

	// 重置
	root.finishedWork = null;

	const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

    // 先判断root或者children有没有需要执行的Effect
	if (subtreeHasEffect || rootHasEffect) {

		commitMutationEffects(finishedWork);

		// 进行视图切换
		root.current = finishedWork;
	} else {
		root.current = finishedWork;
	}
}
```

```
export const commitMutationEffects = (finishedWork: FiberNode) => {
	nextEffect = finishedWork;

	while (nextEffect !== null) {
		// 向下遍历
		const child: FiberNode | null = nextEffect.child;

		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			// 向上遍历 DFS
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;

				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
};


const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags;

	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		// 执行对应的方法之后，再将flags删除
		finishedWork.flags &= ~Placement;
	}
	// flags Update
	// flags ChildDeletion
};

const commitPlacement = (finishedWork: FiberNode) => {
	// 通过fiber找到 parent 的真实DOM节点
	const hostParent = getHostParent(finishedWork);
	// finishedWork ~~ DOM append parent DOM
	if (hostParent !== null) {
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	}
};

// 通过fiber找到HostParent类型的真实DOM节点
function getHostParent(fiber: FiberNode): Container | null {
	let parent = fiber.return;

	while (parent) {
		const parentTag = parent.tag;
		// HostComponent HostRoot
		if (parentTag === HostComponent) {
			return parent.stateNode as Container;
		}
		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		parent = parent.return;
	}
	if (__DEV__) {
		console.warn('未找到host parent');
	}
	return null;
}

// 只有tag是host类型的fiber对应的stateNode 才是DOM的真实节点
function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container
) {
	// fiber host
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		appendChildToContainer(hostParent, finishedWork.stateNode);
		return;
	}
	// 如果存在child 继续执行appendPlacementNodeIntoContainer直到是tag类型是HostComponent或者HostText为止
	const child = finishedWork.child;
	if (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent);
		let sibling = child.sibling;

		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
```

## 简单总结

1. beginWork阶段，就是递归过程中使用DFS遍历，从root顶部根节点往下子节点归的过程，这个过程中会通过ReactElement生成与之对应的子fiber节点，同时给fiber打上是移动，还是删除等标记，直到往下归到最后的节点child为null的时候，递阶段结束此时一颗完整的 workInProgress 树也生成了，接下来就开始进入了归的complete的阶段
2. complete阶段是从最底部的fiber节点开始向上归的过程，在这个过程中收集在递阶段的fiber节点是否有打上标记的flags,根据对应的flags,执行实质性的DOM操作进行渲染。
