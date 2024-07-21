import * as THREE from 'three';

class Edge {
  static DEFAULT_COLOR = 'LightGray';
  static DEFAULT_MATERIAL = new THREE.MeshStandardMaterial({ 
    color: Edge.DEFAULT_COLOR, 
    transparent: true, 
    opacity: 0.5, 
    metalness: 0.5, 
    roughness: 0.5 
  });

  constructor(source, target, material = Edge.DEFAULT_MATERIAL) {
    this.source = source;
    this.target = target;
    this.material = material;
    this.updateGeometry();
  }

  updateGeometry() {
    const start = new THREE.Vector3(this.source.mesh.position.x, this.source.mesh.position.y, this.source.mesh.position.z);
    const end = new THREE.Vector3(this.target.mesh.position.x, this.target.mesh.position.y, this.target.mesh.position.z);
    const distance = start.distanceTo(end);

    // Cylinder geometry: small radius, height as distance between nodes
    const edgeGeometry = new THREE.CylinderGeometry(0.02, 0.02, distance, 10);

    // Remove previous mesh if exists
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
    }

    this.mesh = new THREE.Mesh(edgeGeometry, this.material);

    // Position the cylinder at the midpoint
    const midPoint = start.clone().add(end).multiplyScalar(0.5);
    this.mesh.position.copy(midPoint);

    // Align the cylinder with the line between start and end
    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Vector3(0, 1, 0));
    this.mesh.quaternion.setFromRotationMatrix(orientation);

    // Rotate the cylinder 90 degrees around its Y axis
    this.mesh.rotateX(Math.PI / 2);

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Make sure the edge is visible by adding it to the scene
    if (this.source.mesh.parent) {
      this.source.mesh.parent.add(this.mesh);
    }
  }
}

export default Edge;
