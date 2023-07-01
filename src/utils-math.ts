import { vec3 } from "gl-matrix";

export const DEG_TO_RAD = Math.PI / 180;

export function RandomFrontLocation(): vec3 {
    const d = 1 + Math.random() * 2;
    const a = (20 + 140 * Math.random()) * DEG_TO_RAD; // Only on front
    return [Math.cos(a) * d, 0, Math.sin(a) * d];
}
