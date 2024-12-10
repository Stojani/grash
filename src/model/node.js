import * as THREE from 'three';

class Node {
  static DEFAULT_COLOR = '#0080ff'; //blue
  static DEFAULT_GEOMETRY = new THREE.SphereGeometry(0.3, 32, 32);

  constructor(id, group = 0, x = 0, y = 0, z = 0, color = Node.DEFAULT_COLOR, geometry = Node.DEFAULT_GEOMETRY) {
    this._id = id;
    this.group = group;
    this.x = x;
    this.y = y;
    this.z = z;
    this._color = color;
    this._geometry = geometry;
    this.extrusionStem = null;

    this.material = new THREE.MeshStandardMaterial({ color: this.color, metalness: 0.5, roughness: 0.5 });
    this.mesh = new THREE.Mesh(this._geometry, this.material);
    this.mesh.position.set(x, y, z);
    this.mesh.scale.z = 0.5;

    this.initialZ = z;
    this.originalColor = this._color;
  }

  get id() {
    return this._id;
  }

  set id(newId) {
    if (this._id !== newId) {
      this._id = newId;
    }
  }

  get geometry() {
    return this._geometry;
  }

  set geometry(newGeometry) {
    this._geometry = newGeometry;
    this.mesh.geometry = newGeometry;
  }

  get color() {
    return this._color;
  }

  set color(newColor) {
    this._color = newColor;
    this.material.color.set(newColor);
  }

  resetColor(color=null) {
    if(color===null) {
      color = this.originalColor;
    }
    this.material.color.set(color);
  }

  setOriginalcolor(newColor) {
    this._color = newColor;
    this.originalColor = newColor;
    this.material.color.set(newColor);
  }

  resetOriginalColor() {
    this.material.color.set(this.originalColor);
  }

  highlight(color='#ff0000') { // Red
    this.mesh.material.color.set(color); 
  }

  unhighlight(color=null) {
    if(color===null) {
      color = this.originalColor;
    }
    this.mesh.material.color.set(color);
  }

  hoverHighlight(hexColor=0xffff00) { // Yellow
    this.mesh.material.emissive.setHex(hexColor);
  }

  resetHoverHighlight(hexColor=0x000000) { 
    this.mesh.material.emissive.setHex(hexColor);
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

export default Node;
