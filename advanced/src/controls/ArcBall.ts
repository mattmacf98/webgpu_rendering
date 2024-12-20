import * as glMatrix from "gl-matrix";

export class Arcball {
    private _radius: number;
    private _forward: glMatrix.vec4;
    private _up: glMatrix.vec4;
    private _currentRotation: glMatrix.mat4;
  
    constructor(radius: number) {
      this._radius = radius;
      this._forward = glMatrix.vec4.fromValues(this._radius, 0, 0, 0);
      this._up = glMatrix.vec4.fromValues(0, 0, 1, 0);
      this._currentRotation = glMatrix.mat4.create();
    }
  
    get forward() {
      return this._forward;
    }
  
    public yawPith(originalX: number, originalY: number, newX: number, newY: number): void {
      const originalPoint = glMatrix.vec3.fromValues(1.0, originalX, originalY);
      const newPoint = glMatrix.vec3.fromValues(1.0, newX, newY);
  
      let rotationAxisVec3 = glMatrix.vec3.cross(glMatrix.vec3.create(), originalPoint, newPoint);
      let rotationAxisVec4 = glMatrix.vec4.fromValues(rotationAxisVec3[0], rotationAxisVec3[1], rotationAxisVec3[2], 0.0);
      rotationAxisVec4 = glMatrix.vec4.transformMat4(glMatrix.vec4.create(), rotationAxisVec4, this._currentRotation);
      rotationAxisVec3 = glMatrix.vec3.normalize(glMatrix.vec3.create(), [rotationAxisVec4[0], rotationAxisVec4[1], rotationAxisVec4[2]]);
  
      const sin = glMatrix.vec3.length(rotationAxisVec3) / (glMatrix.vec3.length(originalPoint) * glMatrix.vec3.length(newPoint));
      const rotationMatrix = glMatrix.mat4.fromRotation(glMatrix.mat4.create(), Math.asin(sin) * -0.03, rotationAxisVec3);
  
      if (rotationMatrix !== null) {
        this._currentRotation = glMatrix.mat4.multiply(glMatrix.mat4.create(), rotationMatrix, this._currentRotation);
        this._forward = glMatrix.vec4.transformMat4(glMatrix.vec4.create(), this._forward, rotationMatrix);
        this._up = glMatrix.vec4.transformMat4(glMatrix.vec4.create(), this._up, rotationMatrix);
      }
    }
  
    public roll(originalX: number, originalY: number, newX: number, newY: number): void {
      const originalVec = glMatrix.vec3.fromValues(originalX, originalY, 0.0);
      const newVec = glMatrix.vec3.fromValues(newX, newY, 0.0);
      const crossProd = glMatrix.vec3.cross(glMatrix.vec3.create(), originalVec, newVec);
  
      const cos = glMatrix.vec3.dot(glMatrix.vec3.normalize(glMatrix.vec3.create(), originalVec), glMatrix.vec3.normalize(glMatrix.vec3.create(), newVec));
  
      const rad = Math.acos(Math.min(cos, 1.0)) * Math.sign(crossProd[2]);
  
      const rotationMatrix = glMatrix.mat4.fromRotation(glMatrix.mat4.create(), -rad, glMatrix.vec3.fromValues(this._forward[0], this._forward[1], this._forward[2]));
  
      this._currentRotation = glMatrix.mat4.multiply(glMatrix.mat4.create(), rotationMatrix, this._currentRotation);
      this._up = glMatrix.vec4.transformMat4(glMatrix.vec4.create(), this._up, this._currentRotation);
    }
  
    public getMatrices() {
      const modelViewMatrix = glMatrix.mat4.lookAt(glMatrix.mat4.create(), 
      glMatrix.vec3.fromValues(this._forward[0], this._forward[1], this._forward[2]), 
      glMatrix.vec3.fromValues(0, 0, 0), 
      glMatrix.vec3.fromValues(this._up[0], this._up[1], this._up[2]));
      
      return modelViewMatrix;
    }
  }