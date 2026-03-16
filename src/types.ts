export interface TicketDto {
    hash: string;
    numbers: number[];
    drawDate: string;
}

export interface LottoGame {
    ticketDto: TicketDto;
    message: string;
    purchaseDate?: string;
}

export interface ResponseDto {
    hash: string;
    numbers: Set<number> | number[];
    hitNumbers: Set<number> | number[];
    wonNumbers: number[];
    drawDate: string;
    isWinner: boolean;
}

export interface ResultDto {
    responseDto: ResponseDto | null;
    message: string;
}