import { ReadonlyVec3, mat4, vec3 } from "gl-matrix";
import { Piece } from "./piece";
import { World } from "./world";
import { drawQuad, drawSprite, mtxInvView, mtxSprite } from ".";
import { DEG_TO_RAD } from "./utils";

const ACTOR_REACH_THRESHOLD = 0.01;
const SPEED = 9;

export class Actor {
    position: vec3;
    // TODO: cuando terminan se ponen a saltar
    // TODO: cuando tenga mas onda, se equivocan en poner uno mal y lo sacan y lo ponen en el lugar correcto
    state: ActorState;

    wiggle = 0;
    transform: mat4;

    world: World;

    constructor(world: World, position: ReadonlyVec3) {
        this.world = world;
        this.position = vec3.clone(position);
        this.state = new IdleState(this);
        this.transform = mat4.create();
        this.wiggle = 0;
    }

    ChangeState(newState: ActorState) {
        this.state.OnExit();
        this.state = newState;
    }

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
    abstract OnUpdate(time: number, deltaTime: number): void;
    OnExit(): void { }

    OnDraw(gl: WebGLRenderingContext): void {
        //FIXME: Coupled to drawSprite
        const xf = this._actor.transform;
        mat4.identity(xf);
        mat4.translate(xf, xf, this._actor.position);
        mat4.multiply(xf, xf, mtxSprite);
        const wiggleAngleRad = this._actor.wiggle * 10 * DEG_TO_RAD;
        //console.log('wiggleangle', this._actor.wiggle, wiggleAngleRad);
        mat4.rotateZ(xf, xf, wiggleAngleRad);
        const h = (1 - Math.abs(this._actor.wiggle)) * 0.25;
        mat4.scale(xf, xf, [1 - h / 2, 1 + h, 1]);
        mat4.scale(xf, xf, [0.1, 0.1, 0.1]);

        //6e7772 51e793
        //drawQuad(gl, xf, [0x41 / 0xff, 0xe7 / 0xff, 0x93 / 0xff, 1]);
        drawQuad(gl, xf, [0, 1, 0, 1]);
        //drawSprite(gl, this._actor.position, [0, 255, 0, 255], 'actor');
    }

    // External Transitions
    Collect(piece: Piece) { return false; }
    Release() { return false; }
    //TODO: Dance()
}

class IdleState extends ActorState {

    override OnUpdate(time: number, deltaTime: number) {
        //TODO: wiggle
        this._actor.wiggle = Math.sin(time * 5);
    }

    override OnExit() {
        this._actor.wiggle = 0;
    }

    override Collect(piece: Piece) {
        this._actor.ChangeState(new CollectState(this._actor, piece));
        return true;
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
        if (result === 'reached') {
            this._actor.ChangeState(new PlaceState(this._actor, this._piece));
            vec3.zero(this._piece.velocity);
            vec3.zero(this._piece.eulerVelocity);
            vec3.zero(this._piece.eulerAngles);
        }
    }

    Release() {
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
        //TODO: if not on ground, wait for it to fall
        const result = this._actor.MoveTowards(this._piece.targetPosition, deltaTime);
        vec3.copy(this._piece.position, this._actor.position);
        this._piece.position[1] += 0.2;
        if (result === 'reached') {
            this._actor.world.PlacePiece(this._piece);
            this._actor.world.assigned.delete(this._piece.uid);
            this._actor.ChangeState(new ClimbDownState(this._actor));
        }
    }

    Release() {
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
        const a = Math.random() * Math.PI; // Only 180° (front)
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