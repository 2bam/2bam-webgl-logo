import { vec3, mat4, ReadonlyVec4, ReadonlyMat4 } from 'gl-matrix';
import { DEG_TO_RAD, Material } from './render/utils-render';
import { Piece, UpdatePieceTransform } from './scene/piece';
import { Actor, RandomFrontLocation } from './scene/actor/actor';
import { World } from './scene/world';
import { DrawStencil, GetStencilBuffer } from './render/stencil';
import { Mesh } from './render/mesh';
import { Context, CreateContext } from './render/context';

const LOGO = `
  /--
  V  )  +---     ^    &  /|           
     )  |   )  /  &   )&/ )          
  /--   +---   +---+  | V |        
 /      |   )  |   |  |   |         
 -----  +---   -   -  -   -
`;

const MTX_IDENTITY: ReadonlyMat4 = mat4.create();

function CreatePiecesWithDependencies(logo: string, meshesPieces: { [ch: string]: Mesh; }): Piece[] {
    console.log(logo);
    const lines = logo.split('\n');
    lines.reverse();

    const compactLines = lines
        .map(l =>
            [...l]
                .map((ch, gx) => ({ ch, gx }))
                .filter(e => e.ch !== ' ')
        )
        .filter(l => l.length > 0)
        ;

    let nextPieceUid = 1;
    const characters = compactLines
        .map(
            (es, gy) => es.map(({ ch, gx }) => ({ gx, gy, ch, needs: [], uid: nextPieceUid++ }))
        )
        .flat()
        ;

    // Here we connect dependencies so they grow the sign one piece after another instead of randomly
    // (which sometimes would make pieces look like they're flying)
    const withNeeds = characters.map(e => {
        //const needs = prevLevel.filter(e => Math.abs(e.gx - gx) <= 1).map(e => e.uid);
        const needs =
            e.gy === 0
                ? [] // Special case, make ground level pieces depend on nothing so they can be placed always
                : characters
                    .filter(other => Math.abs(other.gx - e.gx) <= 1 && Math.abs(other.gy - e.gy) <= 1)
                    .map(e => e.uid);

        return { ...e, needs };
    });

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
            mesh,
            random: Math.floor(Math.random() * 4)
        };
    });
    return pieces;
}

function Scatter(world: World) {
    for (const a of world.actors) {
        a.state.Scare();
    }

    for (const p of world.placed.values()) {
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



// export function DrawSprite(gl: WebGLRenderingContext, at: ReadonlyVec3, color: ReadonlyVec4, mode: 'actor' | 'piece') {
//     const mtxModel = mat4.create();
//     mat4.identity(mtxModel);
//     mat4.translate(mtxModel, mtxModel, at);
//     if (mode === 'actor') // Actor always facing camera
//         mat4.mul(mtxModel, mtxModel, mtxSprite);
//     mat4.scale(mtxModel, mtxModel, [0.1, 0.1, 0.1]);

//     DrawQuad(gl, mtxModel, color);
// }

export function DrawActorQuadTEMP(ctx: Context, transform: mat4, color: ReadonlyVec4) {
    DrawQuad(ctx, transform, color, ctx.materialDefault);
}

export function DrawQuad({ gl, meshQuad }: Context, transform: mat4, color: ReadonlyVec4, material: Material<'aVertexPosition' | 'aVertexColor', 'uModel'>) {
    const { attrib: { aVertexPosition, aVertexColor }, uniform: { uModel } } = material;

    gl.uniformMatrix4fv(uModel, false, transform);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshQuad.vertices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshQuad.indices);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    // gl.bindBuffer(gl.ARRAY_BUFFER, clrQuad);
    // gl.enableVertexAttribArray(aVertexColor);
    // gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0); 

    gl.disableVertexAttribArray(aVertexColor);
    gl.vertexAttrib4f(aVertexColor, color[0], color[1], color[2], color[3]);

    gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0);

}

//FIXME: Move to Mesh.ts and pass around a context/info instead of "gl" with the programs and attribs/uniform locations
//FIXME: This func is the bottleneck
export function DrawMesh(gl: WebGLRenderingContext, transform: mat4, mesh: Mesh, material: Material<'aVertexPosition' | 'aVertexColor', 'uModel'>, tex?: WebGLTexture) {
    const { attrib: { aVertexPosition, aVertexColor }, uniform: { uModel } } = material;

    gl.uniformMatrix4fv(uModel, false, transform);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);

    // gl.bindBuffer(gl.ARRAY_BUFFER, clrQuad);
    // gl.enableVertexAttribArray(aVertexColor);
    // gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0); 

    gl.disableVertexAttribArray(aVertexColor);
    gl.vertexAttrib4fv(aVertexColor, [1, 1, 0.5, 1]); // FIXME HACK drawmesh only used for logo and has hardcoded yellow

    gl.drawElements(gl.TRIANGLE_STRIP, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

}

export function DrawTexturedMesh(gl: WebGLRenderingContext, transform: ReadonlyMat4, mesh: Mesh, material: Material<'aVertexPosition' | 'aVertexColor' | 'aTexCoord', 'uModel' | 'uTexture'>, tex: WebGLTexture, uvs: WebGLBuffer, uvsOffset: number) {
    const { attrib: { aVertexPosition, aVertexColor, aTexCoord }, uniform: { uModel } } = material;

    gl.uniformMatrix4fv(uModel, false, transform);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvs);
    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, uvsOffset);
    // gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices);
    // gl.enableVertexAttribArray(aTexCoord);
    // gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 3 * 4, uvsOffset);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);

    gl.disableVertexAttribArray(aVertexColor);
    gl.vertexAttrib4fv(aVertexColor, [1, 1, 1, 1]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(material.uniform.uTexture, 0);

    gl.drawElements(gl.TRIANGLE_STRIP, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

}

function DrawTerrain(gl: WebGLRenderingContext, meshTerrain: Mesh, colorsTerrain: WebGLBuffer, material: Material<'aVertexPosition' | 'aVertexColor', 'uModel'>) {
    const { attrib: { aVertexPosition, aVertexColor }, uniform: { uModel } } = material;

    gl.uniformMatrix4fv(uModel, false, MTX_IDENTITY);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshTerrain.vertices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshTerrain.indices);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsTerrain);
    gl.enableVertexAttribArray(aVertexColor);
    gl.vertexAttribPointer(aVertexColor, 4, gl.UNSIGNED_BYTE, true, 0, 0);

    gl.drawElements(gl.TRIANGLES, meshTerrain.indexCount, gl.UNSIGNED_SHORT, 0);

    // Also draw a wireframe on top
    gl.disableVertexAttribArray(aVertexColor);
    gl.vertexAttrib4f(aVertexColor, .13, .13, .13, 1);
    gl.drawElements(gl.LINES, meshTerrain.indexCount, gl.UNSIGNED_SHORT, 0);
}

function ApplyStencil({ gl, canvas, materialStencil }: Context) {
    const { program, attrib: { aVertexPosition } } = materialStencil;
    gl.viewport(0, 0, canvas.width, canvas.height);

    //FIXME: move to stencil.ts
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.useProgram(program);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, GetStencilBuffer(gl).vertices);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0,); // Needs buffer bound!

    DrawStencil(gl);
}


function ScheduleFrameLoop(ctx: Context, world: World) {
    let lastTime: number = performance.now() / 1000.0;
    const mtxInvView = mat4.create();

    function Frame(timeMillis: number) {
        const { pieces, placed, actors } = world;
        const { gl, canvas, materialDefault, meshTerrain, colorsTerrain } = ctx;

        const time = timeMillis / 1000.0;
        const deltaTime = Math.min(time - lastTime, 1); // Clamp delta time in case window lost focus and gets too big
        lastTime = time;



        for (const piece of pieces) {
            if (placed.has(piece.uid)) {
                continue;
            }

            vec3.scaleAndAdd(piece.velocity, piece.velocity, [0, -9.8, 0], deltaTime);
            vec3.scaleAndAdd(piece.position, piece.position, piece.velocity, deltaTime);

            vec3.scaleAndAdd(piece.eulerAngles, piece.eulerAngles, piece.eulerVelocity, deltaTime);

            if (piece.position[1] <= 0) {
                vec3.zero(piece.velocity);

                piece.position[1] = 0;

                vec3.zero(piece.eulerVelocity);
            }

            UpdatePieceTransform(piece);
        }

        gl.viewport(0, 0, canvas.width, canvas.height);

        //FIXME: Why do we have to do it each frame?  If we never clear the Stencil Buffer? Maybe because of the viewport, but otherwise (if not changed) why?
        ApplyStencil(ctx);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(materialDefault.program);


        const mtxProjection = mat4.create();
        const mtxView = mat4.create();
        const mtxModel = mat4.create();
        mat4.perspective(mtxProjection, 90 * DEG_TO_RAD, canvas.width / canvas.height, 0.1, 100);

        mat4.identity(mtxView);
        const t = time * 0.001;
        const m = 0.1;
        mat4.lookAt(mtxView, [Math.cos(t) * m, Math.sin(t) * m + 1, 3], [0, 0, 0], [0, 1, 0]);

        gl.uniformMatrix4fv(materialDefault.uniform.uProjection, false, mtxProjection);
        gl.uniformMatrix4fv(materialDefault.uniform.uView, false, mtxView);

        mat4.invert(mtxInvView, mtxView);
        const lookAtViewTranslation = vec3.create();
        mat4.getTranslation(lookAtViewTranslation, mtxView);
        mat4.translate(ctx.mtxSpriteFaceCamera, mtxInvView, lookAtViewTranslation);

        gl.disable(gl.DEPTH_TEST);
        DrawTerrain(gl, meshTerrain, colorsTerrain, materialDefault);

        // Don't do depth testing for terrain
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.DEPTH_BUFFER_BIT);



        // Draw flying sprites
        // DrawSprite(gl, [1, 0, 0], [1, 0, 1, 1], 'actor');
        // DrawSprite(gl, [1, 1, 0], [1, .5, 1, 1], 'actor');
        // DrawSprite(gl, [1, 0, 1], [1, 0, .5, 1], 'actor');
        // DrawSprite(gl, [1, 1, 1], [.5, 0, 1, 1], 'actor');
        // DrawSprite(gl, [-1, 1, 1], [.5, 0, 1, 1], 'actor');
        ////drawSprite(gl, [-1, 1, 2], [.5, 1, 1, 1], 'actor');


        // for (const piece of pieces) {
        //     piecesQuads.add(piece.position

        // }

        gl.useProgram(ctx.materialUnlitTex.program);
        gl.uniformMatrix4fv(ctx.materialUnlitTex.uniform.uProjection, false, mtxProjection);
        gl.uniformMatrix4fv(ctx.materialUnlitTex.uniform.uView, false, mtxView);
        for (const actor of actors) {
            actor.state.OnUpdate(time, deltaTime);
            //console.log(actor.state.constructor.name);

            //l.bindTexture(gl.TEXTURE_2D, texRat);
            //gl.useProgram(texProgram);

            const xf = actor.state.GetTransform(ctx);

            //const off = Math.floor(((time * 4) % 1) * 4) * 32;
            //const off = Math.floor(((time / 4) % 1) * 4) * 32;
            const uvOffset = actor.state.GetFrame(time) * 32;

            DrawTexturedMesh(gl, xf, ctx.meshQuad, ctx.materialUnlitTex, ctx.texRatAnim, ctx.uvsBasic, uvOffset);

        }


        gl.useProgram(ctx.materialUnlitTex.program);
        gl.uniformMatrix4fv(ctx.materialUnlitTex.uniform.uProjection, false, mtxProjection);
        gl.uniformMatrix4fv(ctx.materialUnlitTex.uniform.uView, false, mtxView);
        for (const piece of pieces) {
            //if (placed.has(piece.uid))
            DrawTexturedMesh(gl, piece.transform, piece.mesh, ctx.materialUnlitTex, ctx.texCheese, ctx.uvsBasic, piece.random * 32);
            //DrawMesh(gl, piece.transform, piece.mesh, ctx.materialDefault);
        }

        requestAnimationFrame(Frame);
    }
    requestAnimationFrame(Frame);
}

// High level coordination for the actors
function ScheduleActorsThink(world: World) {
    const { pieces, actors } = world;

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

    setTimeout(() => ScheduleActorsThink(world), 100);
}

async function WebGLSetup(gl: WebGLRenderingContext) {
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
}

function WorldSetup({ meshesPieces }: Context) {
    const world = new World();
    const pieces = CreatePiecesWithDependencies(LOGO, meshesPieces);
    for (const piece of pieces) world.PlacePiece(piece);

    const actors: Actor[] = [];
    for (let i = 0; i < 10; i++) { actors.push(new Actor(world, RandomFrontLocation())); }

    world.pieces = pieces;
    world.actors = actors;

    return world;
}

export async function Main(canvas: HTMLCanvasElement) {
    const ctx = await CreateContext(canvas);
    await WebGLSetup(ctx.gl);
    const world = WorldSetup(ctx);

    //ApplyStencil(gl);

    ScheduleFrameLoop(ctx, world);
    ScheduleActorsThink(world);

    // One shot initial scatter after a second
    setTimeout(() => Scatter(world), 1000);

    function onTap() {
        Scatter(world);
    }
    canvas.addEventListener('click', onTap);
    //canvas.addEventListener('touchstart', onTap);

    canvas.addEventListener("webglcontextlost", () => {
        // Easy peasy
        location.reload();
    });
}

