import { vec3, vec4, mat4 } from 'gl-matrix';

console.log("Hello World!");

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl");

function loadShader(type: 'vertex' | 'fragment', sourceCode: string) {
    const shader = gl.createShader(type === 'vertex' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, sourceCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Couldn't compile ${type} shader`);
        var compilationLog = gl.getShaderInfoLog(shader);
        console.error('Shader compiler log: ' + compilationLog);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = `
attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;
uniform mat4 uModelView;
uniform mat4 uProjection;
varying vec4 vColor;
void main() {
    gl_Position = uProjection * uModelView * vec4(aVertexPosition,1);
    vColor = aVertexColor;
}
`;

const framentShader = `
precision mediump float;
varying vec4 vColor;
void main() {
    gl_FragColor = vColor;
}
`;

const program = gl.createProgram();
gl.attachShader(program, loadShader('vertex', vertexShader));
gl.attachShader(program, loadShader('fragment', framentShader));
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Couldn't link program");
    gl.deleteProgram(program);
}

gl.useProgram(program);

const aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
const aVertexColor = gl.getAttribLocation(program, 'aVertexColor');
const uProjection = gl.getUniformLocation(program, 'uProjection');
const uModelView = gl.getUniformLocation(program, 'uModelView');

function createVertexBuffer(vtx: number[], inds: number[]) {
    const vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vtx), gl.STATIC_DRAW);
    const indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(inds), gl.STATIC_DRAW);
    return { vertices, indices };
}


const { vertices: vtxQuad, indices: idxQuad } = createVertexBuffer(
    [
        -1, -1, 0,
        1, -1, 0,
        -1, 1, 0,
        1, 1, 0,
    ],
    [0, 1, 2, 3]
)

const colors = [
    255, 0, 0, 255,
    0, 255, 0, 255,
    0, 0, 255, 255,
    255, 255, 255, 255
];
const clrQuad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, clrQuad);
gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);


const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
const vtx = [
    0, .5, 0,
    -.5, -.5, 0,
    .5, -.5, 0
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vtx), gl.STATIC_DRAW);

gl.clearColor(0, 0, 0, 1);

type Color = vec4;

function drawSprite(at: vec3, color: Color, camera: mat4) {

}

function draw(time: number) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    // gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!
    // gl.enableVertexAttribArray(aVertexPosition);
    // gl.drawArrays(gl.TRIANGLES, 0, 3);

    const mtxProjection = mat4.create();
    const mtxModelView = mat4.create();
    mat4.perspective(mtxProjection, 90, canvas.width / canvas.height, 0.1, 100);

    mat4.identity(mtxModelView);
    const t = time * 0.001;
    const m = 0.1;
    mat4.lookAt(mtxModelView, [Math.cos(t) * m, Math.sin(t) * m, -1], [0, 0, 0], [0, 1, 0]);

    gl.uniformMatrix4fv(uProjection, false, mtxProjection)
    gl.uniformMatrix4fv(uModelView, false, mtxModelView)

    gl.bindBuffer(gl.ARRAY_BUFFER, vtxQuad);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxQuad);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!


    gl.bindBuffer(gl.ARRAY_BUFFER, clrQuad);
    gl.enableVertexAttribArray(aVertexColor);
    gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0); //!


    //gl.disableVertexAttribArray(aVertexColor);
    //gl.vertexAttrib4f(aVertexColor, 1, 0, 0, 1);
    gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(draw)
}

draw(0);