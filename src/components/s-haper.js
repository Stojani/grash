import * as THREE from 'three';
import Graph from '../model/g-raph';
import GraphInteractions from './graph-interactions';

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
    this.autoRotateInterval = null;

    this.graph = new Graph(this.nodes, this.edges);

    this.nodes.forEach(node => {
      node.initialZ = node.mesh.position.z;
      this.scene.add(node.mesh);
    });
    this.edges.forEach(edge => this.scene.add(edge.mesh));

    // Aggiungi un piano per rappresentare la tavoletta
    this.tabletGeometry = new THREE.PlaneGeometry(10, 10); // Dimensioni del piano
    this.tabletMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide }); // Colore del piano
    this.tablet = new THREE.Mesh(this.tabletGeometry, this.tabletMaterial);
    //this.tablet.rotation.x = Math.PI / 2; // Ruota il piano per essere orizzontale
    //this.tablet.position.y = -1; // Posiziona il piano sotto i nodi
    this.tablet.position.z = -1; // Posiziona il piano sulla parete di fronte
    this.tablet.visible = false; // Inizialmente nascosto
    this.scene.add(this.tablet);

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

  rotateCamera() {
    const radius = 5; // Raggio della rotazione
    const speed = 0.5; // Velocità della rotazione

    // Calcola la nuova posizione della camera
    this.camera.position.x = radius * Math.cos(speed * Date.now() * 0.001);
    this.camera.position.z = radius * Math.sin(speed * Date.now() * 0.001);

    // La camera guarda sempre verso il centro della scena
    this.camera.lookAt(this.scene.position);
  }

  autoRotateCamera() {
    if (!this.autoRotateInterval) {
      this.autoRotateInterval = setInterval(() => {
        this.rotateCamera();
        this.renderer.render(this.scene, this.camera);
      }, 16); // 60 FPS
    }
  }

  stopRotateCamera() {
    if (this.autoRotateInterval) {
      clearInterval(this.autoRotateInterval);
      this.autoRotateInterval = null;
    }
  }

  showTablet() {
    this.tablet.visible = true;
  }

  hideTablet() {
    this.tablet.visible = false;
  }
}

export default Shaper;
