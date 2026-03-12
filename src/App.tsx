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
    const [showPassword, setShowPassword] = useState(false); // NOWY STAN

    // --- GAME STATE ---
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [ticket, setTicket] = useState<LottoGame | null>(null);
    const [gameResult, setGameResult] = useState<ResultDto | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [allTickets, setAllTickets] = useState<LottoGame[]>(() => {
        const saved = localStorage.getItem('lotto_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
    const specialCharRegex = /[!@#$%^&*()_+\-=[{};':"\\|,.<>/?]/;
    const [searchHash, setSearchHash] = useState<string>('');

    // --- THEME & HISTORY EFFECTS ---
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem('lotto_history', JSON.stringify(allTickets));
    }, [allTickets]);

    // --- HELPERS ---
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(text);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const isPasswordValid = (password: string) => {
        const passwordRegex = new RegExp(`^(?=.*[A-Z])(?=.*${specialCharRegex.source})(?=.{6,})`);
        return passwordRegex.test(password);
    };

    // --- AUTH FUNCTIONS ---
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
                setError("Password must be at least 6 characters, include one uppercase letter and one special character.");
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
                const { username, token } = response.data;
                setUser(username);
                localStorage.setItem('user', username);
                localStorage.setItem('token', token);
            } else {
                alert(`User ${response.data.username} created! Please log in.`);
                setIsRegistering(false);
                setAuthData({ username: '', password: '' });
                setShowPassword(false);
            }
        } catch (err: any) {
            // TUTAJ JEST TWOJA OBSŁUGA BŁĘDÓW
            if (axios.isAxiosError(err)) {
                if (err.response) {
                    // Serwer odpowiedział kodem błędu (np. 409, 403)
                    if (isRegistering && err.response.status === 409) {
                        setError("This username is already taken. Please choose another one.");
                    } else if (!isRegistering && (err.response.status === 403 || err.response.status === 401)) {
                        setError("Invalid username or password.");
                    } else {
                        // Jeśli serwer wysłał inny błąd (np. 400), pokaż komunikat z backendu
                        setError(err.response.data.message || "An error occurred on the server.");
                    }
                } else if (err.request) {
                    // Żądanie zostało wysłane, ale nie ma odpowiedzi (często problem z CORS lub wyłączony serwer)
                    setError("No response from server. Check your connection or CORS settings.");
                } else {
                    setError("Error setting up the request.");
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

            // AUTO-UZUPEŁNIANIE ID W PANELU SPRAWDZANIA
            setSearchHash(response.data.ticketDto.hash);
        } catch (err) {
            setError("Error while sending the ticket.");
        } finally {
            setLoading(false);
        }
    };

    const checkResult = async () => {
        if (!searchHash.trim()) {
            setError("Please enter a Ticket ID first.");
            return;
        }

        setLoading(true);
        setError(null);
        setGameResult(null);

        const token = localStorage.getItem('token');
        try {
            const response = await axios.get<ResultDto>(`http://localhost:8080/results/${searchHash.trim()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setGameResult(response.data);

            // Efekt konfetti przy wygranej (3 lub więcej trafienia)
            if (response.data.responseDto) {
                const hitNumbers = response.data.responseDto.hitNumbers as number[];
                if (hitNumbers.length >= 3) {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#2ecc71', '#f1c40f', '#3498db', '#e74c3c']
                    });
                }
            }
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError("Ticket not found or results not available yet. Draw date: Saturday 12:00 PM.");
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
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={toggleDarkMode} className="theme-toggle">{darkMode ? '☀️' : '🌙'}</button>
                </div>
                <h1>{isRegistering ? 'Create Account' : 'Login to Play'}</h1>

                <form onSubmit={handleAuth} className="auth-form" style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <div className="input-group" style={{ marginBottom: '15px' }}>
                        <input
                            type="text"
                            placeholder="Username"
                            required
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            value={authData.username}
                            onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                        />
                    </div>

                    <div className="password-input-wrapper" style={{ position: 'relative', width: '100%', marginBottom: '15px' }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            required
                            style={{
                                width: '100%',
                                paddingRight: '45px', // Miejsce na ikonkę
                                boxSizing: 'border-box'
                            }}
                            value={authData.password}
                            onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '5px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                padding: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--text-color)'
                            }}
                        >
                            {showPassword ? '👁️' : '🙈'}
                        </button>
                    </div>

                    {isRegistering && (
                        <div className="password-hints" style={{ textAlign: 'left', fontSize: '0.9rem', marginBottom: '15px' }}>
                            <p style={{ color: authData.password.length >= 6 ? '#2ecc71' : '#e74c3c', margin: '5px 0' }}>
                                {authData.password.length >= 6 ? '✓' : '○'} Min. 6 characters
                            </p>
                            <p style={{ color: /[A-Z]/.test(authData.password) ? '#2ecc71' : '#e74c3c', margin: '5px 0' }}>
                                {/[A-Z]/.test(authData.password) ? '✓' : '○'} One uppercase letter
                            </p>
                            <p style={{ color: specialCharRegex.test(authData.password) ? '#2ecc71' : '#e74c3c', margin: '5px 0' }}>
                                {specialCharRegex.test(authData.password) ? '✓' : '○'} One special character
                            </p>
                        </div>
                    )}

                    <button type="submit" className="play-button" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Login')}
                    </button>

                    {error && <p className="error-box" style={{ marginTop: '15px' }}>{error}</p>}
                </form>

                <p className="auth-toggle"
                   style={{ cursor: 'pointer', marginTop: '20px', textDecoration: 'underline' }}
                   onClick={() => {
                       setIsRegistering(!isRegistering);
                       setError(null);
                       setShowPassword(false);
                   }}>
                    {isRegistering ? 'Already have an account? Log in' : 'New user? Register here'}
                </p>
                <footer className="footer">
                    <p>Developed by Agnieszka Magura. All rights reserved.</p>
                </footer>
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
                <p>
                    Welcome to the <strong>Lotto Full-Stack Experience</strong>! To participate, please select exactly
                    <strong> 6 unique numbers</strong> from the interactive grid below (1-99).
                </p>
                <div className="draw-status-pill">
                    <span className="calendar-icon">📅</span>
                    <span>Next Official Draw: <strong>Every Saturday at 12:00 PM</strong></span>
                </div>
            </div>

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
                    <p><strong>Status:</strong> {ticket.message}</p>

                    {/* Sekcja z ID i kopiowaniem - teraz to główny element tego boxa */}
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
                        <p style={{ margin: 0 }}><strong>ID:</strong> <code>{ticket.ticketDto.hash}</code></p>
                        <button
                            onClick={() => copyToClipboard(ticket.ticketDto.hash)}
                            className="copy-btn-small"
                            style={{
                                padding: '5px 10px',
                                fontSize: '0.75rem',
                                backgroundColor: copiedId === ticket.ticketDto.hash ? '#2ecc71' : 'var(--secondary-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {copiedId === ticket.ticketDto.hash ? '✅ Copied!' : '📋 Copy ID'}
                        </button>
                    </div>

                    <p><strong>Numbers:</strong> {ticket.ticketDto.numbers.join(', ')}</p>
                    <p><strong>Draw Date:</strong> {new Date(ticket.ticketDto.drawDate).toLocaleString()}</p>

                    {/* PRZYCISK "CHECK IF YOU WON" ZOSTAŁ STĄD USUNIĘTY */}
                </div>
            )}

            {/* --- UNIWERSALNY PANEL SPRAWDZANIA --- */}
            <div className="search-section" style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
                <h3>Check Your Results</h3>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <input
                        type="text"
                        placeholder="Enter Ticket ID (hash)..."
                        value={searchHash}
                        onChange={(e) => setSearchHash(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-color)',
                            color: 'var(--text-color)'
                        }}
                    />
                    <button
                        onClick={checkResult}
                        className="check-button"
                        disabled={loading || !searchHash}
                        style={{ margin: 0, minWidth: '120px' }}
                    >
                        {loading ? 'Checking...' : 'Check Ticket'}
                    </button>
                </div>
            </div>

            {gameResult && (
                <div className="result-box">
                    {/* Jeśli wiadomość z backendu sugeruje, że losowanie jeszcze się nie odbyło */}
                    {gameResult.message === "Results are being calculated, please come back later" ? (
                        <div className="not-ready-info" style={{ textAlign: 'center', padding: '10px' }}>
                            <h3 style={{ color: '#f1c40f' }}>⏳ Draw not yet held</h3>
                            <p>The official draw takes place <strong>every Saturday at 12:00 PM</strong>.</p>
                            <p>Please come back later to check your winnings!</p>
                        </div>
                    ) : (
                        <>
                            {/* Widok, gdy wyniki są już gotowe */}
                            <h3>{gameResult.message}</h3>
                            {gameResult.responseDto && (
                                <div className="details">
                                    <p>Your Matches: <strong>
                                        {gameResult.responseDto.hitNumbers && (gameResult.responseDto.hitNumbers as number[]).length > 0
                                            ? (gameResult.responseDto.hitNumbers as number[]).join(', ')
                                            : "None"}
                                    </strong></p>
                                    <p>Status: {gameResult.responseDto.isWinner ? "WINNER! 🎉" : "TRY AGAIN 😢"}</p>
                                </div>
                            )}
                        </>
                    )}

                    <button onClick={playAgain} className="play-again-button" style={{ marginTop: '20px' }}>
                        🔄 Buy Another Ticket
                    </button>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span>#{allTickets.length - idx}</span>
                                    <p>Numbers: <strong>{t.ticketDto.numbers.join(', ')}</strong></p>
                                    <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>
                                        ID: <code style={{ cursor: 'pointer' }} onClick={() => copyToClipboard(t.ticketDto.hash)}>
                                        {t.ticketDto.hash}
                                    </code>
                                    </p>
                                </div>
                                <button
                                    className="copy-btn-small"
                                    onClick={() => copyToClipboard(t.ticketDto.hash)}
                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                >
                                    {copiedId === t.ticketDto.hash ? '✅ Copied' : '📋 Copy ID'}
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