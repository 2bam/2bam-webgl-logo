console.log("Hello World!");

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl");

function loadShader(type: 'vertex' | 'fragment', sourceCode: string) {
    const shader = gl.createShader(type === 'vertex' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, sourceCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Couldn't compile ${type} shader`);
        return null;
    }
    return shader;
}

const vertexShader = `
attribute vec3 aVertexPosition;
void main() {
    gl_Position = vec4(aVertexPosition,1);
}
`;

const framentShader = `
precision mediump float;
void main() {
    gl_FragColor = vec4(1,1,1,1);
}
`;

const program = gl.createProgram();
gl.attachShader(program, loadShader('vertex', vertexShader));
gl.attachShader(program, loadShader('fragment', framentShader));
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.error("Couldn't link program");

gl.useProgram(program);

const aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
const vtx = [
    0, .5, 0,
    -.5, -.5, 0,
    .5, -.5, 0
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vtx), gl.STATIC_DRAW);
gl.clearColor(0, 0, 0, 1);

function draw() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!
    gl.enableVertexAttribArray(aVertexPosition);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

draw();