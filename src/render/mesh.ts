
import { mat4, vec3 } from 'gl-matrix';
import { FlatVec3 } from './utils-render';

export interface Mesh {
    vertices: WebGLBuffer;
    indices: WebGLBuffer;
    indexCount: number;
}

export function CreateMesh(gl: WebGLRenderingContext, vs: vec3[], ics: number[]): Mesh {
    const vertices = gl.createBuffer();
    if (!vertices) throw new Error('Error creating buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(FlatVec3(vs)), gl.STATIC_DRAW);

    const indices = gl.createBuffer();
    if (!indices) throw new Error('Error creating buffer');
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ics), gl.STATIC_DRAW);

    return { vertices, indices, indexCount: ics.length };
}

