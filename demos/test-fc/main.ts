import {
	CallbackNode,
	unstable_ImmediatePriority as ImmediatePriority, //  同步优先级 1 最高优先级
	unstable_UserBlockingPriority as UserBlockingPriority, // 2 用户点击事件
	unstable_NormalPriority as NormalPriority, // 3 正常优先级
	unstable_LowPriority as LowPriority, // 4 低优先级
	unstable_IdlePriority as IdlePriority, // 5 空闲优先级
	unstable_scheduleCallback as scheduleCallback,
	unstable_getFirstCallbackNode as getFirstCallbackNode,
	unstable_cancelCallback as cancelCallback,
	unstable_shouldYield as shouldYield // shouldYield为true代表时间切片用尽，应该让出执行权
} from 'scheduler';

import './style.css';

const button = document.querySelector('button');
const root = document.querySelector('#root');

type Priority =
	| typeof ImmediatePriority
	| typeof UserBlockingPriority
	| typeof NormalPriority
	| typeof LowPriority
	| typeof IdlePriority;

interface Work {
	count: number; // 代表render的次数
	priority: Priority;
}

const workList: Work[] = [];

let prevPriority: Priority = IdleDeadline;

let curCallback: CallbackNode | null = null;

[LowPriority, NormalPriority, UserBlockingPriority, ImmediatePriority].forEach(
	(priority) => {
		const btn = document.createElement('button');
		root?.appendChild(btn);
		btn.innerText = [
			'',
			'ImmediatePriority',
			'UserBlockingPriority',
			'NormalPriority',
			'LowPriority'
		][priority];

		btn.onclick = () => {
			workList.unshift({
				count: 100,
				priority: priority as Priority
			});
			schedule();
		};
	}
);

// 调度流程
function schedule() {
	const cbNode = getFirstCallbackNode();
	// 从小到大排序
	const [curWork] = workList.sort(
		(work1, work2) => work1.priority - work2.priority
	);
	// 策略逻辑
	if (!curWork) {
		curCallback = null;
		cbNode && cancelCallback(cbNode);
		return;
	}
	const { priority: curPriority } = curWork;

	if (curPriority === prevPriority) {
		return;
	}

	// 出现更高优先级的work，取消之前的，然后调度新的
	cbNode && cancelCallback(cbNode);
	curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}
/**
 * 会影响中断的几点：
 * 1. work.priority
 * 2. 饥饿问题 didTimeout
 * 3. 时间切片是否够用
 *
 * @param {Work} work
 */
function perform(work: Work, didTimeout?: boolean) {
	//  是否需要同步执行有以下2点，要么是优先级是同步的，要么已经快过期了
	const needSync = work.priority === ImmediatePriority || didTimeout;
	//  是同步任务，或者时间切片够用的情况下执行任务
	while ((needSync || !shouldYield()) && work.count) {
		//  这个地方可能造成很长的宏任务，是不可中断的会阻塞，就在这个地方切片
		work.count--;
		insertSpan(`${work.priority}`);
	}

	// 此时可能是中断执行了 或者是 执行完
	prevPriority = work.priority;
	if (!work.count) {
		const workIndex = workList.indexOf(work);
		workList.splice(workIndex, 1);
		prevPriority = IdlePriority;
	}

	const prevCallback = curCallback;
	schedule();
	const newCallback = curCallback;

	if (newCallback && prevCallback === newCallback) {
		return perform.bind(null, work);
	}
}

function insertSpan(content) {
	const span = document.createElement('span');
	span.innerText = content;

	span.className = `pri-${content}`;
	doSomeBusyWork(1000000);
	root?.appendChild(span);
}

function doSomeBusyWork(len: number) {
	let result = 0;

	while (len--) {
		result += len;
	}
}
