import { ReadonlyVec3, mat4, vec3 } from "gl-matrix";
import { Piece } from "./piece";
import { World } from "./world";
import { DrawQuad, DrawSprite, mtxInvView, mtxSprite } from ".";
import { DEG_TO_RAD } from "./utils";

const ACTOR_REACH_THRESHOLD = 0.01;
const SPEED = 9;

export class Actor {
    position: vec3;
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
    }

    ChangeState(newState: ActorState) {
        this.state.OnExit();
        this.state = newState;
    }

    // FIXME: This should be split in two funcs and two states (Climb/Walk) restoring original state (kept as ref) upon reach
    MoveTowards(to: vec3, deltaTime: number) {
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
        const dir = vec3.create();
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
        vec3.normalize(dir, move);
        vec3.scaleAndAdd(this.position, this.position, dir, Math.min(SPEED * deltaTime, vec3.len(move)));
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

    OnDraw(gl: WebGLRenderingContext): void {
        const wiggleAngleRad = this._actor.wiggle * 10 * DEG_TO_RAD;
        const t = (1 - Math.abs(this._actor.wiggle));
        const h = t * 0.25;

        const xf = this._actor.transform;
        mat4.identity(xf);
        mat4.translate(xf, xf, this._actor.position);
        if (this.CanDance())
            mat4.translate(xf, xf, [0, t * 0.1, 0]);
        mat4.multiply(xf, xf, mtxSprite);
        mat4.rotateZ(xf, xf, wiggleAngleRad);
        mat4.scale(xf, xf, [1 - h / 2, 1 + h, 1]); // Stretch
        mat4.scale(xf, xf, [0.1, 0.1, 0.1]);

        //FIXME: Coupled to DrawQuad in index.ts
        DrawQuad(gl, xf, [0, 1, 0, 1]);
    }

    //
    // Externally fed transitions
    //

    // Returns true if the collect assignment was accepted
    Collect(piece: Piece) { return false; }
    Stop() { }
    Dance() { }
    CanDance() { return false; }
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
}

class DanceState extends ActorState {
    override OnUpdate(time: number, deltaTime: number) {
        this._actor.wiggle = Math.sin(time * 5);
    }

    override OnExit() {
        this._actor.wiggle = 0;
    }

    override Collect(piece: Piece) {
        this._actor.ChangeState(new CollectState(this._actor, piece));
        return true;
    }

    override Stop() {
        this._actor.ChangeState(new IdleState(this._actor));
        return true;
    }

    CanDance() { return true; }
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

    Stop() {
        this._actor.world.assigned.delete(this._piece.uid);
        this._actor.ChangeState(new ClimbDownState(this._actor));
        return true;
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
            this._actor.ChangeState(new ClimbDownState(this._actor));
        }
    }

    Stop() {
        this._actor.world.assigned.delete(this._piece.uid);
        this._actor.ChangeState(new ClimbDownState(this._actor));
        return true;
    }

}

class ClimbDownState extends ActorState {
    _target: vec3;

    constructor(actor: Actor) {
        super(actor);
        const d = 1 + Math.random() * 2;
        const a = (20 + 140 * Math.random()) * DEG_TO_RAD; // Only on front
        this._target = [Math.cos(a) * d, 0, Math.sin(a) * d];
    }

    override Collect(piece: Piece) {
        // Wait for it to reach the ground
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