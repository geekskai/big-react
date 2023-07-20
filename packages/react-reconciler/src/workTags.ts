export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof ContextProvider
	| typeof Fragment;

export const FunctionComponent = 0;

export const HostRoot = 3; // react.render() 函数的第一个参数

export const HostComponent = 5;
export const HostText = 6; // 比如说是 <div>123</div> 中的123就是属于HostText

export const Fragment = 7;
export const ContextProvider = 8;
