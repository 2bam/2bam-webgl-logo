
export const SHADER_VERTEX_DEFAULT = `
    attribute vec3 aVertexPosition;
    attribute vec4 aVertexColor;
    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProjection;
    varying vec4 vColor;
    void main() {
        gl_Position = uProjection * uView * uModel * vec4(aVertexPosition,1);
        vColor = aVertexColor;
    }
`;

export const SHADER_FRAGMENT_DEFAULT = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
        gl_FragColor = vColor;
    }
`;