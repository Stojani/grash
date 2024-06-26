import * as THREE from 'three';
import { forceSimulation, forceManyBody, forceCenter, forceLink, forceCollide } from 'd3-force';
import Graph from '../model/graph';
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

    this.tabletGeometry = new THREE.PlaneGeometry(10, 10);
    this.tabletMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide });
    this.tablet = new THREE.Mesh(this.tabletGeometry, this.tabletMaterial);
    this.tablet.position.z = -1;
    this.tablet.visible = false;
    this.scene.add(this.tablet);

    this.interactions = new GraphInteractions(this.camera, this.renderer);

    this.initForceSimulation();
    this.animate();
  }

  initForceSimulation() {
    const simulation = forceSimulation(this.nodes)
      .force('charge', forceManyBody().strength(-30))
      .force('center', forceCenter(0, 0))
      .force('link', forceLink(this.edges).id(d => d.id))
      .force('collide', forceCollide().radius(0.5))
      .on('tick', () => this.ticked());

    this.simulation = simulation;
  }

  ticked() {
    this.nodes.forEach(node => {
      node.mesh.position.x = node.x;
      node.mesh.position.y = node.y;
      node.mesh.position.z = node.z;
    });
    this.edges.forEach(edge => edge.updateGeometry());
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
    const radius = 5;
    const speed = 0.5;

    this.camera.position.x = radius * Math.cos(speed * Date.now() * 0.001);
    this.camera.position.z = radius * Math.sin(speed * Date.now() * 0.001);

    this.camera.lookAt(this.scene.position);
  }

  autoRotateCamera() {
    if (!this.autoRotateInterval) {
      this.autoRotateInterval = setInterval(() => {
        this.rotateCamera();
        this.renderer.render(this.scene, this.camera);
      }, 16);
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
