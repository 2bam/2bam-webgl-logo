import { ReadonlyVec3, vec3 } from "gl-matrix";
import { Piece } from "./piece";
import { World } from "./world";
import { drawSprite } from ".";

const ACTOR_REACH_THRESHOLD = 0.01;
const SPEED = 9;

export class Actor {
    position: vec3;
    // TODO: cuando terminan se ponen a saltar
    // TODO: cuando tenga mas onda, se equivocan en poner uno mal y lo sacan y lo ponen en el lugar correcto
    state: ActorState;

    world: World;

    constructor(world: World, position: ReadonlyVec3) {
        this.world = world;
        this.position = vec3.clone(position);
        this.state = new IdleState(this);
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
    abstract OnUpdate(deltaTime: number): void;

    OnDraw(gl: WebGLRenderingContext): void {
        //FIXME: Coupled to drawSprite
        drawSprite(gl, this._actor.position, [0, 255, 0, 255], 'actor');
    }

    // External Transitions
    Collect(piece: Piece) { return false; }
    Release() { return false; }
    //TODO: Dance()
}

class IdleState extends ActorState {

    override OnUpdate() {
        //TODO: wiggle
    }

    override Collect(piece: Piece) {
        this._actor.state = new CollectState(this._actor, piece);
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

    OnUpdate(deltaTime: number) {
        //TODO: if not on ground, wait for it to fall
        const result = this._actor.MoveTowards(this._piece.position, deltaTime);
        if (result === 'reached') {
            this._actor.state = new PlaceState(this._actor, this._piece);
        }
    }

    Release() {
        this._actor.world.assigned.delete(this._piece.uid);
        this._actor.state = new ClimbDownState(this._actor);
        return true;
    }
}

class PlaceState extends ActorState {
    _piece: Piece;

    constructor(actor: Actor, piece: Piece) {
        super(actor);
        this._piece = piece;
    }

    OnUpdate(deltaTime: number) {
        //TODO: if not on ground, wait for it to fall
        const result = this._actor.MoveTowards(this._piece.targetPosition, deltaTime);
        vec3.copy(this._piece.position, this._actor.position);
        this._piece.position[1] += 0.2;
        if (result === 'reached') {
            this._actor.world.PlacePiece(this._piece);
            this._actor.world.assigned.delete(this._piece.uid);
            this._actor.state = new ClimbDownState(this._actor);
        }
    }

    Release() {
        this._actor.world.assigned.delete(this._piece.uid);
        this._actor.state = new ClimbDownState(this._actor);
        return true;
    }

}

class ClimbDownState extends ActorState {
    _target: vec3;
    constructor(actor: Actor) {
        super(actor);
        const d = 1 + Math.random() * 2;
        const a = Math.random() * Math.PI * 2;
        this._target = [Math.cos(a) * d, 0, Math.sin(a) * d];
    }

    override Collect(piece: Piece) {
        // Wait for it to reach the ground
        if (this._actor.position[1] > this._target[1] - 1) { return false; }

        this._actor.state = new CollectState(this._actor, piece);
        return true;
    }

    OnUpdate(deltaTime: number) {
        const result = this._actor.MoveTowards(this._target, deltaTime);
        if (result === 'reached') {
            this._actor.state = new IdleState(this._actor);
        }
    }
}