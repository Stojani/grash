import * as THREE from 'three';

class Node {
  static DEFAULT_COLOR = 'Blue';
  static DEFAULT_GEOMETRY = new THREE.SphereGeometry(0.1, 32, 32);

  constructor(id, x = 0, y = 0, z = 0, color = Node.DEFAULT_COLOR, geometry = Node.DEFAULT_GEOMETRY) {
    this._id = id;
    //this.info = info;
    this.x = x;
    this.y = y;
    this.z = z;
    this._color = color;
    this._geometry = geometry;

    this.material = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(this._geometry, this.material);
    this.mesh.position.set(x, y, z);

    this.initialZ = z;
  }

  get id() {
    return this._id;
  }

  set id(newId) {
    if (this._id !== newId) {
      this._id = newId;
    }
  }

  get color() {
    return this._color;
  }

  set color(newColor) {
    this._color = newColor;
    this.material.color.set(newColor);
  }

  get geometry() {
    return this._geometry;
  }

  set geometry(newGeometry) {
    this._geometry = newGeometry;
    this.mesh.geometry = newGeometry;
  }

  //highlight() {}
}

export default Node;
