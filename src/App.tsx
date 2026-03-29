import React, {useState, useEffect} from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';

import Confetti from 'react-confetti';
import {useWindowSize} from 'react-use';
import './App.css';
import {LottoGame, ResultDto} from './types';

const API_BASE_URL = 'http://ec2-3-124-216-135.eu-central-1.compute.amazonaws.com:8000';

// --- UTILS ---
const getTimeRemaining = (drawDate: string) => {
    const total = Date.parse(drawDate) - Date.parse(new Date().toISOString());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return {
        total,
        days,
        hours,
        minutes,
        seconds,
        formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`
    };
};

const App: React.FC = () => {
    const {width, height} = useWindowSize();
    const [timeLeft, setTimeLeft] = useState<string>("");
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

    useEffect(() => {
        if (!ticket?.ticketDto.drawDate) return;

        const timer = setInterval(() => {
            const remaining = getTimeRemaining(ticket.ticketDto.drawDate);

            if (remaining.total <= 0) {
                setTimeLeft("Results are ready! Checking...");
                clearInterval(timer);

                setSearchHash(ticket.ticketDto.hash);

            } else {
                setTimeLeft(remaining.formatted);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [ticket]);

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
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                setCopiedId(text);
                setTimeout(() => setCopiedId(null), 2000);
            });
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedId(text);
                setTimeout(() => setCopiedId(null), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
            document.body.removeChild(textArea);
        }
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
            const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
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
            const response = await axios.post<LottoGame>(`${API_BASE_URL}/inputNumbers`,
                {inputNumbers: selectedNumbers},
                {headers: {Authorization: `Bearer ${token}`}}
            );

            const ticketWithPurchaseDate = {
                ...response.data,
                purchaseDate: new Date().toISOString()
            };

            setTicket(ticketWithPurchaseDate);
            setAllTickets(prev => [ticketWithPurchaseDate, ...prev]);
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
        setGameResult(null);

        const token = localStorage.getItem('token');
        const ticketInHistory = allTickets.find(t => t.ticketDto.hash === cleanHash);

        try {
            const response = await axios.get<ResultDto>(`${API_BASE_URL}/results/${cleanHash}`,
                {headers: {Authorization: `Bearer ${token}`}}
            );

            const isCalculating = response.data.message === "Results are being calculated, please come back later";
            const drawDateNotReached = ticketInHistory?.ticketDto.drawDate
                ? new Date(ticketInHistory.ticketDto.drawDate) > new Date()
                : false;

            if (isCalculating || drawDateNotReached) {
                setError("Results are not ready yet. The draw takes place every Saturday at 12:00 PM. Please come back later.");
                setGameResult(null);
                setSearchHash('');
                return;
            }

            if (response.data.responseDto) {
                setGameResult(response.data);
                setSearchHash('');

                if (response.data.responseDto.hitNumbers) {
                    const hitsCount = Array.from(response.data.responseDto.hitNumbers).length;

                    if (hitsCount >= 3) {
                        confetti({
                            particleCount: hitsCount === 6 ? 500 : 150,
                            spread: hitsCount === 6 ? 160 : 70,
                            origin: {y: 0.6},
                            colors: ['#2ecc71', '#f1c40f', '#3498db', '#e74c3c']
                        });
                    }
                }
            } else {
                setError(response.data.message || "Results not ready yet.");
                setSearchHash('');
            }

        } catch (err: any) {
            if (err.response && err.response.status === 404) {
                if (ticketInHistory) {
                    setError("The draw takes place every Saturday at 12:00 PM. Your results will be available then. Please come back later.");
                    setSearchHash('');
                } else {
                    setError("Ticket not found. Please check if the ID is correct.");
                }
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
                            {showPassword ? '🔓' : '🔒'}
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
            {gameResult?.responseDto?.isWinner && (
                <Confetti
                    width={width}
                    height={height}
                    recycle={Array.from(gameResult.responseDto.hitNumbers).length === 6}
                    numberOfPieces={Array.from(gameResult.responseDto.hitNumbers).length === 6 ? 1500 : 500}
                    gravity={0.1}
                    style={{position: 'fixed', top: 0, left: 0, zIndex: 1000}}
                />
            )}
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
                    <p>🎯 1. Select your <strong>6 lucky numbers</strong> (1-99) or use <strong>Quick Pick</strong>.</p>
                    <p>🚀 2. Click <strong>"REGISTER TICKET"</strong> to join the upcoming draw.</p>
                    <p>🔍 3. Use your <strong>Ticket ID</strong> to check for winnings on Saturday!</p>
                </div>
                <div className="draw-status-pill">
                    <span className="calendar-icon">📅</span>
                    <span>Next Official Draw: <strong>Every Saturday at 12:00 PM</strong></span>
                </div>
                <div>
                    <p style={{
                        marginTop: '15px',
                        fontSize: '0.8rem',
                        opacity: 0.7,
                        textAlign: 'center',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '10px'
                    }}>
                        🔒 Your tickets are securely stored in your history below.
                    </p>
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

                    <div className="countdown-display" style={{
                        padding: '10px',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        border: '1px solid #3498db',
                        textAlign: 'center'
                    }}>
                        <p style={{margin: 0, fontSize: '0.9rem'}}>Time until draw:</p>
                        <strong style={{fontSize: '1.2rem', color: '#3498db'}}>{timeLeft || "Calculating..."}</strong>
                        <p style={{margin: '5px 0 0 0', fontSize: '0.8rem', opacity: 0.8, fontStyle: 'italic'}}>
                            ⚠️ Results will be available immediately after the draw. Please come back later.
                        </p>
                    </div>

                    <div style={{ /* style dla ID */
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <p style={{margin: 0}}><strong>ID:</strong> <code>{ticket.ticketDto.hash}</code></p>
                        <button onClick={() => copyToClipboard(ticket.ticketDto.hash)} className="copy-btn-small">
                            {copiedId === ticket.ticketDto.hash ? '✅ Copied!' : '📋 Copy ID'}
                        </button>
                    </div>
                </div>
            )}

            <div className="search-section"
                 style={{marginTop: '30px', padding: '20px', backgroundColor: 'var(--card-bg)', borderRadius: '12px'}}>
                <h3>Check Your Results</h3>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
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
            {error && !gameResult && (
                <div className="instruction-box" style={{
                    borderLeft: '5px solid #f1c40f',
                    backgroundColor: 'rgba(241, 196, 15, 0.1)',
                    marginTop: '20px',
                    textAlign: 'center'
                }}>
                    <h3 style={{color: '#f1c40f', margin: '0 0 10px 0'}}>⏳ Ticket Status</h3>
                    <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '500'}}>{error}</p>
                </div>
            )}
            {gameResult && (
                <div className={`result-box ${gameResult.responseDto?.isWinner ? 'winner-theme' : ''}`}>

                    <div style={{textAlign: 'center', marginBottom: '20px'}}>
                        {gameResult.responseDto?.isWinner ? (
                            <h2 style={{color: '#2ecc71'}}>🎉💰 Congratulations! You won! 💰</h2>
                        ) : (
                            <>
                                {Array.from(gameResult.responseDto?.hitNumbers || []).length < 3 ? (
                                    <h3 style={{color: '#e74c3c'}}>❌ No win this time. You need at least 3 matches to
                                        win!</h3>
                                ) : (
                                    <h3 style={{color: '#f1c40f'}}>{gameResult.message}</h3>
                                )}
                            </>
                        )}
                    </div>

                    {gameResult.responseDto && (
                        <div className="details"
                             style={{textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px'}}>

                            <div>
                                <p style={{marginBottom: '8px'}}><strong>💰 Official Winning Numbers:</strong></p>
                                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                    {Array.from(gameResult.responseDto.wonNumbers || []).map((num: number) => (
                                        <span key={num} style={{
                                            backgroundColor: '#f1c40f',
                                            color: '#2c3e50',
                                            padding: '5px 12px',
                                            borderRadius: '20px',
                                            fontWeight: 'bold',
                                            boxShadow: '0 2px 4px rgba(241, 196, 15, 0.4)'
                                        }}>{num}</span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p style={{marginBottom: '8px'}}><strong>🎟️ Your Ticket Numbers:</strong></p>
                                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                    {Array.from(gameResult.responseDto.numbers || []).map((num: any) => {
                                        const hits = Array.from(gameResult.responseDto?.hitNumbers || []).map(h => Number(h));
                                        const isHit = hits.includes(Number(num));

                                        return (
                                            <span key={num} style={{
                                                backgroundColor: isHit ? '#f1c40f' : 'var(--bg-color)',
                                                color: isHit ? '#2c3e50' : 'var(--text-color)',
                                                border: `1px solid ${isHit ? '#f1c40f' : 'var(--border-color)'}`,
                                                padding: '5px 12px',
                                                borderRadius: '20px',
                                                fontWeight: isHit ? 'bold' : 'normal',
                                                fontSize: '0.9rem',
                                                transition: 'all 0.3s ease'
                                            }}>{num}</span>
                                        );
                                    })}
                                </div>
                            </div>

                            <hr style={{border: 'none', borderTop: '1px solid var(--border-color)', margin: '15px 0'}}/>

                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <p style={{margin: 0}}>🎯 <strong>Matches:</strong>
                                    <span style={{
                                        marginLeft: '10px',
                                        fontSize: '1.2rem',
                                        color: '#2ecc71',
                                        fontWeight: 'bold'
                                    }}>
                    {Array.from(gameResult.responseDto.hitNumbers || []).length} / 6
                </span>
                                </p>
                                <p style={{margin: 0}}>📊 <strong>Status:</strong>
                                    <span style={{
                                        marginLeft: '10px',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        backgroundColor: gameResult.responseDto.isWinner ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                                        color: gameResult.responseDto.isWinner ? '#2ecc71' : '#e74c3c',
                                        fontWeight: 'bold'
                                    }}>
                    {gameResult.responseDto.isWinner ? "WINNER" : "TRY AGAIN"}
                </span>
                                </p>
                            </div>

                            <button onClick={playAgain} className="play-again-button" style={{marginTop: '10px'}}>
                                🔄 Try Another Ticket
                            </button>
                        </div>
                    )}
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
                        <div key={t.ticketDto.hash} className="history-item" style={{marginBottom: '15px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                <div style={{flex: 1}}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        marginBottom: '5px'
                                    }}>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: 'var(--primary-color)'
                                        }}>#{allTickets.length - idx}</span>
                                        <span style={{fontSize: '0.85rem', opacity: 0.8}}>
                                            📅 Purchased: {t.purchaseDate ? new Date(t.purchaseDate).toLocaleString() : 'N/A'}
                                        </span>
                                    </div>
                                    <p style={{margin: '5px 0'}}>Numbers: <strong>{t.ticketDto.numbers.join(', ')}</strong>
                                    </p>
                                    <div style={{
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px'
                                    }}>
                                        <p style={{margin: 0, color: '#3498db'}}>
                                            🎰 Draw
                                            Date: <strong>{new Date(t.ticketDto.drawDate).toLocaleString()}</strong>
                                        </p>
                                        <p style={{margin: 0, opacity: 0.6}}>ID: {t.ticketDto.hash}</p>
                                    </div>
                                </div>
                                <button onClick={() => copyToClipboard(t.ticketDto.hash)} className="copy-btn-small">
                                    {copiedId === t.ticketDto.hash ? '✅' : '📋'}
                                </button>
                            </div>
                        </div>
                    ))
                }
            </div>

            <footer className="footer-container" style={{ marginTop: '50px', borderTop: '1px solid var(--border-color)', paddingTop: '30px', textAlign: 'center' }}>
                <div className="tech-stack-section" style={{ marginBottom: '25px' }}>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-color)', fontWeight: 'bold', opacity: 0.9, marginBottom: '15px' }}>
                        Backend Tech Stack
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', maxWidth: '800px', margin: '0 auto' }}>
                        <span className="tech-badge" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', color: '#3498db', border: '1px solid #3498db' }}>Hexagonal Architecture</span>
                        <span className="tech-badge" style={{ backgroundColor: 'rgba(230, 126, 34, 0.1)', color: '#e67e22', border: '1px solid #e67e22' }}>Spring Boot</span>
                        <span className="tech-badge" style={{ backgroundColor: 'rgba(241, 196, 15, 0.1)', color: '#f1c40f', border: '1px solid #f1c40f', fontWeight: 'bold' }}>Java 17</span>
                        <span className="tech-badge" style={{ backgroundColor: 'rgba(0, 144, 204, 0.15)', color: '#007bb8', border: '1px solid #0090cc', fontWeight: 'bold' }}>Docker</span>
                        <span className="tech-badge" style={{backgroundColor: darkMode ? 'rgba(171, 178, 185, 0.1)' : 'rgba(93, 109, 126, 0.1)', color: darkMode ? '#abb2b9' : '#5d6d7e', border: `1px solid ${darkMode ? '#abb2b9' : '#5d6d7e'}`, fontWeight: '600'}}>Lombok</span>
                        <span className="tech-badge" style={{ backgroundColor: 'rgba(26, 188, 156, 0.1)', color: '#1abc9c', border: '1px solid #1abc9c' }}>Bean Validation</span>
                        <span className="tech-badge" style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', border: '1px solid #2ecc71' }}>MongoDB</span>
                        <span className="tech-badge" style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', border: '1px solid #e74c3c' }}>Redis</span>
                        <span className="tech-badge" style={{ backgroundColor: 'rgba(232, 67, 147, 0.1)', color: '#e84393', border: '1px solid #e84393' }}>Spring Security | JWT | BCrypt</span>
                        <span className="tech-badge" style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6', border: '1px solid #9b59b6', fontWeight: 'bold' }}>JUnit5 | Mockito | Testcontainers | WireMock | Awaitility</span>
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border-color)', width: '100px', margin: '20px auto', opacity: 0.3 }}></div>

                <p style={{ fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.8, marginBottom: '15px' }}>
                    © {new Date().getFullYear()} Developed with ❤️ by <strong>Agnieszka Magura</strong>
                </p>

                <div className="social-links" style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <a href="https://github.com/AgnieszkaMagura" target="_blank" rel="noreferrer">
                        <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" height="28" />
                    </a>
                    <a href="https://www.linkedin.com/in/agnieszka-magura-0714241a8/" target="_blank" rel="noreferrer">
                        <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" height="28" />
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default App;