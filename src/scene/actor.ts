import { ReadonlyMat4, ReadonlyVec3, mat4, vec3 } from "gl-matrix";
import { Piece, PlacePiece } from "./piece";
import { World } from "./world";
import { DEG_TO_RAD } from "../utils-math";
import { RenderContext } from "../render/context";
import { ActorState, InitialState } from "./actor-states";

// OOP State pattern (FSM) to manage actor behaviors

const ACTOR_REACH_THRESHOLD = 0.01;
const SPEED = 9;
const CIRCLE_RADIUS_X = 3.25;
const CIRCLE_RADIUS_Z = 1.05;

export class Actor {
    position: vec3;
    facingX: number;
    state: ActorState;

    wiggle: number;
    transform: mat4;

    world: World;
    index: number;

    constructor(world: World, index: number) {
        this.world = world;
        this.position = vec3.create();
        this.state = new InitialState(this);
        this.transform = mat4.create();
        this.wiggle = 0;
        this.facingX = Math.random() < 0.5 ? -1 : 1;
        this.index = index;
    }

    ChangeState(newState: ActorState) {
        this.state.OnExit();
        this.state = newState;
    }

    // TODO: This should be split in two funcs and two states (Climb/Walk) restoring original state (kept as ref) upon reach
    MoveTowards(to: ReadonlyVec3, deltaTime: number) {
        // In this method we assume wherever the character may need to go, if higher than the ground, then it must be at
        // the sign placement. As such we avoid needing to detect proximity to the sign, just reach first the base at
        // ground level and then climb up. Afterwards, if not at ground level, climb down before moving anywhere else.
        const from = this.position;

        const delta = vec3.create();
        vec3.subtract(delta, to, from);

        const deltaXZ = vec3.create();
        vec3.copy(deltaXZ, delta);
        deltaXZ[1] = 0;

        const deltaY = vec3.create();
        vec3.copy(deltaY, delta);
        deltaY[0] = 0;
        deltaY[2] = 0;

        const move = vec3.create();

        const direction = vec3.create();
        if (vec3.sqrLen(delta) < ACTOR_REACH_THRESHOLD * ACTOR_REACH_THRESHOLD) {
            return "reached";
        } else if (to[1] < from[1]) {
            // If higher than ground climb down
            vec3.copy(move, deltaY);
        } else if (vec3.sqrLen(deltaXZ) < ACTOR_REACH_THRESHOLD * ACTOR_REACH_THRESHOLD) {
            // If at the base of target, climb up
            vec3.copy(move, deltaY);
        } else {
            // If at not at the base, walk in xz plane
            // TODO: lerp heightmap to follow ground
            vec3.copy(move, deltaXZ);
        }
        vec3.normalize(direction, move);
        vec3.scaleAndAdd(this.position, this.position, direction, Math.min(SPEED * deltaTime, vec3.len(move)));

        if (direction[0] < 0) this.facingX = -1;
        else if (direction[0] > 0) this.facingX = 1;

        return "moving";
    }
}

export function SetDanceCircleLocation(out: vec3, { world, index }: Readonly<Actor>) {
    const step = 360 / world.actors.length;
    const rads = DEG_TO_RAD * (world.danceCircleDegs + index * step);

    vec3.set(out, Math.cos(rads) * CIRCLE_RADIUS_X, 0, Math.sin(rads) * CIRCLE_RADIUS_Z);
    return out;
}

export function SetRandomFrontLocation(out: vec3): vec3 {
    const d = CIRCLE_RADIUS_Z + Math.random() * 0.3;
    const a = (20 + 140 * Math.random()) * DEG_TO_RAD; // Only on front
    return vec3.set(out, Math.cos(a) * d, 0, Math.sin(a) * d);
}
