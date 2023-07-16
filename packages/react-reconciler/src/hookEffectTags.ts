// 只要组件中使用了 useEffect，那么组件对应的fiber节点就会被打上这个tag
export const Passive = 0b0010;

// TODO: 接下来还有 useLayoutEffect

// 用于判断useEffect的回调函数是否需要执行
export const HookHasEffect = 0b0001;
