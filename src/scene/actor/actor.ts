import { ReadonlyMat4, ReadonlyVec3, mat4, vec3 } from "gl-matrix";
import { Piece } from "../piece";
import { World } from "../world";
import { DEG_TO_RAD } from "../../render/utils-render";
import { Context } from "../../render/context";

const ACTOR_REACH_THRESHOLD = 0.01;
const SPEED = 9;
const SCARE_TTL_BASE = 0.15;
const SCARE_JUMP_HEIGHT = 0.5;

export function RandomFrontLocation(): vec3 {
    const d = 1 + Math.random() * 2;
    const a = (20 + 140 * Math.random()) * DEG_TO_RAD; // Only on front
    return [Math.cos(a) * d, 0, Math.sin(a) * d];
}

export class Actor {
    position: vec3;
    facingX: number;
    state: ActorState;

    wiggle = 0;
    transform: mat4;

    world: World;

    constructor(world: World, position: ReadonlyVec3) {
        this.world = world;
        this.position = vec3.clone(position);
        this.state = new InitialState(this);
        this.transform = mat4.create();
        this.wiggle = 0;
        this.facingX = Math.random() < 0.5 ? -1 : 1;
    }

    ChangeState(newState: ActorState) {
        this.state.OnExit();
        this.state = newState;
    }

    // FIXME: This should be split in two funcs and two states (Climb/Walk) restoring original state (kept as ref) upon reach
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
            return 'reached';
        }
        else if (to[1] < from[1]) {
            // If higher than ground climb down
            vec3.copy(move, deltaY);
        }
        else if (vec3.sqrLen(deltaXZ) < ACTOR_REACH_THRESHOLD * ACTOR_REACH_THRESHOLD) {
            // If at the base of target, climb up
            vec3.copy(move, deltaY);
        }
        else {
            // If at not at the base, walk in xz plane
            // TODO: lerp heightmap to follow ground
            vec3.copy(move, deltaXZ);
        }
        vec3.normalize(direction, move);
        vec3.scaleAndAdd(this.position, this.position, direction, Math.min(SPEED * deltaTime, vec3.len(move)));

        if (direction[0] < 0) this.facingX = -1;
        else if (direction[0] > 0) this.facingX = 1;

        return 'moving';
    }
}


abstract class ActorState {
    protected _actor;

    constructor(actor: Actor) {
        this._actor = actor;
    }

    //
    // State specific
    //

    abstract OnUpdate(time: number, deltaTime: number): void;
    OnExit(): void { }

    GetFrame(time: number): number {
        return Math.floor(((time * 4) % 1) * 4);
    }

    GetTransform(ctx: Context): ReadonlyMat4 {
        const wiggleAngleRad = this._actor.wiggle * 10 * DEG_TO_RAD;
        const t = (1 - Math.abs(this._actor.wiggle));
        const h = t * 0.25;

        const xf = this._actor.transform;
        mat4.identity(xf);
        mat4.translate(xf, xf, this._actor.position);
        if (this.CanDance())
            mat4.translate(xf, xf, [0, t * 0.1, 0]);
        mat4.multiply(xf, xf, ctx.mtxSpriteFaceCamera);
        mat4.rotateZ(xf, xf, wiggleAngleRad);
        mat4.scale(xf, xf, [1 - h / 2, 1 + h, 1]); // Stretch
        //mat4.scale(xf, xf, [0.1, 0.1, 0.1]);
        //mat4.scale(xf, xf, [0.25, 0.25, 0.25]); //!!!
        mat4.scale(xf, xf, [0.33, 0.33, 0.33]);

        let xFlip = this._actor.facingX < 0;
        if (this._actor.wiggle < 0) xFlip = !xFlip;
        if (xFlip) mat4.scale(xf, xf, [-1, 1, 1]);

        return xf;

        // //FIXME: Coupled to DrawQuad in index.ts
        // DrawActorQuadTEMP(ctx, xf, [0, 1, 0, 1]);
    }

    //
    // Externally fed transitions
    //

    // Returns true if the collect assignment was accepted
    Collect(_piece: Piece) { return false; }
    Dance() { }
    CanDance() { return false; }
    Scare() {
        this._actor.ChangeState(new ScareState(this._actor));
    }
}

class IdleState extends ActorState {
    override OnUpdate(time: number, deltaTime: number) {
    }

    override Collect(piece: Piece) {
        this._actor.ChangeState(new CollectState(this._actor, piece));
        return true;
    }

    override Dance() {
        this._actor.ChangeState(new DanceState(this._actor));
        return true;
    }

    CanDance() { return true; }
}

class InitialState extends IdleState {
    CanDance() { return false; }
    override Scare() {
        this._actor.ChangeState(new ScareState(this._actor));
        return true;
    }
    GetFrame(_time: number) { return 2; }
}

class DanceState extends ActorState {
    override OnUpdate(time: number, deltaTime: number) {
        this._actor.wiggle = Math.sin(time * 10);
    }

    override OnExit() {
        this._actor.wiggle = 0;
    }

    override Collect(piece: Piece) {
        this._actor.ChangeState(new CollectState(this._actor, piece));
        return true;
    }

    override Scare() {
        this._actor.ChangeState(new ScareState(this._actor));
        return true;
    }

    override CanDance() { return true; }

    override GetFrame(_time: number) { return 4; }
}


class CollectState extends ActorState {
    _piece: Piece;

    constructor(actor: Actor, piece: Piece) {
        super(actor);
        this._piece = piece;
        this._actor.world.assigned.add(this._piece.uid);
    }


    override OnUpdate(time: number, deltaTime: number) {
        //TODO: if not on ground, wait for it to fall
        const result = this._actor.MoveTowards(this._piece.position, deltaTime);
        if (result === 'reached') {
            this._actor.ChangeState(new PlaceState(this._actor, this._piece));
            vec3.zero(this._piece.velocity);
            vec3.zero(this._piece.eulerVelocity);
            vec3.zero(this._piece.eulerAngles);
        }
    }

    override Scare() {
        this._actor.world.assigned.delete(this._piece.uid);
        super.Scare();
    }
}

class PlaceState extends ActorState {
    _piece: Piece;

    constructor(actor: Actor, piece: Piece) {
        super(actor);
        this._piece = piece;
    }

    OnUpdate(time: number, deltaTime: number) {
        const result = this._actor.MoveTowards(this._piece.targetPosition, deltaTime);
        vec3.copy(this._piece.position, this._actor.position);
        this._piece.position[1] += 0.2; // Keep it over our heads
        if (result === 'reached') {
            this._actor.world.PlacePiece(this._piece);
            this._actor.world.assigned.delete(this._piece.uid);
            this._actor.ChangeState(new ClimbDownState(this._actor, RandomFrontLocation()));
        }
    }

    override Scare() {
        this._actor.world.assigned.delete(this._piece.uid);
        super.Scare();
    }
}

class ClimbDownState extends ActorState {
    _target: ReadonlyVec3;

    constructor(actor: Actor, locationAfter?: ReadonlyVec3) {
        super(actor);
        this._target = locationAfter ?? vec3.fromValues(actor.position[0], 0, actor.position[2]);
    }

    override Collect(piece: Piece) {
        // Wait for it to reach the ground before collecting again (to avoid "flying")
        if (this._actor.position[1] > this._target[1] - 1) { return false; }

        this._actor.ChangeState(new CollectState(this._actor, piece));
        return true;
    }

    OnUpdate(time: number, deltaTime: number) {
        const result = this._actor.MoveTowards(this._target, deltaTime);
        if (result === 'reached') {
            this._actor.ChangeState(new IdleState(this._actor));
        }
    }
}

class ScareState extends ActorState {
    _timeSinceStart = 0;
    _startPosition: ReadonlyVec3;
    _ttl;

    constructor(actor: Actor) {
        super(actor);
        this._startPosition = vec3.clone(actor.position);
        // Give them different durations so they slightly jump out of sync
        this._ttl = SCARE_TTL_BASE * (1 + Math.random() * 0.75);
    }

    OnUpdate(time: number, deltaTime: number) {
        const t = Math.min(this._timeSinceStart / this._ttl, 1);
        if (t >= 1) {
            vec3.copy(this._actor.position, this._startPosition);
            this._actor.ChangeState(new ClimbDownState(this._actor));
        }
        else {
            //const h = 1 - Math.abs(t * 2 - 1);
            const h = t < 0.2 ? (t / 0.2) : (1 - (t - 0.2) / 0.8);
            vec3.add(this._actor.position, this._startPosition, [0, h * SCARE_JUMP_HEIGHT, 0]);
            this._timeSinceStart += deltaTime;
        }
    }

    override GetFrame(_time: number) { return 5; }

}