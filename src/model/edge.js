import * as THREE from 'three';

class Edge {
  static DEFAULT_COLOR = 'Grey';
  static DEFAULT_MATERIAL = new THREE.LineBasicMaterial({ color: Edge.DEFAULT_COLOR });

  constructor(source, target, material = Edge.DEFAULT_MATERIAL) {
    this.source = source;
    this.target = target;
    //this.value = value;
    this.material = material;
    this.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(source.mesh.position.x, source.mesh.position.y, source.mesh.position.z),
      new THREE.Vector3(target.mesh.position.x, target.mesh.position.y, target.mesh.position.z)
    ]);
    this.mesh = new THREE.Line(this.geometry, material);
  }

  updateGeometry() {
    this.geometry.setFromPoints([
      new THREE.Vector3(this.source.mesh.position.x, this.source.mesh.position.y, this.source.mesh.position.z),
      new THREE.Vector3(this.target.mesh.position.x, this.target.mesh.position.y, this.target.mesh.position.z)
    ]);
    this.mesh.geometry = this.geometry;
  }
}

export default Edge;
