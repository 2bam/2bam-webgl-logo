import { vec3 } from "gl-matrix";

function LoadShader(gl: WebGLRenderingContext, type: "vertex" | "fragment", sourceCode: string) {
    const shader = gl.createShader(type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    if (!shader) {
        throw new Error(`Error creating ${type} shader`);
    }
    gl.shaderSource(shader, sourceCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var compilationLog = gl.getShaderInfoLog(shader);
        console.error(`Couldn't compile ${type} shader`);
        console.error("Shader compiler log: " + compilationLog);
        gl.deleteShader(shader);
        throw new Error("Error compiling shader");
    }
    return shader;
}

export function LoadProgram(gl: WebGLRenderingContext, vertexShader: string, fragmentShader: string) {
    const program = gl.createProgram();
    gl.attachShader(program, LoadShader(gl, "vertex", vertexShader));
    gl.attachShader(program, LoadShader(gl, "fragment", fragmentShader));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Couldn't link program");
        gl.deleteProgram(program);
    }
    return program;
}

export async function LoadTexture(gl: WebGLRenderingContext, src: string): Promise<WebGLTexture> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGB5_A1, gl.UNSIGNED_SHORT_5_5_5_1, image); FIXME: use this

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // // Prevents s-coordinate wrapping (repeating).
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            // // Prevents t-coordinate wrapping (repeating).
            // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            //     gl.generateMipmap(gl.TEXTURE_2D);

            resolve(tex);
        };
        image.onerror = err => reject(err);
        image.src = src;
    });
}

// We assume no internal vertices as we deal with simple shapes. We'll also asume triangle strip mode.
export function ExtrudeTriangleStripWithoutCentralVertices(vertices: vec3[], indices: number[], zDepth: number) {
    //return { vertices, indices };

    const zOffset = vec3.fromValues(0, 0, zDepth);
    const iOffset = vertices.length;

    // Add the other displaced face
    const newVertices = vertices.concat(vertices.map(v => vec3.add(vec3.create(), v, zOffset)));
    const newIndices = indices.concat(indices.map(i => i + iOffset));
    // Then, zip 'em
    for (let i = 0; i < indices.length; i++) newIndices.push(newIndices[i], newIndices[i + iOffset]);

    return { vertices: newVertices, indices: newIndices };
}

export function FlatVec3(vs: vec3[]): number[] {
    return vs.flatMap(v => [...v]);
}
