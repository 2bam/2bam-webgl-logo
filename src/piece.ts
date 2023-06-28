import { mat4, vec3 } from "gl-matrix";
import { DEG_TO_RAD, extrude } from "./utils";
import { CreateMesh, Mesh } from "./mesh";


export interface Piece {
    uid: number;
    position: vec3;
    velocity: vec3;
    eulerAngles: vec3;
    eulerVelocity: vec3;
    transform: mat4;

    mesh: Mesh;

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

function CreatePiece(gl: WebGLRenderingContext, vs: vec3[], ics: number[]) {
    const extruded = extrude(vs, ics, 0.7);
    return CreateMesh(
        gl,
        extruded.vertices,
        extruded.indices,
    );
}

export function CreateMeshesForPieces(gl: WebGLRenderingContext): { [ch: string]: Mesh; } {
    const piecesMeshes = {
        'default': CreatePiece(
            gl,
            [
                [-1, -1, 0],
                [1, -1, 0],
                [-1, 1, 0],
                [1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),
        '&': CreatePiece(
            gl,
            [
                [2 + -1, -1, 0],
                [2 + 1, -1, 0],
                [-1, 1, 0],
                [1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),
        '/': CreatePiece(
            gl,
            [
                [- 1, -1, 0],
                [1, -1, 0],
                [2 + -1, 1, 0],
                [2 + 1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),
        ')': CreatePiece(
            gl,
            [
                [- 1, -2 + -1, 0],
                [1, -1, 0],
                [-1, 2 + 1, 0],
                [1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),
        'V': CreatePiece(
            gl,
            [
                [- 1, 1, 0],
                [1, 1, 0],
                [0, 0, 0],
            ],
            [0, 1, 2]
        ),
        '^': CreatePiece(
            gl,
            [
                [-2 - 1, -1, 0],
                [2 + 1, -1, 0],
                [-1, 1, 0],
                [1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),
    };
    return piecesMeshes;
}