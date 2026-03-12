import React, {useState, useEffect} from 'react';
import axios from 'axios';
import './App.css';
import {LottoGame, ResultDto} from './types';

const App: React.FC = () => {
    // --- AUTH STATE ---
    const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
    const [authData, setAuthData] = useState({username: '', password: ''});
    const [isRegistering, setIsRegistering] = useState(false);

    // --- GAME STATE ---
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [ticket, setTicket] = useState<LottoGame | null>(null);
    const [gameResult, setGameResult] = useState<ResultDto | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [allTickets, setAllTickets] = useState<LottoGame[]>(() => {
        const saved = localStorage.getItem('lotto_history');
        return saved ? JSON.parse(saved) : [];
    });

    const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');

    const specialCharRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

    // --- THEME & HISTORY EFFECTS ---
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem('lotto_history', JSON.stringify(allTickets));
    }, [allTickets]);

    // --- PASSWORD VALIDATION HELPER ---
    const isPasswordValid = (password: string) => {
        const passwordRegex = new RegExp(`^(?=.*[A-Z])(?=.*${specialCharRegex.source})(?=.{6,})`);
        return passwordRegex.test(password);
    };

    // --- AUTH FUNCTIONS ---
    const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (isRegistering && !isPasswordValid(authData.password)) {
            setError("Password must be at least 6 characters, include one uppercase letter and one special character.");
            setLoading(false);
            return;
        }

        const endpoint = isRegistering ? '/register' : '/token';

        try {
            const response = await axios.post(`http://localhost:8080${endpoint}`, {
                username: authData.username,
                password: authData.password
            });

            if (!isRegistering) {
                const {username, token} = response.data;
                setUser(username);
                localStorage.setItem('user', username);
                localStorage.setItem('token', token);
            } else {
                alert(`User ${response.data.username} created! Please log in.`);
                setIsRegistering(false);
                setAuthData({username: '', password: ''});
            }
        } catch (err: any) {
            setError(err.response?.status === 403 ? "Invalid credentials." : "Server error.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    // --- GAME FUNCTIONS ---
    const toggleNumber = (num: number) => {
        setError(null);
        if (selectedNumbers.includes(num)) {
            setSelectedNumbers(selectedNumbers.filter(n => n !== num));
        } else if (selectedNumbers.length < 6) {
            setSelectedNumbers([...selectedNumbers, num]);
        }
    };

    const generateRandomNumbers = () => {
        const randoms = new Set<number>();
        while (randoms.size < 6) {
            randoms.add(Math.floor(Math.random() * 99) + 1);
        }
        setSelectedNumbers(Array.from(randoms).sort((a, b) => a - b));
        setError(null);
    };

    const sendTicket = async () => {
        setLoading(true);
        setTicket(null);
        setGameResult(null);
        setError(null);

        const token = localStorage.getItem('token');
        try {
            const response = await axios.post<LottoGame>('http://localhost:8080/inputNumbers',
                {inputNumbers: selectedNumbers},
                {headers: {Authorization: `Bearer ${token}`}}
            );
            setTicket(response.data);
            setAllTickets(prev => [response.data, ...prev]);
        } catch (err) {
            setError("Error while sending the ticket.");
        } finally {
            setLoading(false);
        }
    };

    const checkResult = async () => {
        if (!ticket) return;
        setLoading(true);
        setError(null);
        setGameResult(null);

        const token = localStorage.getItem('token');
        try {
            const response = await axios.get<ResultDto>(`http://localhost:8080/results/${ticket.ticketDto.hash}`,
                {headers: {Authorization: `Bearer ${token}`}}
            );
            setGameResult(response.data);
        } catch (err: any) {
            if (err.response?.status === 404) {
                // To trafi do stanu error i wyświetli się pod przyciskiem
                setError("The draw results are not available yet. Official draws take place every Saturday at 12:00 PM. Please come back after that time!");
            } else {
                setError("Server error. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    const playAgain = () => {
        setSelectedNumbers([]);
        setTicket(null);
        setGameResult(null);
        setError(null);
    };

    const clearHistory = () => {
        if (window.confirm("Delete all tickets?")) {
            setAllTickets([]);
            localStorage.removeItem('lotto_history');
        }
    };

    const toggleDarkMode = () => setDarkMode(!darkMode);

    if (!user) {
        return (
            <div className="container auth-page">
                <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                    <button onClick={toggleDarkMode} className="theme-toggle">{darkMode ? '☀️' : '🌙'}</button>
                </div>
                <h1>{isRegistering ? 'Create Account' : 'Login to Play'}</h1>
                <form onSubmit={handleAuth} className="auth-form">
                    <input
                        type="text"
                        placeholder="Username"
                        required
                        value={authData.username}
                        onChange={(e) => setAuthData({...authData, username: e.target.value})}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        required
                        value={authData.password}
                        onChange={(e) => setAuthData({...authData, password: e.target.value})}
                    />

                    {isRegistering && (
                        <div className="password-hints">
                            <p style={{color: authData.password.length >= 6 ? '#2ecc71' : '#e74c3c'}}>
                                {authData.password.length >= 6 ? '✓' : '○'} Min. 6 characters
                            </p>
                            <p style={{color: /[A-Z]/.test(authData.password) ? '#2ecc71' : '#e74c3c'}}>
                                {/[A-Z]/.test(authData.password) ? '✓' : '○'} One uppercase letter
                            </p>
                            <p style={{color: specialCharRegex.test(authData.password) ? '#2ecc71' : '#e74c3c'}}>
                                {specialCharRegex.test(authData.password) ? '✓' : '○'} One special character
                            </p>
                        </div>
                    )}

                    <button type="submit" className="play-button" disabled={loading}>
                        {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Login')}
                    </button>
                    {error && <p className="error-box">{error}</p>}
                </form>
                <p className="auth-toggle" onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                }}>
                    {isRegistering ? 'Already have an account? Log in' : 'New user? Register here'}
                </p>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="header-actions">
                <span>Welcome, <strong>{user}</strong>!</span>
                <div className="buttons">
                    <button onClick={handleLogout} className="clear-button">Logout</button>
                    <button onClick={toggleDarkMode} className="theme-toggle">{darkMode ? '☀️' : '🌙'}</button>
                </div>
            </div>

            <div className="quick-pick-container">
                <button onClick={generateRandomNumbers} className="random-button">🎲 QUICK PICK (Random 6)</button>
                <button onClick={() => setSelectedNumbers([])} className="clear-button">🗑️ Clear All</button>
            </div>

            <h1>Lotto Game</h1>

            <div className="instruction-box">
                <h2>How to Play</h2>
                <p>
                    Welcome to the <strong>Lotto Full-Stack Experience</strong>! To participate, please select exactly
                    <strong> 6 unique numbers</strong> from the interactive grid below (1-99).
                </p>
                <div className="draw-status-pill">
                    <span className="calendar-icon">📅</span>
                    <span>Next Official Draw: <strong>Every Saturday at 12:00 PM</strong></span>
                </div>
            </div>

            {/* Ten błąd wyświetla się na górze strony */}
            {error && !ticket && <div className="error-box">{error}</div>}

            <div className="grid">
                {Array.from({length: 99}, (_, i) => i + 1).map(num => (
                    <button key={num} onClick={() => toggleNumber(num)}
                            className={selectedNumbers.includes(num) ? 'selected' : ''}>
                        {num}
                    </button>
                ))}
            </div>

            <div className="controls">
                <button onClick={sendTicket} disabled={selectedNumbers.length !== 6 || loading} className="play-button">
                    {loading ? 'Processing...' : '1. REGISTER TICKET'}
                </button>
            </div>

            {ticket && (
                <div className="ticket-box">
                    <h3>Ticket Registered!</h3>
                    <p>ID: <code>{ticket.ticketDto.hash}</code></p>
                    <p>Numbers: {ticket.ticketDto.numbers.join(', ')}</p>
                    <button onClick={checkResult} className="check-button" disabled={loading}>
                        {loading ? 'Checking...' : '2. CHECK IF YOU WON'}
                    </button>

                    {/* KLUCZOWA POPRAWKA: Wyświetlanie błędu bezpośrednio pod przyciskiem sprawdzenia */}
                    {error && (
                        <div className="error-box" style={{ marginTop: '15px', backgroundColor: 'rgba(231, 76, 60, 0.1)' }}>
                            {error}
                        </div>
                    )}
                </div>
            )}

            {gameResult && (
                <div className="result-box">
                    <h3>{gameResult.message}</h3>
                    {gameResult.responseDto ? (
                        <div className="details">
                            <p>Your Matches: <strong>
                                {Array.from(gameResult.responseDto.hitNumbers).length > 0
                                    ? Array.from(gameResult.responseDto.hitNumbers).join(', ')
                                    : "None"}
                            </strong></p>
                            <p>Status: {gameResult.responseDto.isWinner ? "WINNER! 🎉" : "TRY AGAIN 😢"}</p>
                        </div>
                    ) : (
                        <div className="not-ready-info">
                            <p>Draw Date: <strong>{ticket?.ticketDto.drawDate}</strong></p>
                        </div>
                    )}
                    <button onClick={playAgain} className="play-again-button">🔄 Buy Another Ticket</button>
                </div>
            )}

            <div className="history-container">
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <h2>Purchase History</h2>
                    {allTickets.length > 0 &&
                        <button onClick={clearHistory} className="clear-history-btn">🗑️ Clear</button>}
                </div>
                {allTickets.length === 0 ? <p>No tickets yet.</p> :
                    allTickets.map((t, idx) => (
                        <div key={t.ticketDto.hash} className="history-item">
                            <span>#{allTickets.length - idx}</span>
                            <p>Numbers: <strong>{t.ticketDto.numbers.join(', ')}</strong></p>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

export default App;