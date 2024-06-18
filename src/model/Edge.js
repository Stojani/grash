import * as THREE from 'three';

class Edge {
  static DEFAULT_COLOR = 'White';
  static DEFAULT_MATERIAL = new THREE.LineBasicMaterial({ color: Edge.DEFAULT_COLOR });

  constructor(node1, node2, material = Edge.DEFAULT_MATERIAL) {
    this.node1 = node1;
    this.node2 = node2;
    this.material = material;
    this.geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(node1.mesh.position.x, node1.mesh.position.y, node1.mesh.position.z),
      new THREE.Vector3(node2.mesh.position.x, node2.mesh.position.y, node2.mesh.position.z)
    ]);
    this.mesh = new THREE.Line(this.geometry, material);
  }

  updateGeometry() {
    this.geometry.setFromPoints([
      new THREE.Vector3(this.node1.mesh.position.x, this.node1.mesh.position.y, this.node1.mesh.position.z),
      new THREE.Vector3(this.node2.mesh.position.x, this.node2.mesh.position.y, this.node2.mesh.position.z)
    ]);
    this.mesh.geometry = this.geometry;
  }
}

export default Edge;
