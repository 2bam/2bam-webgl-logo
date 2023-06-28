
let _buffer: ReturnType<typeof CreateStencilVertexBuffer>;

const STENCIL_REFVAL = 1;
const STENCIL_MASK = 1;
const STENCIL_CIRCLE_LOD = 50;

export function CreateStencilVertexBuffer(gl: WebGLRenderingContext) {
    const array = [
        0, 0, 0,
    ];
    for (let i = 0; i <= STENCIL_CIRCLE_LOD; i++) {
        const r = i * Math.PI * 2 / STENCIL_CIRCLE_LOD;
        array.push(Math.cos(r), Math.sin(r), 0);
    }
    const vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);

    return { vertices, vertexCount: array.length / 3 };
}

export function GetStencilBuffer(gl: WebGLRenderingContext) {
    if (!_buffer) _buffer = CreateStencilVertexBuffer(gl);
    return _buffer;
}


export function DrawStencil(gl: WebGLRenderingContext) {
    if (!_buffer) _buffer = CreateStencilVertexBuffer(gl);
    const { vertices, vertexCount } = _buffer;

    // { //TODO: try and remove this
    //     gl.enable(gl.STENCIL_TEST);
    //     gl.stencilFunc(gl.ALWAYS, STENCIL_REFVAL, STENCIL_MASK);
    // }

    // Write to the stencil regardless of stencil and depth buffers.
    // But don't write to depth or color.
    gl.stencilOp(gl.REPLACE, gl.REPLACE, gl.REPLACE);
    gl.depthMask(false);
    gl.colorMask(false, false, false, false);

    // Clean draw the stencil
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexCount);

    // Revert mode and don't modify the stencil buffer anymore
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    gl.depthMask(true);
    gl.colorMask(true, true, true, true);

    // Finally enable stencil testing for further operations
    gl.enable(gl.STENCIL_TEST);
    gl.stencilFunc(gl.EQUAL, STENCIL_REFVAL, STENCIL_MASK);

}