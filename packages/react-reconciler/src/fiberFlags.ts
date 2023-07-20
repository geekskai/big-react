export type Flags = number;

export const NoFlags = 0b00000000000000000000000000;
export const Placement = 0b00000000000000000000000010;
export const Update = 0b00000000000000000000000100;
export const ChildDeletion = 0b00000000000000000000010000;

// 当前fiber本次更新存在副作用，需要更新fiber
// 至于是存在哪种副作（useEffect或者useLayoutEffect）用需要进一步判断
export const PassiveEffect = 0b00000000000000000000100000;

export const Ref = 0b00000000000000000001000000;

// 包含这些字段就代表 需要执行 mutation 操作
export const MutationMask = Placement | Update | ChildDeletion | Ref;

// 包含这些字段就代表 需要执行 layout 操作
export const LayoutMask = Ref;

// 包含这些字段就代表本次更新存在副作用，需要触发effect操作
export const PassiveMask = PassiveEffect | ChildDeletion;
