import { LoadMaterial, LoadTexture } from './utils';
import { SHADER_FRAGMENT_DEFAULT, SHADER_FRAGMENT_STENCIL, SHADER_FRAGMENT_TEXTURE, SHADER_VERTEX_DEFAULT, SHADER_VERTEX_STENCIL, SHADER_VERTEX_TEXTURE } from './shaders';
import { CreateMesh } from './mesh';
import { CreateMeshesForPieces } from './piece';
import { CreateTerrain } from './terrain';
import { mat4 } from "gl-matrix";
import ImgRatAnim from '../assets/rat.png';
import ImgCheese from '../assets/cheese.png';

// Contains several GL related elements necessary for rendering.

export async function CreateContext(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { stencil: true, alpha: true });
    if (!gl) throw new Error("Error getting webgl context");


    const uvsBasic = gl.createBuffer();
    if (!uvsBasic) throw new Error('Error creating buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, uvsBasic);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);


    return {
        canvas,
        gl,

        materialDefault: LoadMaterial(
            gl,
            SHADER_VERTEX_DEFAULT,
            SHADER_FRAGMENT_DEFAULT,
            ["aVertexPosition", "aVertexColor"],
            ["uProjection", "uView", "uModel"]
        ),

        materialStencil: LoadMaterial(
            gl,
            SHADER_VERTEX_STENCIL,
            SHADER_FRAGMENT_STENCIL,
            ["aVertexPosition"],
            []
        ),

        materialUnlitTex: LoadMaterial(
            gl,
            SHADER_VERTEX_TEXTURE,
            SHADER_FRAGMENT_TEXTURE,
            ["aVertexPosition", "aVertexColor", "aTexCoord"],
            ["uProjection", "uView", "uModel", "uTexture"]
        ),

        // const defaultProgram = LoadProgram(gl, SHADER_VERTEX_DEFAULT, SHADER_FRAGMENT_DEFAULT);
        // const aVertexPosition = gl.getAttribLocation(defaultProgram, 'aVertexPosition');
        // const aVertexColor = gl.getAttribLocation(defaultProgram, 'aVertexColor');
        // const uProjection = gl.getUniformLocation(defaultProgram, 'uProjection');
        // const uView = gl.getUniformLocation(defaultProgram, 'uView');
        // const uModel = gl.getUniformLocation(defaultProgram, 'uModel');
        //
        // const matRat = LoadMaterial(gl, SHADER_VERTEX_TEXTURE, SHADER_FRAGMENT_TEXTURE, ["aVertexPosition", "aVertexColor", "aTexCoord"], ["uProjection", "uView", "uModel", "uTexture"]);


        meshQuad: CreateMesh(
            gl,
            [
                [-1, -1, 0],
                [1, -1, 0],
                [-1, 1, 0],
                [1, 1, 0],
            ],
            [0, 1, 2, 3]
        ),

        meshesPieces: CreateMeshesForPieces(gl),

/*{ meshTerrain, colorsTerrain } =*/ ...CreateTerrain(gl),

        // Special transform updated each frame to make sprites face the camera
        mtxSpriteFaceCamera: mat4.create(),

        texRatAnim: await LoadTexture(gl, ImgRatAnim),
        texCheese: await LoadTexture(gl, ImgCheese),

        uvsBasic,
    };
};

export type Context = Awaited<ReturnType<typeof CreateContext>>;
