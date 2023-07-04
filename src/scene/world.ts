import { vec3 } from "gl-matrix";
import { Piece, UpdatePieceTransform } from "./piece";
import { Actor } from "./actor";
import { DEG_TO_RAD } from "../utils-math";

const CIRCLE_RADIUS_X = 3.25;
const CIRCLE_RADIUS_Z = 1.05;

export class World {
    actors: Actor[];
    pieces: Piece[];

    placed = new Map<number, Piece>();
    assigned = new Set<number>();

    danceCircleDegs = 0;

    DanceCircleLocationFor(index: number): vec3 {
        const step = 360 / this.actors.length;
        const rads = DEG_TO_RAD * (this.danceCircleDegs + index * step);

        return vec3.fromValues(Math.cos(rads) * CIRCLE_RADIUS_X, 0, Math.sin(rads) * CIRCLE_RADIUS_Z);
    }

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
