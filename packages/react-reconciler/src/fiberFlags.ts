export type Flags = number;

export const NoFlags = 0b0000000;
export const Placement = 0b0000001;
export const Update = 0b0000010;
export const ChildDeletion = 0b0000100;

// 包含这些字段就代表 需要执行mutation操作
export const MutationMask = Placement | Update | ChildDeletion;