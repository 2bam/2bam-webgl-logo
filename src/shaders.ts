
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


export const SHADER_VERTEX_STENCIL = `
    attribute vec3 aVertexPosition;
    void main() {
        gl_Position = vec4(aVertexPosition,1);
    }
`;

export const SHADER_FRAGMENT_STENCIL = `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1,1,1,1);
    }
`;


export const SHADER_VERTEX_TEXTURE = `
    attribute vec3 aVertexPosition;
    attribute vec4 aVertexColor;
    attribute vec2 aTexCoord;
    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProjection;
    varying vec4 vColor;
    varying vec2 vTexCoord;
    void main() {
        gl_Position = uProjection * uView * uModel * vec4(aVertexPosition,1);
        vColor = aVertexColor;
        vTexCoord = aTexCoord;
    }
`;

export const SHADER_FRAGMENT_TEXTURE = `
    precision mediump float;
    varying vec4 vColor;
    varying vec2 vTexCoord;
    uniform sampler2D uTexture;
    void main() {
        vec4 asd = vColor * texture2D(uTexture, vTexCoord);
        if(asd.a < 0.05) discard;
        gl_FragColor = asd;
    }
`;