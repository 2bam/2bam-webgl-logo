import { mat4, vec3 } from "gl-matrix";
import { CreateMesh } from "../render/mesh";

const TERRAIN_SIZE = 0.5;

const TERRAIN_Z0 = -5;
const TERRAIN_Z1 = 6;
const TERRAIN_X0 = -10;
const TERRAIN_X1 = 9;

const TERRAIN_STRIDE = TERRAIN_X1 - TERRAIN_X0 + 1;

export function CreateTerrain(gl: WebGLRenderingContext) {
    const terrainPts: vec3[] = [];
    const terrainCls: number[] = [];
    const terrainIdx: number[] = [];

    // Create a grid of vertices
    // Notice for's <= instead of < to add last "closing" vertices
    for (let z = TERRAIN_Z0; z <= TERRAIN_Z1; z++) {
        for (let x = TERRAIN_X0; x <= TERRAIN_X1; x++) {
            const y = 0 + Math.random() * 0.3;
            terrainPts.push([x * TERRAIN_SIZE, y * TERRAIN_SIZE, z * TERRAIN_SIZE]);

            // This "double push" is a bug, but ended up looking cool. So we keep it!
            terrainCls.push(Math.floor(Math.random() * 255), 0, Math.floor(Math.random() * 255), 255);
            terrainCls.push((x + 10) * 10, 0, (z + 10) * 10, 255);
        }
    }

    // Index all triangles
    let index = 0;
    for (let z = TERRAIN_Z0; z < TERRAIN_Z1; z++) {
        for (let x = TERRAIN_X0; x < TERRAIN_X1; x++) {
            terrainIdx.push(
                index,
                index + 1,
                index + TERRAIN_STRIDE + 1,
                index + TERRAIN_STRIDE + 1,
                index + TERRAIN_STRIDE,
                index
            );
            index++;
        }
        index++;
    }

    const meshTerrain = CreateMesh(gl, terrainPts, terrainIdx);

    const colorsTerrain = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorsTerrain);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(terrainCls), gl.STATIC_DRAW);

    return { meshTerrain, colorsTerrain };
}
