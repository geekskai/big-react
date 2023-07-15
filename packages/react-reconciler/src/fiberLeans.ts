import { FiberRootNode } from './fiber';

export type Lane = number;
export type Lanes = number;

// lane 做为update的优先级,数值越小代表优先级越高
export const NoLane = 0b0000;
export const NoLanes = 0b0000;
export const SyncLane = 0b0001;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB;
}

export function requestUpdateLane() {
	return SyncLane;
}

export function getHightPriorityLane(lanes: Lanes): Lane {
	//  返回最小的那个 比如说 0b0110 那么返回 0b0010 反正返回最靠右的那个
	return lanes & -lanes;
}

// 从一个lanes中移除某个lane
export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}
