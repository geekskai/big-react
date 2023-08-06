import { useState, useEffect } from 'react';
// import ReactDOM from 'react-dom/client';
import ReactDOM from 'react-dom';
// import ReactDOM from 'react-noop-renderer';

function App() {
	const [num, update] = useState(0);
	return (
		<ul onClick={() => update(num + 1)}>
			<>
				<li>1</li>
				<li>2</li>
				{num % 2 === 0 ? (
					<div>
						<Child>child</Child>
						<b>yes</b>
					</div>
				) : (
					<li>
						<s>no</s>
					</li>
				)}
			</>
			<li>3</li>
			<li>4</li>

			{/* {new Array(num).fill(0).map((_, i) => (
				<Child key={i}>{i}</Child>
			))} */}
		</ul>
	);
}

function Child({ children }) {
	// const now = performance.now();
	// while (performance.now() - now < 4) {}
	return <i>{children}</i>;
}

// const root = ReactDOM.createRoot();

// root.render(<App />);

// window.root = root;

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
