import { vec3 } from "gl-matrix";
import { Piece, UpdatePieceTransform } from "./piece";
import { Actor } from "./actor";

export class World {
    actors: Actor[];
    pieces: Piece[];

    placed = new Map<number, Piece>();
    assigned = new Set<number>();

    PlacePiece(piece: Piece) {
        vec3.copy(piece.position, piece.targetPosition);
        // Make them slightly off-z to avoid z-fighting
        vec3.add(piece.position, piece.position, [0, 0, piece.uid * 0.0001]);
        vec3.zero(piece.velocity);
        vec3.zero(piece.eulerAngles);
        vec3.zero(piece.eulerVelocity);
        UpdatePieceTransform(piece);
        this.placed.set(piece.uid, piece);
    }
}
