export const DEG_TO_RAD = Math.PI / 180;

export function loadShader(gl: WebGLRenderingContext, type: 'vertex' | 'fragment', sourceCode: string) {
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

export function loadProgram(gl: WebGLRenderingContext, vertexShader: string, fragmentShader: string) {
    const program = gl.createProgram();
    gl.attachShader(program, loadShader(gl, 'vertex', vertexShader));
    gl.attachShader(program, loadShader(gl, 'fragment', fragmentShader));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Couldn't link program");
        gl.deleteProgram(program);
    }
    return program;
}

