import * as THREE from 'three';

class Edge {
  static DEFAULT_COLOR = '#ffff66'; // '#cccccc'; Very light grey //'#ffff66'; //yellow

  constructor(source, target, weight=1) {
    this.source = source;
    this.target = target;
    this.weight= weight;
    this.extrusionBox = null;

    this.material = new THREE.MeshStandardMaterial({
      color: Edge.DEFAULT_COLOR, 
      transparent: true, 
      opacity: 0.5, 
      metalness: 0.5, 
      roughness: 0.5 
    });

    this.originalColor = this.material.color.getStyle();
    this.defaultColor = this.originalColor;
    this.originalOpacity = this.material.opacity;
    this.updateGeometry();
  }

  updateGeometry() {
    const start = new THREE.Vector3(this.source.mesh.position.x, this.source.mesh.position.y, this.source.mesh.position.z);
    const end = new THREE.Vector3(this.target.mesh.position.x, this.target.mesh.position.y, this.target.mesh.position.z);
    const distance = start.distanceTo(end);

    const edgeGeometry = new THREE.CylinderGeometry(0.02, 0.02, distance, 10);

    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
    }

    this.mesh = new THREE.Mesh(edgeGeometry, this.material);

    const midPoint = start.clone().add(end).multiplyScalar(0.5);
    this.mesh.position.copy(midPoint);

    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Vector3(0, 1, 0));
    this.mesh.quaternion.setFromRotationMatrix(orientation);

    this.mesh.rotateX(Math.PI / 2);

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    if (this.source.mesh.parent) {
      this.source.mesh.parent.add(this.mesh);
    }
  }

  set color(newColor) {
    this.mesh.material.color.set(newColor);
  }

  resetColor(color=null) {
    if(color===null) {
      color = this.originalColor;
    }
    this.mesh.material.color.set(color);
    //this.mesh.material.opacity = this.originalOpacity;
  }

  setOriginalColor(newColor) {
    this.originalColor = newColor;
    this.defaultColor = this.originalColor;
    this.mesh.material.color.set(newColor);
  }

  resetOriginalColor() {
    this.mesh.material.color.set(this.originalColor);
  }

  highlight(color = '#FFD700') { // Yellow
    this.defaultColor = this.mesh.material.color.getHex();
    this.mesh.material.color.set(color);
    this.mesh.material.opacity = Math.min(this.originalOpacity + 0.3, 1);
  }

  unhighlight(color = null) {
    if (color === null) {
      color = this.originalColor;
    }
    this.mesh.material.color.set(color);
    this.mesh.material.opacity = this.originalOpacity;
  }

  removeFromScene(scene) {
    if (this.mesh && this.mesh.parent) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}

export default Edge;
