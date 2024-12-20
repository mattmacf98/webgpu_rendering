import * as glMatrix from "gl-matrix";
import ObjFileParser from "obj-file-parser";

export class ObjDataExtractor {
    private _vertexPositions: Float32Array;
    private _indices: Uint16Array;
    private _normals: Float32Array;
    constructor(objText: String) {
        const objFileParser = new ObjFileParser(objText);
        const objFile = objFileParser.parse();
        this._vertexPositions = new Float32Array(objFile.models[0].vertices.flatMap(v => [v.x, v.y, v.z]));

        const indices: number[] = [];
        const normals: number[] = Array(this._vertexPositions.length).fill(0);
        for (const face of objFile.models[0].faces) {
        let points = [];
        let facet_indices = [];
        for (const v of face.vertices) {
            const index = v.vertexIndex - 1;
            indices.push(index);

            const vertex = glMatrix.vec3.fromValues(this._vertexPositions[index * 3], this._vertexPositions[index * 3 + 1], this._vertexPositions[index * 3 + 2]);
            points.push(vertex);
            facet_indices.push(index);
        }

        const v1 = glMatrix.vec3.subtract(glMatrix.vec3.create(), points[1], points[0]);
        const v2 = glMatrix.vec3.subtract(glMatrix.vec3.create(), points[2], points[0]);
        const cross = glMatrix.vec3.cross(glMatrix.vec3.create(), v1, v2);
        const normal = glMatrix.vec3.normalize(glMatrix.vec3.create(), cross);

        for (let i  of facet_indices) {
            normals[i*3] += normal[0];
            normals[i*3 + 1] += normal[1];
            normals[i*3 + 2] += normal[2];
        }
        }
        this._normals = new Float32Array(normals);

        this._indices = new Uint16Array(indices);
    }

    public get vertexPositions(): Float32Array {
        return this._vertexPositions;
    }

    public get indices(): Uint16Array {
        return this._indices;
    }

    public get normals(): Float32Array {
        return this._normals;
    }
}