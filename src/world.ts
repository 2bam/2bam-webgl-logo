import { Piece } from "./piece";

export class World {
    placed = new Map<number, Piece>();
    assigned = new Set<number>();

    PlacePiece(piece: Piece) {
        this.placed.set(piece.uid, piece);
    }
}