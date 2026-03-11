export interface TicketDto {
    hash: string;
    numbers: number[];
    drawDate: string;
}

export interface LottoGame {
    ticketDto: TicketDto;
    message: string;
}

// To musi odpowiadać Twojej klasie ResponseDto w Javie
export interface ResponseDto {
    hash: string;
    numbers: Set<number> | number[]; // Twoje wybrane liczby
    hitNumbers: Set<number> | number[]; // Trafienia
    drawDate: string;
    isWinner: boolean;
}

// To odpowiada klasie ResultAnnouncerResponseDto
export interface ResultDto {
    responseDto: ResponseDto | null; // Tu są ukryte wyniki!
    message: string;
}