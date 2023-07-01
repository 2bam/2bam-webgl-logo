import { ReadonlyMat4, ReadonlyVec4, mat4 } from "gl-matrix";
import { Mesh } from "./mesh";
import { RenderContext } from "./context";
import { Material } from "./material";

const MTX_IDENTITY: ReadonlyMat4 = mat4.create();

export function DrawQuad({ gl, meshQuad }: RenderContext, transform: ReadonlyMat4, color: ReadonlyVec4, material: Material<'aVertexPosition' | 'aVertexColor', 'uModel'>) {
    const { attrib: { aVertexPosition, aVertexColor }, uniform: { uModel } } = material;

    gl.uniformMatrix4fv(uModel, false, transform);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshQuad.vertices);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshQuad.indices);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    gl.disableVertexAttribArray(aVertexColor);
    gl.vertexAttrib4f(aVertexColor, color[0], color[1], color[2], color[3]);

    gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0);

}

export function DrawMesh(gl: WebGLRenderingContext, transform: ReadonlyMat4, mesh: Mesh, material: Material<'aVertexPosition' | 'aVertexColor', 'uModel'>, tex?: WebGLTexture) {
    const { attrib: { aVertexPosition, aVertexColor }, uniform: { uModel } } = material;

    gl.uniformMatrix4fv(uModel, false, transform);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices);
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);

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

export function DrawTerrain(gl: WebGLRenderingContext, meshTerrain: Mesh, colorsTerrain: WebGLBuffer, material: Material<'aVertexPosition' | 'aVertexColor', 'uModel'>) {
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

    // Also draw a gray wireframe on top of the terrain mesh
    gl.disableVertexAttribArray(aVertexColor);
    gl.vertexAttrib4f(aVertexColor, .13, .13, .13, 1);
    gl.drawElements(gl.LINES, meshTerrain.indexCount, gl.UNSIGNED_SHORT, 0);
}

