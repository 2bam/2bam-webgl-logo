import { vec3, vec4, mat4, ReadonlyVec3, ReadonlyVec4 } from 'gl-matrix';
import { DEG_TO_RAD, extrude, flatVec3, loadProgram, loadShader } from './utils';
import { Piece, UpdatePieceTransform } from './piece';
import { Actor } from './actor';
import { World } from './world';
import { DrawStencil, GetStencilBuffer } from './stencil';
import { CreateMesh, Mesh } from './mesh';


const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl", { stencil: true, alpha: true });


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

const fragmentShader = `
precision mediump float;
varying vec4 vColor;
void main() {
    gl_FragColor = vColor;
}
`;


const defaultProgram = loadProgram(gl, vertexShader, fragmentShader);

const aVertexPosition = gl.getAttribLocation(defaultProgram, 'aVertexPosition');
const aVertexColor = gl.getAttribLocation(defaultProgram, 'aVertexColor');
const uProjection = gl.getUniformLocation(defaultProgram, 'uProjection');
const uView = gl.getUniformLocation(defaultProgram, 'uView');
const uModel = gl.getUniformLocation(defaultProgram, 'uModel');




const meshQuad = CreateMesh(
    gl,
    [
        [-1, -1, 0],
        [1, -1, 0],
        [-1, 1, 0],
        [1, 1, 0],
    ],
    [0, 1, 2, 3]
);

const extruded = extrude(
    [
        [-1, -1, 0],
        [1, -1, 0],
        [-1, 1, 0],
        [1, 1, 0],
    ],
    [0, 1, 2, 3]
    , .7
);
const meshBlock = CreateMesh(
    gl,
    extruded.vertices,
    extruded.indices,
);



const terrainPts: vec3[] = [];
const terrainCls = [];
const terrainIdx = [];
const TERRAIN_SIZE = 0.5;
const terrainStride = 20;
for (let z = -5; z < 7; z++) {
    for (let x = -10; x < 10; x++) {
        const y = 0 + Math.random() * 0.3;
        terrainPts.push([x * TERRAIN_SIZE, y * TERRAIN_SIZE, z * TERRAIN_SIZE]);

        // This was a bug, but ended up looking cool.
        terrainCls.push(Math.floor(Math.random() * 255), 0, Math.floor(Math.random() * 255), 255);
        terrainCls.push((x + 10) * 10, 0, (z + 10) * 10, 255);
    }
}
let i = 0;
for (let z = -5; z < 6; z++) {

    for (let x = -10; x < 9; x++) {
        terrainIdx.push(i, i + 1, i + terrainStride + 1, i + terrainStride + 1, i + terrainStride, i);
        //terrainIdx.push(i, i + 1, i + terrainStride);
        i++;
    }
    //i += terrainStride / 2;
    i++;
}
console.log(terrainIdx.length, "terrainIdx");




const meshTerrain = CreateMesh(gl, terrainPts, terrainIdx);
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

gl.clearColor(0, 0, 0, 0);



const logo = `
 ---
'   &  +---     /&    |&   /|           
    /  |   )   /  &   | & / |          
 ---   +---   +----+  |  V  |        
/      |   )  |    |  |     |         
-----  +---   -    -  -     -
`;



function makePieces() {
    console.log(logo);
    const lines = logo.split('\n');
    lines.reverse();

    let uid = 1;

    const linesp = lines.map(l => [...l].map((ch, gx) => ({ ch, gx })).filter(e => e.ch !== ' ')).filter(l => l.length > 0);

    const roots = linesp[0].map(({ ch, gx }) => ({ gx, gy: 0, ch, needs: [], uid: uid++ }));
    let prevLevel = roots;
    const levels = [roots];
    for (let gy = 1; gy < linesp.length; gy++) {
        const currLevel = linesp[gy].map(({ ch, gx }) => {
            return { gx, gy, ch, needs: [], uid: uid++ };
        });
        levels.push(currLevel);
        prevLevel = currLevel;
    }

    const all = levels.flat();
    console.log(all);

    const withNeeds = all.map(e => {
        //const needs = prevLevel.filter(e => Math.abs(e.gx - gx) <= 1).map(e => e.uid);
        const needs = e.gy === 0 ? [] : all.filter(other => Math.abs(other.gx - e.gx) <= 1 && Math.abs(other.gy - e.gy) <= 1).map(e => e.uid);
        return { ...e, needs };
    }
    );

    const pieces: Piece[] = withNeeds.map(({ gx, gy, uid, needs }) => {
        const position: vec3 = [gx * .2 - 3, gy * .2, 0];
        return { uid, position, targetPosition: [...position], velocity: [0, 0, 0], eulerAngles: [0, 0, 0], eulerVelocity: [0, 0, 0], transform: mat4.create(), needs };
    });
    return pieces;
}
const pieces = makePieces();
const world = new World();
for (const piece of pieces) world.PlacePiece(piece);

const actors: Actor[] = [
    new Actor(world, [1, 0, 0]),
    new Actor(world, [0, 0, 1]),
    new Actor(world, [-1, 0, 0]),
    new Actor(world, [0, 0, -1]),
    new Actor(world, [1, 0, 1]),
    new Actor(world, [1, 0, 0]),
    new Actor(world, [0, 0, 1]),
    new Actor(world, [-1, 0, 0]),
    new Actor(world, [0, 0, -1]),
    new Actor(world, [1, 0, 1]),
];

function scatter(ps: Piece[]) {
    for (const a of actors) {
        a.state.Release();
    }

    for (const p of ps) {
        world.placed.delete(p.uid);
        p.velocity[0] = (Math.random() - 0.5) * 5;
        p.velocity[1] = 5 + Math.random() * 0.5;
        p.velocity[2] = (Math.random() - 0.5) * 5;
        p.position[1] = Math.max(p.position[1] + 0.1, 0); //FIXME: Why is this needed if the floor check is done after the integration?

        p.eulerVelocity[0] = (Math.random() - 0.5) * 3000;
        p.eulerVelocity[1] = (Math.random() - 0.5) * 3000;
        p.eulerVelocity[2] = (Math.random() - 0.5) * 3000;
    }
}




//const piecesQuads = new Quads(pieces.length);


export const mtxInvView = mat4.create();//FIXME: awkward
export const mtxSprite = mat4.create();//FIXME: awkward

export function drawSprite(gl: WebGLRenderingContext, at: ReadonlyVec3, color: ReadonlyVec4, mode: 'actor' | 'piece') {
    const mtxModel = mat4.create();
    mat4.identity(mtxModel);
    mat4.translate(mtxModel, mtxModel, at);
    if (mode === 'actor') // Actor always facing camera
        mat4.mul(mtxModel, mtxModel, mtxSprite);
    mat4.scale(mtxModel, mtxModel, [0.1, 0.1, 0.1]);

    drawQuad(gl, mtxModel, color);
}

export function drawQuad(gl: WebGLRenderingContext, transform: mat4, color: ReadonlyVec4) {
    gl.uniformMatrix4fv(uModel, false, transform);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshQuad.vertices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshQuad.indices);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!

    // gl.bindBuffer(gl.ARRAY_BUFFER, clrQuad);
    // gl.enableVertexAttribArray(aVertexColor);
    // gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0); //!

    gl.disableVertexAttribArray(aVertexColor);
    gl.vertexAttrib4f(aVertexColor, color[0], color[1], color[2], color[3]);

    gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0);

}

//FIXME: Move to Mesh.ts and pass around a context/info instead of "gl" with the programs and attribs/uniform locations
//FIXME: This func is the bottleneck
export function DrawMesh(gl: WebGLRenderingContext, transform: mat4, mesh: Mesh) {
    gl.uniformMatrix4fv(uModel, false, transform);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!

    // gl.bindBuffer(gl.ARRAY_BUFFER, clrQuad);
    // gl.enableVertexAttribArray(aVertexColor);
    // gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0); //!

    gl.disableVertexAttribArray(aVertexColor);
    gl.vertexAttrib4fv(aVertexColor, [1, 1, 0.5, 1]);

    console.log(mesh.indexCount);
    gl.drawElements(gl.TRIANGLE_STRIP, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

}

let lastTime: number;
function frame(timeMillis: number) {

    const time = timeMillis / 1000.0;
    const deltaTime = (time - lastTime);
    lastTime = time;
    for (const piece of pieces) {
        if (world.placed.has(piece.uid)) {
            continue;
        }

        vec3.scaleAndAdd(piece.velocity, piece.velocity, [0, -9.8, 0], deltaTime);
        vec3.scaleAndAdd(piece.position, piece.position, piece.velocity, deltaTime);

        vec3.scaleAndAdd(piece.eulerAngles, piece.eulerAngles, piece.eulerVelocity, deltaTime);

        if (piece.position[1] <= 0) {
            vec3.zero(piece.velocity);
            piece.position[1] = 0;

            vec3.zero(piece.eulerVelocity);
            //vec3.zero(piece.eulerAngles);
        }

        UpdatePieceTransform(piece);


    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    {
        //FIXME: do a shader specially for the stencil, move to stencil.ts
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.useProgram(defaultProgram);
        gl.disableVertexAttribArray(aVertexColor);
        gl.vertexAttrib4f(aVertexColor, 1, 1, 1, 1);
        gl.uniformMatrix4fv(uProjection, false, mat4.create());
        gl.uniformMatrix4fv(uView, false, mat4.create());
        gl.uniformMatrix4fv(uModel, false, mat4.create());
        gl.enableVertexAttribArray(aVertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, GetStencilBuffer(gl).vertices);
        gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0,); // Needs buffer bound!

        DrawStencil(gl);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);



    // gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    // gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!
    // gl.enableVertexAttribArray(aVertexPosition);
    // gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(defaultProgram);


    const mtxProjection = mat4.create();
    const mtxView = mat4.create();
    const mtxModel = mat4.create();
    mat4.perspective(mtxProjection, 90 * DEG_TO_RAD, canvas.width / canvas.height, 0.1, 100);

    mat4.identity(mtxView);
    const t = time * 0.001;
    const m = 0.1;
    mat4.lookAt(mtxView, [Math.cos(t) * m, Math.sin(t) * m + 1, 3], [0, 0, 0], [0, 1, 0]);

    gl.uniformMatrix4fv(uProjection, false, mtxProjection);
    gl.uniformMatrix4fv(uView, false, mtxView);

    mat4.invert(mtxInvView, mtxView);
    const lookAtViewTranslation = vec3.create();
    mat4.getTranslation(lookAtViewTranslation, mtxView);
    mat4.translate(mtxSprite, mtxInvView, lookAtViewTranslation);


    {
        mat4.identity(mtxModel);
        mat4.translate(mtxModel, mtxModel, [0, 0, 0]);
        gl.uniformMatrix4fv(uModel, false, mtxModel);

        gl.bindBuffer(gl.ARRAY_BUFFER, meshTerrain.vertices);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshTerrain.indices);
        gl.enableVertexAttribArray(aVertexPosition);
        gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!


        gl.bindBuffer(gl.ARRAY_BUFFER, clrTerrain);
        gl.enableVertexAttribArray(aVertexColor);
        gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0); //!
        gl.drawElements(gl.TRIANGLES, terrainIdx.length, gl.UNSIGNED_SHORT, 0);

        // Draw wireframe on top
        gl.disableVertexAttribArray(aVertexColor);
        gl.vertexAttrib4f(aVertexColor, .13, .13, .13, 1);
        gl.drawElements(gl.LINES, terrainIdx.length, gl.UNSIGNED_SHORT, 0);
    }
    {
        // mat4.identity(mtxModel);

        // gl.uniformMatrix4fv(uModel, false, mtxModel);

        // gl.bindBuffer(gl.ARRAY_BUFFER, meshQuad.vertices);
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshQuad.indices);
        // gl.enableVertexAttribArray(aVertexPosition);
        // gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!


        // gl.bindBuffer(gl.ARRAY_BUFFER, clrQuad);
        // gl.enableVertexAttribArray(aVertexColor);
        // gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0); //!


        //gl.disableVertexAttribArray(aVertexColor);
        //gl.vertexAttrib4f(aVertexColor, 1, 0, 0, 1);
        //gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0);
    }

    drawSprite(gl, [1, 0, 0], [1, 0, 1, 1], 'actor');
    drawSprite(gl, [1, 1, 0], [1, .5, 1, 1], 'actor');
    drawSprite(gl, [1, 0, 1], [1, 0, .5, 1], 'actor');
    drawSprite(gl, [1, 1, 1], [.5, 0, 1, 1], 'actor');
    drawSprite(gl, [-1, 1, 1], [.5, 0, 1, 1], 'actor');
    drawSprite(gl, [-1, 1, 2], [.5, 1, 1, 1], 'actor');


    // for (const piece of pieces) {
    //     piecesQuads.add(piece.position

    // }

    for (const actor of actors) {
        actor.state.OnUpdate(time, deltaTime);
        //console.log(actor.state.constructor.name);
        actor.state.OnDraw(gl);
    }

    for (const piece of pieces) {
        //if (placed.has(piece.uid))
        DrawMesh(gl, piece.transform, meshBlock);
    }

    requestAnimationFrame(frame);
}

function actorsThink() {
    const notPlacedNorAssigned = pieces.filter(p => !world.placed.has(p.uid) && !world.assigned.has(p.uid));
    const notMidFlight = notPlacedNorAssigned.filter(p => p.position[1] === 0);

    // FIXME: Possibly better to have some time before that...To make sure the dude actually waits if another needs to go first. Maybe that wait "at base" can go in Actors's PlaceState
    // const candidates = notMidFlight.filter(p => p.needs.length === 0 || p.needs.some(n => world.placed.has(n) || world.assigned.has(n)));
    const candidates = notMidFlight.filter(p => p.needs.length === 0 || p.needs.some(n => world.placed.has(n)));

    if (candidates.length) {
        // Build from the bottom up (y = targetPosition[1])
        candidates.sort((a, b) => a.targetPosition[1] !== b.targetPosition[1] ? a.targetPosition[1] - b.targetPosition[1] : Math.random());
        //const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        //const chosen = candidates[0];
        //vec3.copy(chosen.position, chosen.targetPosition);
        //world.placed.set(chosen.uid, chosen);

        // FIXME: get nearest candidate to actors first!

        let candidateIndex = 0;
        actors.sort((a, b) => Math.random());
        for (const actor of actors) {
            if (actor.state.Collect(candidates[candidateIndex])) {
                candidateIndex++;
                if (candidateIndex >= candidates.length) break;
            }
        }
    }
    setTimeout(actorsThink, 100);
}
actorsThink();



function tap(ev: Event) {
    //console.log(ev);
    //TODO: where you click is the center of the explosion
    scatter([...world.placed.values()]);
}

lastTime = performance.now() / 1000.0;
requestAnimationFrame(frame);

setTimeout(() => scatter(pieces), 500);

canvas.addEventListener('click', tap);
canvas.addEventListener('touchstart', tap);
