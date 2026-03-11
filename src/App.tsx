import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import { LottoGame, ResultDto } from './types';

const App: React.FC = () => {
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [ticket, setTicket] = useState<LottoGame | null>(null);
    const [gameResult, setGameResult] = useState<ResultDto | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const toggleNumber = (num: number) => {
        setError(null);
        if (selectedNumbers.includes(num)) {
            setSelectedNumbers(selectedNumbers.filter(n => n !== num));
        } else if (selectedNumbers.length < 6) {
            setSelectedNumbers([...selectedNumbers, num]);
        }
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
        } catch (err) {
            setError("Error while sending the ticket.");
        } finally {
            setLoading(false);
        }
    };

    const checkResult = async () => {
        if (!ticket) return;
        setLoading(true);
        setError(null); // Clears previous error messages before a new check
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

    return (
        <div className="container">
            <h1>Lotto Full-Stack App</h1>

            {/* Only show the error banner if we don't have a successful result yet */}
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
                                {Array.from(gameResult.responseDto.hitNumbers).join(', ')}
                            </strong></p>
                            <p>Status: {gameResult.responseDto.isWinner ? "WINNER! 🎉" : "TRY AGAIN 😢"}</p>
                        </div>
                    ) : (
                        <div className="info-wait">
                            <p>Draw Date: {ticket?.ticketDto.drawDate}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default App;