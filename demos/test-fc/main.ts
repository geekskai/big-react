import './style.css';

const button = document.querySelector('button');

interface Work {
	count: number; // 代表render的次数
}

const workList: Work[] = [];

// 调度流程
function schedule() {
	// 调度出来
	const curWork = workList.pop();

	if (curWork) {
		perform(curWork);
	}
}

function perform(work: Work) {
	while (work.count) {
		work.count--;
		insertSpan(0);
	}
	schedule();
}

function insertSpan(content) {
	const span = document.createElement('span');
	span.innerText = content;
	document.querySelector('#root')?.appendChild(span);
}

button &&
	(button.onclick = () => {
		workList.unshift({
			count: 100
		});
		schedule();
	});
