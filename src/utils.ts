import { vec3 } from "gl-matrix";

export const DEG_TO_RAD = Math.PI / 180;

function LoadShader(gl: WebGLRenderingContext, type: 'vertex' | 'fragment', sourceCode: string) {
    const shader = gl.createShader(type === 'vertex' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    if (!shader) {
        throw new Error(`Error creating ${type} shader`);
    }
    gl.shaderSource(shader, sourceCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var compilationLog = gl.getShaderInfoLog(shader);
        console.error(`Couldn't compile ${type} shader`);
        console.error('Shader compiler log: ' + compilationLog);
        gl.deleteShader(shader);
        throw new Error('Error copiling shader');
    }
    return shader;
}

export function LoadProgram(gl: WebGLRenderingContext, vertexShader: string, fragmentShader: string) {
    const program = gl.createProgram();
    gl.attachShader(program, LoadShader(gl, 'vertex', vertexShader));
    gl.attachShader(program, LoadShader(gl, 'fragment', fragmentShader));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Couldn't link program");
        gl.deleteProgram(program);
    }
    return program;
}

export interface Material<TA extends string, TU extends string> {
    program: WebGLProgram,
    attrib: Record<TA, number>,
    uniform: Record<TU, WebGLUniformLocation>,
}

export function LoadMaterial<TA extends string, TU extends string>(gl: WebGLRenderingContext, vertexShader: string,
    fragmentShader: string, attribNames: TA[], uniformNames: TU[]): Material<TA, TU> {
    const program = gl.createProgram();
    gl.attachShader(program, LoadShader(gl, 'vertex', vertexShader));
    gl.attachShader(program, LoadShader(gl, 'fragment', fragmentShader));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Couldn't link program");
        gl.deleteProgram(program);
    }

    // Note: Casting to assert we're sure it's the full Record as we're mapping the names.
    //       Object.fromEntries doesn't keep the key types on the returned object.
    const attrib = Object.fromEntries(attribNames.map(name => [name, gl.getAttribLocation(program, name)])) as Record<TA, number>;
    const uniform = Object.fromEntries(uniformNames.map(name => [name, gl.getUniformLocation(program, name)])) as Record<TU, WebGLUniformLocation>;

    return {
        program,
        attrib,
        uniform,
    };
}



// We assume no internal vertices as we deal with simple shapes. We'll also asume triangle strip mode.
export function ExtrudeTriangleStripWithoutCentralVertices(vertices: vec3[], indices: number[], zDepth: number) {
    const zOffset = vec3.fromValues(0, 0, zDepth);
    const iOffset = vertices.length;

    // Add the other displaced face
    const newVertices = vertices.concat(vertices.map(v => vec3.add(vec3.create(), v, zOffset)));
    const newIndices = indices.concat(indices.map(i => i + iOffset));
    // Then, zip 'em
    for (let i = 0; i < indices.length; i++)
        newIndices.push(newIndices[i], newIndices[i + iOffset]);

    return { vertices: newVertices, indices: newIndices };
};

export function FlatVec3(vs: vec3[]): number[] {
    return vs.flatMap(v => [...v]);
}
