import { CombinedDashboard } from './dashboard.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('root');
    if (root) {
        ReactDOM.createRoot(root).render(
            React.createElement(CombinedDashboard)
        );
    }
});
