import { ReadonlyMat4, ReadonlyVec3, mat4, vec3 } from "gl-matrix";
import { Piece, PlacePiece } from "./piece";
import { DEG_TO_RAD } from "../utils-math";
import { RenderContext } from "../render/context";
import { Actor, SetDanceCircleLocation } from "./actor";

const SCARE_TTL_BASE = 0.15;
const SCARE_JUMP_HEIGHT = 0.5;

export abstract class ActorState {
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

    GetTransform(ctx: RenderContext): ReadonlyMat4 {
        const wiggleAngleRad = this._actor.wiggle * 10 * DEG_TO_RAD;
        const t = 1 - Math.abs(this._actor.wiggle);
        const h = t * 0.25;

        const xf = this._actor.transform;
        mat4.identity(xf);
        mat4.translate(xf, xf, this._actor.position);
        if (this.CanDance()) mat4.translate(xf, xf, [0, t * 0.1, 0]); // Dancing little jump
        mat4.multiply(xf, xf, ctx.mtxSpriteFaceCamera);
        mat4.rotateZ(xf, xf, wiggleAngleRad);
        mat4.scale(xf, xf, [1 - h / 2, 1 + h, 1]); // Wiggle stretch
        mat4.scale(xf, xf, [0.33, 0.33, 0.33]);

        let xFlip = this._actor.facingX < 0;
        if (this._actor.wiggle < 0) xFlip = !xFlip;
        if (xFlip) mat4.scale(xf, xf, [-1, 1, 1]);

        return xf;
    }

    //
    // Externally fed transitions
    //

    // Returns true if the collect assignment was accepted
    Collect(_piece: Piece) {
        return false;
    }

    Dance() { }

    CanDance() {
        return false;
    }

    Scare() {
        this._actor.ChangeState(new ScareState(this._actor));
    }
}

class IdleState extends ActorState {
    override OnUpdate(time: number, deltaTime: number) { }

    override Collect(piece: Piece) {
        this._actor.ChangeState(new CollectState(this._actor, piece));
        return true;
    }

    override Dance() {
        this._actor.ChangeState(new DanceState(this._actor));
        return true;
    }

    CanDance() {
        return true;
    }
}

export class InitialState extends IdleState {
    override Scare() {
        this._actor.ChangeState(new ScareState(this._actor));
        return true;
    }
    GetFrame(_time: number) {
        return 2;
    }
    CanDance() {
        return false;
    }
}

class DanceState extends ActorState {
    override OnUpdate(time: number, deltaTime: number) {
        this._actor.wiggle = Math.sin(time * 10);
        SetDanceCircleLocation(this._actor.position, this._actor);
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

    override CanDance() {
        return true;
    }

    override GetFrame(_time: number) {
        return 4;
    }
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
        if (result === "reached") {
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
        if (result === "reached") {
            PlacePiece(this._actor.world, this._piece);
            this._actor.world.assigned.delete(this._piece.uid);
            this._actor.ChangeState(
                new ClimbDownState(this._actor, SetDanceCircleLocation(vec3.create(), this._actor))
            );
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
        // Wait for it to reach the ground before collecting again (to avoid "flying" towards next objective)
        if (this._actor.position[1] > this._target[1] - 1) {
            return false;
        }

        this._actor.ChangeState(new CollectState(this._actor, piece));
        return true;
    }

    OnUpdate(time: number, deltaTime: number) {
        const result = this._actor.MoveTowards(this._target, deltaTime);
        if (result === "reached") {
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
        const tNorm = Math.min(this._timeSinceStart / this._ttl, 1);
        if (tNorm >= 1) {
            vec3.copy(this._actor.position, this._startPosition);
            this._actor.ChangeState(new ClimbDownState(this._actor));
        } else {
            // Jolt faster than falling
            //   /'-._
            //  /     '-._
            // /          '-.
            const h = tNorm < 0.2 ? tNorm / 0.2 : 1 - (tNorm - 0.2) / 0.8;
            vec3.add(this._actor.position, this._startPosition, [0, h * SCARE_JUMP_HEIGHT, 0]);
            this._timeSinceStart += deltaTime;
        }
    }

    override GetFrame(_time: number) {
        return 5;
    }
}
