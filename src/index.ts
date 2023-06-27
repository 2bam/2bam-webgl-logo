import { vec3, vec4, mat4 } from 'gl-matrix';
import { loadShader } from './utils'

console.log("Hello World!");

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl");


const vertexShader = `
attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
varying vec4 vColor;
void main() {
    gl_Position = uProjection * uView * uModel * vec4(aVertexPosition,1);
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
gl.attachShader(program, loadShader(gl, 'vertex', vertexShader));
gl.attachShader(program, loadShader(gl, 'fragment', framentShader));
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Couldn't link program");
    gl.deleteProgram(program);
}



const aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
const aVertexColor = gl.getAttribLocation(program, 'aVertexColor');
const uProjection = gl.getUniformLocation(program, 'uProjection');
const uView = gl.getUniformLocation(program, 'uView');
const uModel = gl.getUniformLocation(program, 'uModel');

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


const terrainPts = [];
const terrainCls = [];
const terrainIdx = [];
const terrainStride = 20;
for (let z = -2; z < 10; z++) {
    for (let x = -10; x < 10; x++) {
        const y = 0 + Math.random() * 0.3;
        terrainPts.push(x, y, z);
        terrainCls.push(Math.floor(Math.random() * 255), 0, Math.floor(Math.random() * 255), 255);
        terrainCls.push((x + 10) * 10, 0, (z + 10) * 10, 255);
    }
}
let i = 0;
for (let z = -2; z < 9; z++) {

    for (let x = -10; x < 9; x++) {
        terrainIdx.push(i, i + 1, i + terrainStride + 1, i + terrainStride + 1, i + terrainStride, i);
        //terrainIdx.push(i, i + 1, i + terrainStride);
        i++;
    }
    //i += terrainStride / 2;
    i++;
}
console.log(terrainIdx.length, "terrainIdx");

const { vertices: vtxTerrain, indices: idxTerrain } = createVertexBuffer(terrainPts, terrainIdx);
const clrTerrain = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, clrTerrain);
gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(terrainCls), gl.STATIC_DRAW);


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
    gl.useProgram(program);

    const mtxProjection = mat4.create();
    const mtxView = mat4.create();
    const mtxModel = mat4.create();
    mat4.perspective(mtxProjection, 90, canvas.width / canvas.height, 0.1, 100);

    mat4.identity(mtxView);
    mat4.identity(mtxModel);
    const t = time * 0.001;
    const m = 0.1;
    mat4.lookAt(mtxView, [Math.cos(t) * m, Math.sin(t) * m, -1], [0, 0, 0], [0, 1, 0]);
    {

        mat4.translate(mtxModel, mtxModel, [0, -1, 0])
        gl.uniformMatrix4fv(uModel, false, mtxModel);


        gl.bindBuffer(gl.ARRAY_BUFFER, vtxTerrain);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxTerrain);
        gl.enableVertexAttribArray(aVertexPosition);
        gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!


        gl.bindBuffer(gl.ARRAY_BUFFER, clrTerrain);
        gl.enableVertexAttribArray(aVertexColor);
        gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0); //!

        gl.drawElements(gl.TRIANGLES, terrainIdx.length, gl.UNSIGNED_SHORT, 0);


    }
    {
        mat4.identity(mtxModel);

        gl.uniformMatrix4fv(uProjection, false, mtxProjection);
        gl.uniformMatrix4fv(uView, false, mtxView);
        gl.uniformMatrix4fv(uModel, false, mtxModel);

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
    }





    requestAnimationFrame(draw)
}

draw(0);