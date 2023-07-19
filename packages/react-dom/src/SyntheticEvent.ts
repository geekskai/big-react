// 合成事件

import { Container } from 'hostConfig';
import {
	unstable_IdlePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority,
	unstable_runWithPriority
} from 'scheduler';
import { Props } from 'shared/ReactTypes';

export const elementPropsKey = '__props';

const validEventList = ['click'];

type EventCallback = (event: Event) => void;

interface SyntheticEvent extends Event {
	__stopPropagation: boolean;
}

interface Paths {
	capture: EventCallback[];
	bubble: EventCallback[];
}

export interface DOMElement extends Element {
	[elementPropsKey]: Props;
}
// dom[xx] = createElement props
export function updateFiberProps(node: DOMElement, props: Props) {
	node[elementPropsKey] = props;
}

export function initEvent(container: Container, eventType: string) {
	if (!validEventList.includes(eventType)) {
		console.warn(`当前不支持${eventType}事件！`);
		return;
	}

	if (__DEV__) {
		console.log(`初始化事件：${eventType}`);
	}

	container.addEventListener(eventType, (event) => {
		dispatchEvent(container, eventType, event);
	});
}

function createSyntheticEvent(event: Event) {
	const syntheticEvent = event as SyntheticEvent;
	syntheticEvent.__stopPropagation = false;

	const originStopPropagation = event.stopPropagation;

	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true;
		originStopPropagation?.();
	};

	return syntheticEvent;
}

function dispatchEvent(container: Container, eventType: string, event: Event) {
	const targetElement = event.target as DOMElement;

	if (targetElement === null) {
		console.warn(`事件不存在target：${event}`);
		return;
	}
	// 1. 收集沿途的事件
	const { bubble, capture } = collectPaths(targetElement, container, eventType);
	// 2. 构造合成事件
	const se = createSyntheticEvent(event);
	// 3. 遍历capture
	triggerEventFlow(capture, se);

	if (!se.__stopPropagation) {
		// 4. 遍历bubble
		triggerEventFlow(bubble, se);
	}
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
	for (let index = 0; index < paths.length; index++) {
		const callback = paths[index];
		unstable_runWithPriority(eventTypeToSchedulerPriority(se.type), () => {
			callback.call(null, se);
		});
		if (se.__stopPropagation) {
			break;
		}
	}
}

function getEventCallbackNameFromEventType(
	eventType: string
): string[] | undefined {
	return {
		click: ['onClickCapture', 'onClick']
	}[eventType];
}

function collectPaths(
	targetElement: DOMElement,
	container: Container,
	eventType: string
) {
	const paths: Paths = {
		capture: [],
		bubble: []
	};

	while (targetElement && targetElement !== container) {
		// 收集

		const elementProps = targetElement[elementPropsKey];

		if (elementProps) {
			// click => onClick onClickCapture
			const callbackNameList = getEventCallbackNameFromEventType(eventType);
			if (callbackNameList) {
				callbackNameList.forEach((callbackName, index) => {
					const eventCallback = elementProps[callbackName];

					if (eventCallback) {
						if (index === 0) {
							//  capture 模拟捕获阶段事件
							paths.capture.unshift(eventCallback);
						} else {
							// 模拟冒泡事件阶段
							paths.bubble.push(eventCallback);
						}
					}
				});
			}
		}
		targetElement = targetElement.parentNode as DOMElement;
	}

	return paths;
}

function eventTypeToSchedulerPriority(eventType: string) {
	switch (eventType) {
		case 'click':
		case 'keydown':
		case 'keyup':
			return unstable_IdlePriority;
		case 'scroll':
			return unstable_UserBlockingPriority;
		default:
			return unstable_NormalPriority;
	}
}
