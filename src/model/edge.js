import * as THREE from 'three';

class Edge {
  static DEFAULT_COLOR = '#ffff66';// '#cccccc';  Very light grey   //'#ffff66'; //yellow
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

    // Rimuovi la vecchia geometria
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
    }

    this.mesh = new THREE.Mesh(edgeGeometry, this.material);

    // Posiziona il cilindro a metà tra start e end
    const midPoint = start.clone().add(end).multiplyScalar(0.5);
    this.mesh.position.copy(midPoint);

    // Allinea il cilindro con la linea tra start e end
    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Vector3(0, 1, 0));
    this.mesh.quaternion.setFromRotationMatrix(orientation);

    // Ruota il cilindro di 90 gradi sull'asse Y
    this.mesh.rotateX(Math.PI / 2);

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Assicurati che l'arco sia visibile aggiungendolo alla scena
    if (this.source.mesh.parent) {
      this.source.mesh.parent.add(this.mesh);
    }
  }

  set color(newColor) {
    this.material.color.set(newColor);
    if (this.mesh) {
      this.mesh.material = this.material;
    }
  }

  removeFromScene(scene) {
    if (this.mesh && this.mesh.parent) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose(); // Rilascia la geometria dell'arco
      this.mesh.material.dispose(); // Rilascia il materiale dell'arco
    }
  }
}

export default Edge;
