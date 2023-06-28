import { vec3, mat4, ReadonlyVec3, ReadonlyVec4, ReadonlyMat4 } from 'gl-matrix';
import { DEG_TO_RAD, LoadProgram } from './utils';
import { CreateMeshesForPieces, Piece, UpdatePieceTransform } from './piece';
import { Actor } from './actor';
import { World } from './world';
import { DrawStencil, GetStencilBuffer } from './stencil';
import { CreateMesh, Mesh } from './mesh';
import { SHADER_VERTEX_DEFAULT, SHADER_FRAGMENT_DEFAULT } from './shaders';
import { CreateTerrain } from './terrain';

const MTX_IDENTITY: ReadonlyMat4 = mat4.create();

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const gl = canvas.getContext("webgl", { stencil: true, alpha: true });



const defaultProgram = LoadProgram(gl, SHADER_VERTEX_DEFAULT, SHADER_FRAGMENT_DEFAULT);
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

const meshesPieces = CreateMeshesForPieces(gl);


const { meshTerrain, colorsTerrain } = CreateTerrain(gl);



const logo = `
  /--
  V  )  +---     ^    &  /|           
     )  |   )  /  &   )&/ )          
  /--   +---   +---+  | V |        
 /      |   )  |   |  |   |         
 -----  +---   -   -  -   -
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

    const withNeeds = all.map(e => {
        //const needs = prevLevel.filter(e => Math.abs(e.gx - gx) <= 1).map(e => e.uid);
        const needs = e.gy === 0 ? [] : all.filter(other => Math.abs(other.gx - e.gx) <= 1 && Math.abs(other.gy - e.gy) <= 1).map(e => e.uid);
        return { ...e, needs };
    }
    );

    const pieces: Piece[] = withNeeds.map(({ gx, gy, uid, needs, ch }) => {
        const position: vec3 = [gx * .2 - 3, gy * .2, 0];
        const mesh = meshesPieces[ch] ? meshesPieces[ch] : meshesPieces['default'];
        return {
            uid,
            position,
            targetPosition: [...position],
            velocity: [0, 0, 0],
            eulerAngles: [0, 0, 0],
            eulerVelocity: [0, 0, 0],
            transform: mat4.create(),
            needs,
            mesh
        };
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

function Scatter(ps: Piece[]) {
    for (const a of actors) {
        a.state.Stop();
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





export const mtxInvView = mat4.create();//FIXME: awkward
export const mtxSprite = mat4.create();//FIXME: awkward

export function DrawSprite(gl: WebGLRenderingContext, at: ReadonlyVec3, color: ReadonlyVec4, mode: 'actor' | 'piece') {
    const mtxModel = mat4.create();
    mat4.identity(mtxModel);
    mat4.translate(mtxModel, mtxModel, at);
    if (mode === 'actor') // Actor always facing camera
        mat4.mul(mtxModel, mtxModel, mtxSprite);
    mat4.scale(mtxModel, mtxModel, [0.1, 0.1, 0.1]);

    DrawQuad(gl, mtxModel, color);
}

export function DrawQuad(gl: WebGLRenderingContext, transform: mat4, color: ReadonlyVec4) {
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

    gl.drawElements(gl.TRIANGLE_STRIP, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

}

function DrawTerrain(gl: WebGLRenderingContext, meshTerrain: Mesh, colorsTerrain: WebGLBuffer) {
    gl.uniformMatrix4fv(uModel, false, MTX_IDENTITY);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshTerrain.vertices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshTerrain.indices);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0); //!

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsTerrain);
    gl.enableVertexAttribArray(aVertexColor);
    gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0); //!

    gl.drawElements(gl.TRIANGLES, meshTerrain.indexCount, gl.UNSIGNED_SHORT, 0);

    // Also draw a wireframe on top
    gl.disableVertexAttribArray(aVertexColor);
    gl.vertexAttrib4f(aVertexColor, .13, .13, .13, 1);
    gl.drawElements(gl.LINES, meshTerrain.indexCount, gl.UNSIGNED_SHORT, 0);
}

function ApplyStencil() {
    gl.viewport(0, 0, canvas.width, canvas.height);

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

    //FIXME: Why do we have to do it each frame?  If we never clear the Stencil Buffer? Maybe because of the viewport, but otherwise (if not changed) why?
    ApplyStencil();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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



    DrawTerrain(gl, meshTerrain, colorsTerrain);


    // Draw flying sprites
    DrawSprite(gl, [1, 0, 0], [1, 0, 1, 1], 'actor');
    DrawSprite(gl, [1, 1, 0], [1, .5, 1, 1], 'actor');
    DrawSprite(gl, [1, 0, 1], [1, 0, .5, 1], 'actor');
    DrawSprite(gl, [1, 1, 1], [.5, 0, 1, 1], 'actor');
    DrawSprite(gl, [-1, 1, 1], [.5, 0, 1, 1], 'actor');
    //drawSprite(gl, [-1, 1, 2], [.5, 1, 1, 1], 'actor');


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
        DrawMesh(gl, piece.transform, piece.mesh);
    }

    requestAnimationFrame(frame);
}

// High level coordination for the actors
function scheduleActorsThink() {
    const notPlaced = pieces.filter(p => !world.placed.has(p.uid));
    if (notPlaced.length === 0 && actors.every(actor => actor.state.CanDance())) {
        for (const actor of actors) {
            actor.state.Dance();
        }
    }
    else {
        const notAssigned = notPlaced.filter(p => !world.assigned.has(p.uid));
        const notMidFlight = notAssigned.filter(p => p.position[1] === 0);

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
    }

    setTimeout(scheduleActorsThink, 100);
}

function WebGLSetup() {
    gl.clearColor(0, 0, 0, 0);
}

function Setup() {
    WebGLSetup();

    ApplyStencil();

    lastTime = performance.now() / 1000.0;
    requestAnimationFrame(frame);
    scheduleActorsThink();

    // One shot initial scatter after a second
    setTimeout(() => Scatter(pieces), 1000);

    function tap(ev: Event) {
        Scatter([...world.placed.values()]);
    }

    canvas.addEventListener('click', tap);
    canvas.addEventListener('touchstart', tap);
}

Setup();