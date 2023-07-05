import { Piece } from "./piece";
import { Actor } from "./actor";

export class World {
    actors: Actor[];
    pieces: Piece[];

    placed = new Map<number, Piece>();
    assigned = new Set<number>();

    danceCircleDegs = 0;
}
