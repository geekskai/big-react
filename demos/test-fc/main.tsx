import { useState } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
	const [num, setNum] = useState(200);

	return <div onClickCapture={() => setNum(num + 1)}>{num}</div>;
}

// function Child() {
// 	return <span>big-react</span>;
// }

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
