
import { LoadProgram } from './utils-render';

export interface Material<TA extends string, TU extends string> {
    program: WebGLProgram,
    attrib: Record<TA, number>,
    uniform: Record<TU, WebGLUniformLocation>,
}

export function LoadMaterial<TA extends string, TU extends string>(gl: WebGLRenderingContext, vertexShader: string,
    fragmentShader: string, attribNames: TA[], uniformNames: TU[]): Material<TA, TU> {

    const program = LoadProgram(gl, vertexShader, fragmentShader);
    if (!program) throw new Error("Couldn't create program");

    attribNames.forEach(n => { if (gl.getAttribLocation(program, n) < 0) console.error("Bad aname " + n); });
    uniformNames.forEach(n => { if (gl.getUniformLocation(program, n) as number < 0) console.error("Bad uname " + n); });

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