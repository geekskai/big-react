export type Flags = number;

export const NoFlags = 0b0000000;
export const Placement = 0b0000001;
export const Update = 0b0000010;
export const ChildDeletion = 0b0000100;

// 当前fiber本次更新存在副作用，需要更新fiber
// 至于是存在哪种副作（useEffect或者useLayoutEffect）用需要进一步判断
export const PassiveEffect = 0b0001000;

// 包含这些字段就代表 需要执行mutation操作
export const MutationMask = Placement | Update | ChildDeletion;

// 包含这些字段就代表本次更新存在副作用，需要触发effect操作
export const PassiveMask = PassiveEffect | ChildDeletion;
