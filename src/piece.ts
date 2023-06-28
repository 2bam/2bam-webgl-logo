import { mat4, vec3 } from "gl-matrix";
import { DEG_TO_RAD } from "./utils";


export interface Piece {
    uid: number;
    position: vec3;
    velocity: vec3;
    eulerAngles: vec3;
    eulerVelocity: vec3;
    transform: mat4;

    targetPosition: vec3;
    needs: number[];
}

export function UpdatePieceTransform(piece: Piece) {
    const xf = piece.transform;
    mat4.identity(xf);
    mat4.translate(xf, xf, piece.position);
    mat4.rotateX(xf, xf, piece.eulerAngles[0] * DEG_TO_RAD);
    mat4.rotateY(xf, xf, piece.eulerAngles[1] * DEG_TO_RAD);
    mat4.rotateZ(xf, xf, piece.eulerAngles[2] * DEG_TO_RAD);
    mat4.scale(xf, xf, [0.1, 0.1, 0.1]);
}

