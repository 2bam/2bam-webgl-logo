
import { vec3 } from "gl-matrix";
import { ExtrudeTriangleStripWithoutCentralVertices } from "./utils-render";
import { CreateMesh, Mesh } from './mesh';

function CreatePieceMesh(gl: WebGLRenderingContext, vs: vec3[], ics: number[]) {
    const extruded = ExtrudeTriangleStripWithoutCentralVertices(vs, ics, 0.7);
    return CreateMesh(
        gl,
        extruded.vertices,
        extruded.indices,
    );
}

export function CreateMeshesForPieces(gl: WebGLRenderingContext): { [ch: string]: Mesh; } {
    const piecesMeshes = {
        'default': CreatePieceMesh(
            gl,
            [
                [-1, -1, 0],
                [1, -1, 0],
                [-1, 1, 0],
                [1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),
        '&': CreatePieceMesh(
            gl,
            [
                [2 + -1, -1, 0],
                [2 + 1, -1, 0],
                [-1, 1, 0],
                [1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),
        '/': CreatePieceMesh(
            gl,
            [
                [- 1, -1, 0],
                [1, -1, 0],
                [2 + -1, 1, 0],
                [2 + 1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),
        ')': CreatePieceMesh(
            gl,
            [
                [- 1, -2 + -1, 0],
                [1, -1, 0],
                [-1, 2 + 1, 0],
                [1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),
        'V': CreatePieceMesh(
            gl,
            [
                [- 1, 1, 0],
                [1, 1, 0],
                [0, 0, 0],
            ],
            [0, 1, 2]
        ),
        '^': CreatePieceMesh(
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