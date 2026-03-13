import React, {useState, useEffect} from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import './App.css';
import {LottoGame, ResultDto} from './types';

const App: React.FC = () => {
    // --- AUTH STATE ---
    const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
    const [authData, setAuthData] = useState({username: '', password: ''});
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // --- GAME STATE ---
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [ticket, setTicket] = useState<LottoGame | null>(null);
    const [gameResult, setGameResult] = useState<ResultDto | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [allTickets, setAllTickets] = useState<LottoGame[]>([]);
    const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
    const [searchHash, setSearchHash] = useState<string>('');
    const specialCharRegex = /[!@#$%^&*()_+\-=[{};':"\\|,.<>/?]/;

    // --- THEME EFFECT ---
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    // --- DYNAMIC HISTORY LOADING ---
    useEffect(() => {
        if (user) {
            const saved = localStorage.getItem(`lotto_history_${user}`);
            setAllTickets(saved ? JSON.parse(saved) : []);
        } else {
            setAllTickets([]);
        }
    }, [user]);

    // --- DYNAMIC HISTORY SAVING ---
    useEffect(() => {
        if (user) {
            localStorage.setItem(`lotto_history_${user}`, JSON.stringify(allTickets));
        }
    }, [allTickets, user]);

    // --- HELPERS ---
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(text);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    // --- AUTH FUNCTIONS WITH VALIDATION ---
    const handleAuth = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
        const passwordRegex = new RegExp(`^(?=.*[A-Z])(?=.*${specialCharRegex.source})(?=.{6,})`);

        if (isRegistering) {
            if (!usernameRegex.test(authData.username)) {
                setError("Username: min. 3 characters (letters, numbers, or underscores only).");
                setLoading(false);
                return;
            }
            if (!passwordRegex.test(authData.password)) {
                setError("Password is too simple! See requirements below.");
                setLoading(false);
                return;
            }
        }

        const endpoint = isRegistering ? '/register' : '/token';

        try {
            const response = await axios.post(`http://localhost:8080${endpoint}`, {
                username: authData.username,
                password: authData.password
            });

            if (!isRegistering) {
                const {username, token} = response.data;
                setAllTickets([]);
                setUser(username);
                localStorage.setItem('user', username);
                localStorage.setItem('token', token);
            } else {
                alert(`User ${response.data.username} created! Please log in.`);
                setIsRegistering(false);
                setAuthData({username: '', password: ''});
                setShowPassword(false);
            }
        } catch (err: any) {
            if (axios.isAxiosError(err)) {
                if (err.response) {
                    if (isRegistering && err.response.status === 409) {
                        setError("This username is already taken. Please choose another one.");
                    } else if (!isRegistering && (err.response.status === 403 || err.response.status === 401)) {
                        setError("Invalid username or password.");
                    } else {
                        setError(err.response.data.message || "An error occurred on the server.");
                    }
                } else {
                    setError("No response from server. Check your connection.");
                }
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        setAllTickets([]);
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
        let cleanHash = searchHash.trim();
        if (cleanHash.toUpperCase().startsWith("ID:")) {
            cleanHash = cleanHash.replace(/ID:/i, "").trim();
        }

        if (!cleanHash) {
            setError("Please enter a Ticket ID first.");
            return;
        }

        setLoading(true);
        setError(null);

        setSearchHash('');
        setTicket(null);
        // ---------------------------------

        const token = localStorage.getItem('token');
        try {
            const response = await axios.get<ResultDto>(`http://localhost:8080/results/${cleanHash}`,
                {headers: {Authorization: `Bearer ${token}`}}
            );
            setGameResult(response.data);

            if (response.data.responseDto && (response.data.responseDto.hitNumbers as number[]).length >= 3) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: {y: 0.6},
                    colors: ['#2ecc71', '#f1c40f', '#3498db', '#e74c3c']
                });
            }
        } catch (err: any) {
            setError(err.response?.status === 404 ? "Ticket not found or results not ready." : "Server error.");
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
        if (window.confirm("Delete all tickets for this user?")) {
            setAllTickets([]);
            if (user) localStorage.removeItem(`lotto_history_${user}`);
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
                <form onSubmit={handleAuth} className="auth-form" style={{maxWidth: '400px', margin: '0 auto'}}>
                    <input
                        type="text"
                        placeholder="Username"
                        required
                        value={authData.username}
                        onChange={(e) => setAuthData({...authData, username: e.target.value})}
                    />
                    <div className="password-input-wrapper"
                         style={{position: 'relative', width: '100%', margin: '15px 0'}}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            required
                            style={{width: '100%', boxSizing: 'border-box'}}
                            value={authData.password}
                            onChange={(e) => setAuthData({...authData, password: e.target.value})}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-color)'
                            }}
                        >
                            {showPassword ? '👁️' : '🙈'}
                        </button>
                    </div>

                    {isRegistering && (
                        <div className="password-hints"
                             style={{textAlign: 'left', fontSize: '0.85rem', marginBottom: '15px'}}>
                            <p style={{color: authData.password.length >= 6 ? '#2ecc71' : '#e74c3c', margin: '4px 0'}}>
                                {authData.password.length >= 6 ? '✓' : '○'} Min. 6 characters
                            </p>
                            <p style={{
                                color: /[A-Z]/.test(authData.password) ? '#2ecc71' : '#e74c3c',
                                margin: '4px 0'
                            }}>
                                {/[A-Z]/.test(authData.password) ? '✓' : '○'} One uppercase letter
                            </p>
                            <p style={{
                                color: specialCharRegex.test(authData.password) ? '#2ecc71' : '#e74c3c',
                                margin: '4px 0'
                            }}>
                                {specialCharRegex.test(authData.password) ? '✓' : '○'} One special character
                            </p>
                        </div>
                    )}

                    <button type="submit" className="play-button" disabled={loading} style={{width: '100%'}}>
                        {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Login')}
                    </button>
                    {error && <p className="error-box" style={{marginTop: '15px'}}>{error}</p>}
                </form>
                <p className="auth-toggle" style={{cursor: 'pointer', marginTop: '20px'}} onClick={() => {
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
                    <button onClick={handleLogout} className="clear-button">Log Out</button>
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
                <div className="steps-guide">
                    <p>1. Select your <strong>6 lucky and unique numbers</strong> (1-99) from the grid below or just fill the fields randomly.</p>
                    <p>2. Click the <strong>"REGISTER TICKET"</strong> button to enter the draw.</p>
                    <p>3. Check your results using the generated <strong>Ticket ID</strong>.</p>
                </div>
                <div className="draw-status-pill">
                    <span className="calendar-icon">📅</span>
                    <span>Next Official Draw: <strong>Every Saturday at 12:00 PM</strong></span>
                </div>
            </div>

            <div className="grid">
                {Array.from({length: 99}, (_, i) => i + 1).map(num => (
                    <button key={num} onClick={() => toggleNumber(num)}
                            className={selectedNumbers.includes(num) ? 'selected' : ''}>
                        {num}
                    </button>
                ))}
            </div>

            <div className="controls" style={{textAlign: 'center', margin: '30px 0'}}>
                <button
                    onClick={sendTicket}
                    disabled={selectedNumbers.length !== 6 || loading}
                    className={`play-button ${selectedNumbers.length === 6 ? 'pulse-animation' : ''}`}
                    style={{
                        padding: '20px 40px',
                        fontSize: '1.4rem',
                        backgroundColor: selectedNumbers.length === 6 ? '#2ecc71' : '#ccc',
                        cursor: selectedNumbers.length === 6 ? 'pointer' : 'not-allowed',
                        boxShadow: selectedNumbers.length === 6 ? '0 10px 20px rgba(46, 204, 113, 0.3)' : 'none',
                        transition: 'all 0.3s ease',
                        border: selectedNumbers.length === 6 ? '2px solid white' : 'none',
                        color: 'white',
                        borderRadius: '12px'
                    }}
                >
                    {loading ? 'Processing...' : '🚀 REGISTER TICKET'}
                </button>
            </div>

            {ticket && (
                <div className="ticket-box">
                    <h3>Ticket Registered!</h3>
                    <div style={{
                        backgroundColor: 'var(--bg-color)',
                        padding: '10px',
                        borderRadius: '8px',
                        margin: '10px 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid var(--border-color)'
                    }}>
                        <p style={{margin: 0}}><strong>ID:</strong> <code>{ticket.ticketDto.hash}</code></p>
                        <button onClick={() => copyToClipboard(ticket.ticketDto.hash)} className="copy-btn-small">
                            {copiedId === ticket.ticketDto.hash ? '✅ Copied!' : '📋 Copy ID'}
                        </button>
                    </div>
                </div>
            )}

            <div className="search-section" style={{ marginTop: '30px', padding: '20px', backgroundColor: 'var(--card-bg)', borderRadius: '12px' }}>
                <h3>Check Your Results</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Enter Ticket ID..."
                        value={searchHash}
                        onChange={(e) => setSearchHash(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-color)',
                            color: 'var(--text-color)',
                            fontSize: '1rem'
                        }}
                    />
                    <button
                        onClick={checkResult}
                        disabled={loading || !searchHash.trim()}
                        className={`check-button ${searchHash.trim() && !loading ? 'pulse-animation' : ''}`}
                        style={{
                            padding: '15px 30px',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            backgroundColor: searchHash.trim() && !loading ? '#2ecc71' : '#ccc',
                            color: 'white',
                            border: '2px solid white',
                            borderRadius: '8px',
                            cursor: searchHash.trim() && !loading ? 'pointer' : 'not-allowed',
                            boxShadow: searchHash.trim() && !loading ? '0 4px 15px rgba(46, 204, 113, 0.3)' : 'none',
                            transition: 'all 0.3s ease',
                            textTransform: 'uppercase'
                        }}
                    >
                        {loading ? '...' : '🔍 Check Ticket'}
                    </button>
                </div>
            </div>

            {gameResult && (
                <div className="result-box">
                    {gameResult.message === "Results are being calculated, please come back later" ? (
                        <div className="not-ready-info" style={{textAlign: 'center', padding: '10px'}}>
                            <h3 style={{color: '#f1c40f'}}>⏳ Results not available yet</h3>
                            <p>The official draw takes place <strong>every Saturday at 12:00 PM</strong>.</p>
                            <p>Please come back later to check your ticket. <strong>See you soon!</strong></p>
                        </div>
                    ) : (
                        <>
                            <h3>{gameResult.message}</h3>
                            {gameResult.responseDto && (
                                <div className="details">
                                    <p>Your Matches: <strong>
                                        {(gameResult.responseDto.hitNumbers as number[]).join(', ') || "None"}
                                    </strong></p>
                                    <p>Status: {gameResult.responseDto.isWinner ? "WINNER! 🎉" : "TRY AGAIN 😢"}</p>
                                </div>
                            )}
                        </>
                    )}
                    <button onClick={playAgain} className="play-again-button" style={{marginTop: '20px'}}>
                        🔄 Buy Another Ticket
                    </button>
                </div>
            )}

            <div className="history-container">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h2>Purchase History ({user})</h2>
                    {allTickets.length > 0 &&
                        <button onClick={clearHistory} className="clear-history-btn">🗑️ Clear</button>}
                </div>
                {allTickets.length === 0 ? <p>No tickets yet.</p> :
                    allTickets.map((t, idx) => (
                        <div key={t.ticketDto.hash} className="history-item">
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                    <span>#{allTickets.length - idx}</span>
                                    <p>Numbers: <strong>{t.ticketDto.numbers.join(', ')}</strong></p>
                                    <p style={{fontSize: '0.8rem', color: '#888'}}>ID: {t.ticketDto.hash}</p>
                                </div>
                                <button onClick={() => copyToClipboard(t.ticketDto.hash)} className="copy-btn-small">
                                    {copiedId === t.ticketDto.hash ? '✅' : '📋'}
                                </button>
                            </div>
                        </div>
                    ))
                }
            </div>

            <footer className="footer">
                <p>Developed by Agnieszka Magura. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default App;