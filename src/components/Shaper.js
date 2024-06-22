import * as THREE from 'three';
import Graph from '../model/Graph';
import GraphInteractions from './GraphInteractions';

class Shaper {
  constructor(container, nodes, edges) {
    this.container = container;
    this.nodes = nodes;
    this.edges = edges;
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.defaultBackgroundColor = new THREE.Color(0x000000);
    this.scene.background = this.defaultBackgroundColor;
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(this.defaultBackgroundColor);
    this.container.appendChild(this.renderer.domElement);
    this.camera.position.z = 5;

    this.graph = new Graph(this.nodes, this.edges);

    this.nodes.forEach(node => {
      node.initialZ = node.mesh.position.z;
      this.scene.add(node.mesh);
    });
    this.edges.forEach(edge => this.scene.add(edge.mesh));

    this.interactions = new GraphInteractions(this.camera, this.renderer);
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.interactions.update();
    this.renderer.render(this.scene, this.camera);
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setZoom(zoom) {
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
  }

  setMaxZoomIn(maxZoomIn) {
    this.camera.near = maxZoomIn;
    this.camera.updateProjectionMatrix();
  }

  setMaxZoomOut(maxZoomOut) {
    this.camera.far = maxZoomOut;
    this.camera.updateProjectionMatrix();
  }

  see2D() {
    this.nodes.forEach(node => {
      node.mesh.position.z = 0;
    });
    this.edges.forEach(edge => edge.updateGeometry());
  }

  see3D() {
    this.nodes.forEach(node => {
      node.mesh.position.z = node.initialZ;
    });
    this.edges.forEach(edge => edge.updateGeometry());
  }

  setBackgroundColor(color) {
    const newColor = new THREE.Color(color);
    this.scene.background = newColor;
    this.renderer.setClearColor(newColor);
  }

  resetBackgroundColor() {
    this.scene.background = this.defaultBackgroundColor;
    this.renderer.setClearColor(this.defaultBackgroundColor);
  }
}

export default Shaper;
