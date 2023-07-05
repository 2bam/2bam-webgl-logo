import { vec3, mat4 } from "gl-matrix";
import { DEG_TO_RAD } from "./utils-math";
import { Piece, PlacePiece, UpdatePieceTransform } from "./scene/piece";
import { Actor, SetDanceCircleLocation, SetRandomFrontLocation } from "./scene/actor";
import { World } from "./scene/world";
import { Mesh } from "./render/mesh";
import { RenderContext, CreateContext } from "./render/context";
import { ApplyStencil } from "./render/stencil";
import { DrawTerrain, DrawTexturedMesh } from "./render/render";

const LOGO = `
  /--
  V  )  +---     ^    &  /|           
     )  |   )  /  &   )&/ )          
  /--   +---   +---+  | V |        
 /      |   )  |   |  |   |         
 -----  +---   -   -  -   -
`;

const FOV = 50;
const CAMERA_HEIGHT = 0.9;
const CAMERA_LOOK_HEIGHT = 0.25;

export async function Main(canvas: HTMLCanvasElement) {
    const ctx = await WebGLSetup(canvas);
    const world = WorldSetup(ctx);

    //ApplyStencil(gl);

    ScheduleFrameLoop(ctx, world);
    ScheduleActorsThink(world);

    // One shot initial scatter after a second
    setTimeout(() => Scatter(world), 1000);

    let lastScatterTime = 0;
    function onTap() {
        // Throttle scatter
        const now = performance.now();
        if (now - lastScatterTime > 100) {
            lastScatterTime = now;
            Scatter(world);
        }
    }
    canvas.addEventListener("click", onTap);

    canvas.addEventListener("webglcontextlost", () => {
        // Easy peasy
        location.reload();
    });
}

async function WebGLSetup(canvas: HTMLCanvasElement): Promise<RenderContext> {
    const ctx = await CreateContext(canvas);
    const { gl } = ctx;

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    return ctx;
}

function WorldSetup({ meshesPieces }: RenderContext) {
    const pieces = CreatePiecesWithDependencies(LOGO, meshesPieces);
    const actors: Actor[] = [];
    const world = new World();
    for (let i = 0; i < 15; i++) {
        actors.push(new Actor(world, i));
    }
    world.pieces = pieces;
    world.actors = actors;

    for (const piece of pieces) PlacePiece(world, piece);

    // Locate most circular but keep some random
    for (let i = 0; i < actors.length; i++) {
        const actor = actors[i];
        if (i % 3 === 0)
            SetRandomFrontLocation(actor.position);
        else
            SetDanceCircleLocation(actor.position, actor);
    }

    return world;
}

function ScheduleFrameLoop(ctx: RenderContext, world: World) {
    let lastTime: number = performance.now() / 1000.0;

    function Frame(timeMillis: number) {
        const time = timeMillis / 1000.0;
        const deltaTime = Math.min(time - lastTime, 1); // Clamp delta time in case window lost focus and gets too big
        lastTime = time;

        UpdateEntities(world, time, deltaTime);
        RenderScene(ctx, world, time);

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
    } else {
        const notAssigned = notPlaced.filter(p => !world.assigned.has(p.uid));
        const notMidFlight = notAssigned.filter(p => p.position[1] === 0);

        // TODO: Possibly better to have some time before that...To make sure the dude actually waits if another needs
        //       to go first. Maybe that wait "at base" can go in Actors's PlaceState
        //       const candidates = notMidFlight.filter(p => p.needs.length === 0 || p.needs.some(n => world.placed.has(n) || world.assigned.has(n)));
        const candidates = notMidFlight.filter(p => p.needs.length === 0 || p.needs.some(n => world.placed.has(n)));

        if (candidates.length) {
            // Build from the bottom up (choose lower "y" first)
            candidates.sort((a, b) =>
                a.targetPosition[1] !== b.targetPosition[1] ? a.targetPosition[1] - b.targetPosition[1] : Math.random()
            );

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

function CreatePiecesWithDependencies(logo: string, meshesPieces: { [ch: string]: Mesh; }): Piece[] {
    console.log(logo);
    const lines = logo.split("\n");
    lines.reverse();

    const compactLines = lines
        .map(l => {
            const chars = [...l];
            return chars.map((ch, gx) => ({ ch, gx })).filter(e => e.ch !== " ");
        })
        .filter(l => l.length > 0);
    let nextPieceUid = 1;
    const characters = compactLines
        .map((es, gy) =>
            es.map(({ ch, gx }) => ({
                gx,
                gy,
                ch,
                needs: [],
                uid: nextPieceUid++,
            }))
        )
        .flat();
    // Here we connect dependencies so they grow the sign one piece after another instead of randomly
    // (which sometimes would make pieces look like they're flying)
    const withNeeds = characters.map(e => {
        const needs =
            e.gy === 0
                ? [] // Special case, make ground level pieces depend on nothing so they can be placed always right away
                : characters
                    .filter(other => Math.abs(other.gx - e.gx) <= 1 && Math.abs(other.gy - e.gy) <= 1)
                    .map(e => e.uid);

        return { ...e, needs };
    });

    const SIGN_OFFSET_X = -2.7;

    const pieces: Piece[] = withNeeds.map(({ gx, gy, uid, needs, ch }) => {
        const position: vec3 = [gx * 0.2 + SIGN_OFFSET_X, gy * 0.2, 0];
        const mesh = meshesPieces[ch] ? meshesPieces[ch] : meshesPieces["default"];
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
            randomInt: Math.floor(Math.random() * 4),
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
        //p.velocity[1] = 5 + Math.random() * 0.5;
        p.velocity[1] = 3 + Math.random() * 2.5;
        p.velocity[2] = (Math.random() - 0.5) * 5 - 1; // Bias towards back

        //FIXME: Why is this needed if the floor check is done after the integration?
        p.position[1] = Math.max(p.position[1] + 0.1, 0);

        p.eulerVelocity[0] = (Math.random() - 0.5) * 3000;
        p.eulerVelocity[1] = (Math.random() - 0.5) * 3000;
        p.eulerVelocity[2] = (Math.random() - 0.5) * 3000;
    }
}

function UpdateEntities(world: World, time: number, deltaTime: number) {
    const { pieces, actors, placed } = world;
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

    for (const actor of actors) {
        actor.state.OnUpdate(time, deltaTime);
    }

    if (actors.every(actor => actor.state.CanDance())) {
        world.danceCircleDegs += deltaTime * 10;
    }
}

function RenderScene(ctx: RenderContext, { actors, pieces }: World, time: number) {
    const { gl, canvas, materialDefault, meshTerrain, colorsTerrain } = ctx;

    gl.viewport(0, 0, canvas.width, canvas.height);

    ApplyStencil(ctx);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(materialDefault.program);

    const mtxProjection = mat4.create();
    const mtxView = mat4.create();
    const mtxModel = mat4.create();
    mat4.perspective(mtxProjection, FOV * DEG_TO_RAD, canvas.width / canvas.height, 0.1, 100);

    mat4.identity(mtxView);
    const t = time * 1;
    const m = 0.05;
    mat4.lookAt(mtxView, [Math.cos(t) * m, Math.sin(t) * m + CAMERA_HEIGHT, 3], [0, CAMERA_LOOK_HEIGHT, 0], [0, 1, 0]);

    gl.uniformMatrix4fv(materialDefault.uniform.uProjection, false, mtxProjection);
    gl.uniformMatrix4fv(materialDefault.uniform.uView, false, mtxView);

    const mtxInvView = mat4.create();
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

    gl.useProgram(ctx.materialUnlitTex.program);
    gl.uniformMatrix4fv(ctx.materialUnlitTex.uniform.uProjection, false, mtxProjection);
    gl.uniformMatrix4fv(ctx.materialUnlitTex.uniform.uView, false, mtxView);
    for (const actor of actors) {
        const xf = actor.state.GetTransform(ctx);
        const uvsOffset = actor.state.GetFrame(time) * 32;
        DrawTexturedMesh(gl, xf, ctx.meshQuad, ctx.materialUnlitTex, ctx.texRatAnim, ctx.uvsBasic, uvsOffset);
    }

    gl.useProgram(ctx.materialUnlitTex.program);
    gl.uniformMatrix4fv(ctx.materialUnlitTex.uniform.uProjection, false, mtxProjection);
    gl.uniformMatrix4fv(ctx.materialUnlitTex.uniform.uView, false, mtxView);
    for (const piece of pieces) {
        const uvsOffset = piece.randomInt * 32; // Get a random cheese "tile" to give some variety
        DrawTexturedMesh(gl, piece.transform, piece.mesh, ctx.materialUnlitTex, ctx.texCheese, ctx.uvsBasic, uvsOffset);
    }
}
