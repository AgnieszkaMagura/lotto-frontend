export interface TicketDto {
    hash: string;
    numbers: number[];
    drawDate: string;
}

export interface LottoGame {
    ticketDto: TicketDto;
    message: string;
}

// This must match your Java ResponseDto class
export interface ResponseDto {
    hash: string;
    numbers: Set<number> | number[]; // Twoje wybrane liczby
    hitNumbers: Set<number> | number[]; // Trafienia
    wonNumbers: number[];
    drawDate: string;
    isWinner: boolean;
}

// This matches the ResultAnnouncerResponseDto class
export interface ResultDto {
    responseDto: ResponseDto | null; // Tu są ukryte wyniki!
    message: string;
}