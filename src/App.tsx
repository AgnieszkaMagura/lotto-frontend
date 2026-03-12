import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { LottoGame, ResultDto } from './types';

const App: React.FC = () => {
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [ticket, setTicket] = useState<LottoGame | null>(null);
    const [gameResult, setGameResult] = useState<ResultDto | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [allTickets, setAllTickets] = useState<LottoGame[]>([]);

    // Inicjalizacja stanu Dark Mode z localStorage
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    // Efekt zarządzający motywem i zapisem w przeglądarce
    useEffect(() => {
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode(!darkMode);

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
        // Sortujemy, żeby ładnie wyglądało w UI
        setSelectedNumbers(Array.from(randoms).sort((a, b) => a - b));
        setError(null);
    };

    const sendTicket = async () => {
        setLoading(true);
        setTicket(null);
        setGameResult(null);
        setError(null);
        try {
            const response = await axios.post<LottoGame>('http://localhost:8080/inputNumbers', {
                inputNumbers: selectedNumbers
            });
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
        try {
            const response = await axios.get<ResultDto>(`http://localhost:8080/results/${ticket.ticketDto.hash}`);
            setGameResult(response.data);
        } catch (err: any) {
            if (err.response && err.response.status === 404) {
                setError("Result is not ready yet (draw happens on Saturday).");
            } else {
                setError("A connection or server error occurred.");
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const playAgain = () => {
        setSelectedNumbers([]); // Czyścimy wybrane numery
        setTicket(null);        // Usuwamy zarejestrowany bilet
        setGameResult(null);        // Usuwamy wynik losowania
        setError(null);         // czyścimy ewentualne błędy
    };


    return (
        <div className="container">
            {/* Przycisk przełączania motywu */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={toggleDarkMode} className="theme-toggle">
                    {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                </button>
            </div>

            <div className="quick-pick-container">
                <button onClick={generateRandomNumbers} className="random-button">
                    🎲 QUICK PICK (Random 6)
                </button>
                <button onClick={() => setSelectedNumbers([])} className="clear-button">
                    🗑️ Clear All
                </button>
            </div>

            <h1>Lotto Full-Stack App</h1>

            {/* --- NEW INSTRUCTION SECTION --- */}
            <div className="instruction-box">
                <p>
                    Welcome to the <strong>Lotto Game</strong>!
                    Select exactly <strong>6 numbers</strong> from the grid (1-99) and register your ticket.
                </p>
                <p className="draw-info">
                    📅 Next draw: <strong>Every Saturday at 12:00 PM</strong>
                </p>
            </div>
            {/* ------------------------------- */}

            {error && !gameResult?.responseDto && (
                <div className="error-box">{error}</div>
            )}

            <div className="grid">
                {Array.from({ length: 99 }, (_, i) => i + 1).map(num => (
                    <button
                        key={num}
                        onClick={() => toggleNumber(num)}
                        className={selectedNumbers.includes(num) ? 'selected' : ''}
                    >
                        {num}
                    </button>
                ))}
            </div>

            <div className="controls">
                <button
                    onClick={sendTicket}
                    disabled={selectedNumbers.length !== 6 || loading}
                    className="play-button"
                >
                    {loading ? 'Processing...' : '1. REGISTER TICKET'}
                </button>
            </div>

            {ticket && (
                <div className="ticket-box">
                    <h3>Ticket Registered Successfully!</h3>
                    <p>Your ID: <code>{ticket.ticketDto.hash}</code></p>
                    <p>Your Numbers: {ticket.ticketDto.numbers.join(', ')}</p>
                    <button onClick={checkResult} className="check-button">2. CHECK IF YOU WON</button>
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
                        <div className="info-wait">
                            <p>Draw Date: {ticket?.ticketDto.drawDate}</p>
                        </div>
                    )}

                    {/* Przycisk resetu gry - teraz bezpiecznie wewnątrz bloku gameResult */}
                    <button onClick={playAgain} className="play-again-button">
                        🔄 Buy Another Ticket
                    </button>
                    <div className="history-container">
                        <h2>Your Purchase History</h2>
                        {allTickets.length === 0 ? (
                            <p>No tickets purchased yet.</p>
                        ) : (
                            allTickets.map((t, index) => (
                                <div key={t.ticketDto.hash} className="history-item">
                                    <span>#{allTickets.length - index}</span>
                                    <p>Numbers: <strong>{t.ticketDto.numbers.join(', ')}</strong></p>
                                    <small>ID: {t.ticketDto.hash}</small>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;