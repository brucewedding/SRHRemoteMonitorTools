import React from 'react';

function Login() {
    const handleSubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                window.location.href = '/';
            } else {
                errorMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.classList.remove('hidden');
        }
    };

    return (
        <div className="min-h-screen bg-base-200 flex flex-col justify-center items-center">
            <div className="card bg-base-100 shadow-xl w-full max-w-md mx-4 mb-16">
                <div className="card-body">
                    <img src="/logo.svg" alt="Scandinavian Real Heart AB" className="w-full max-w-md mb-6" />
                    <h1 className="text-2xl font-bold text-center mb-6">SRH Remote Monitor</h1>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-control">
                            <label className="label" htmlFor="username">
                                <span className="label-text">Username</span>
                            </label>
                            <input type="text" id="username" name="username" className="input input-bordered w-full" required />
                        </div>
                        <div className="form-control">
                            <label className="label" htmlFor="password">
                                <span className="label-text">Password</span>
                            </label>
                            <input type="password" id="password" name="password" className="input input-bordered w-full" required />
                        </div>
                        <button type="submit" className="btn btn-primary w-full">Login</button>
                        <div id="errorMessage" className="text-error text-center hidden">Invalid username or password</div>
                    </form>
                </div>
            </div>

            <footer className="footer footer-center p-4 bg-base-300 text-base-content fixed bottom-0 left-0 right-0">
                <aside>
                    <a href="https://realheart.se" target="_blank" rel="noopener noreferrer" className="link link-hover">
                        Copyright © 2024 Scandinavian Real Heart AB
                    </a>
                </aside>
            </footer>
        </div>
    );
}

export default Login;
