import { useState, useEffect } from 'react';
// import ReactDOM from 'react-dom/client';
import ReactDOM from 'react-dom';
// import ReactDOM from 'react-noop-renderer';

function App() {
	const [num, update] = useState(100);
	return (
		<ul onClick={() => update(50)}>
			{new Array(num).fill(0).map((_, i) => (
				<Child key={i}>{i}</Child>
			))}
		</ul>
	);
}

function Child({ children }) {
	const now = performance.now();
	while (performance.now() - now < 4) {}
	return <li>{children}</li>;
}

// const root = ReactDOM.createRoot();

// root.render(<App />);

// window.root = root;

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
