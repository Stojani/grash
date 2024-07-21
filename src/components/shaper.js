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
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
    this.camera.position.z = 5;

    this.graph = new Graph(this.nodes, this.edges);

    this.nodes.forEach(node => {
      this.scene.add(node.mesh);
    });

    this.edges.forEach(edge => {
      this.scene.add(edge.mesh);
    });

    this.tabletGeometry = new THREE.PlaneGeometry(100, 100);
    this.tabletMaterial = new THREE.MeshPhongMaterial({ color: 0xE6E6E6, side: THREE.DoubleSide });
    this.tablet = new THREE.Mesh(this.tabletGeometry, this.tabletMaterial);
    this.tablet.position.z = -1;
    this.tablet.visible = false;
    this.scene.add(this.tablet);

    this.interactions = new GraphInteractions(this.camera, this.renderer);
    this.addLights();

    this.initForceSimulation();
    this.animate();
  }

  addLights() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(5, 5, 5);
    pointLight.castShadow = true;
    this.scene.add(pointLight);
  }

  initForceSimulation() {
    const simulation = forceSimulation(this.nodes)
      .force('link', forceLink(this.edges).id(d => d.id).distance(8))
      .force('charge', forceManyBody().strength(-1))
      .force('center', forceCenter(0, 0))
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

  autoRotateCamera() {
    this.autoRotate = true;
    this.renderer.setAnimationLoop(() => {
      this.scene.rotation.y += 0.01;
      this.renderer.render(this.scene, this.camera);
    });
  }

  stopRotateCamera() {
    this.autoRotate = false;
    this.renderer.setAnimationLoop(null);
    this.animate();
  }

  showTablet() {
    this.tablet.visible = true;
  }

  hideTablet() {
    this.tablet.visible = false;
  }
}

export default Shaper;
