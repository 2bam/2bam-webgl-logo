import { vec3 } from "gl-matrix";


export interface Piece {
    uid: number;
    position: vec3;
    targetPosition: vec3;
    velocity: vec3;
    //TODO: rotation
    needs: number[];
}