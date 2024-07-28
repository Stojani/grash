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
      node.initialZ = node.mesh.position.z;
      node.mesh.castShadow = false;
      node.mesh.receiveShadow = false;
      this.scene.add(node.mesh);
    });

    this.edges.forEach(edge => {
      edge.mesh.castShadow = false;
      this.scene.add(edge.mesh);
    });

    const tabletColor = '#cccccc'; // '#ffff66'; yellow   '#cccccc'; // Very light grey
    this.tabletGeometry = new THREE.BoxGeometry(100, 100, 0.5);
    this.tabletMaterial = new THREE.MeshPhongMaterial({ color: tabletColor, side: THREE.DoubleSide });
    this.tablet = new THREE.Mesh(this.tabletGeometry, this.tabletMaterial);
    this.tablet.position.z = -1;
    this.tablet.visible = false;
    this.tablet.receiveShadow = false;
    this.scene.add(this.tablet);

    this.interactions = new GraphInteractions(this.camera, this.renderer, this.nodes);
    this.addLight(0,0,8);

    this.initForceSimulation();
    this.animate();
  }

  addLight(x=0,y=0,z=0) {
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(x, y, z);
    this.directionalLight.castShadow = true;
    this.scene.add(this.directionalLight);

    this.directionalLight.shadow.mapSize.width = 2048; 
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5; 
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
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
    if (!this.nodes || !this.edges) return;
    this.nodes.forEach(node => {
      node.mesh.position.x = node.x;
      node.mesh.position.y = node.y;
      node.mesh.position.z = node.z;
    });
    this.edges.forEach(edge => edge.updateGeometry());
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    if (this.interactions) {
      this.interactions.update();
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  setSize(width, height) {
    if (!this.renderer || !this.camera) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setZoom(zoom) {
    if (!this.camera) return;
    this.camera.zoom = zoom;
    this.camera.updateProjectionMatrix();
  }

  setMaxZoomIn(maxZoomIn) {
    if (!this.camera) return;
    this.camera.near = maxZoomIn;
    this.camera.updateProjectionMatrix();
  }

  setMaxZoomOut(maxZoomOut) {
    if (!this.camera) return;
    this.camera.far = maxZoomOut;
    this.camera.updateProjectionMatrix();
  }

  see2D() {
    if (!this.nodes || !this.edges) return;
    this.nodes.forEach(node => {
      node.mesh.position.z = 0;
    });
    this.edges.forEach(edge => edge.updateGeometry());
  }

  see3D() {
    if (!this.nodes || !this.edges) return;
    this.nodes.forEach(node => {
      node.mesh.position.z = node.initialZ;
    });
    this.edges.forEach(edge => edge.updateGeometry());
  }

  setBackgroundColor(color) {
    if (!this.scene || !this.renderer) return;
    const newColor = new THREE.Color(color);
    this.scene.background = newColor;
    this.renderer.setClearColor(newColor);
  }

  resetBackgroundColor() {
    if (!this.scene || !this.renderer) return;
    this.scene.background = this.defaultBackgroundColor;
    this.renderer.setClearColor(this.defaultBackgroundColor);
  }

  autoRotateCamera() {
    if (!this.renderer) return;
    this.autoRotate = true;
    this.renderer.setAnimationLoop(() => {
      if (this.scene) {
        this.scene.rotation.y += 0.01;
        this.renderer.render(this.scene, this.camera);
      }
    });
  }

  stopRotateCamera() {
    if (!this.renderer) return;
    this.autoRotate = false;
    this.renderer.setAnimationLoop(null);
    this.animate();
  }

  showTablet() {
    if (!this.tablet) return;
    this.tablet.visible = true;
  }

  hideTablet() {
    if (!this.tablet) return;
    this.tablet.visible = false;
  }

  enableShadows() {
    if (!this.directionalLight || !this.nodes || !this.edges || !this.tablet) return;
    this.directionalLight.castShadow = true;
    this.nodes.forEach(node => {
      node.mesh.castShadow = true;
    });
    this.tablet.receiveShadow = true;
    this.edges.forEach(edge => {
      edge.mesh.castShadow = true;
    });
  }

  disableShadows() {
    if (!this.directionalLight || !this.nodes || !this.edges || !this.tablet) return;
    this.directionalLight.castShadow = false;
    this.nodes.forEach(node => {
      node.mesh.castShadow = false;
    });
    this.tablet.receiveShadow = false;
    this.edges.forEach(edge => {
      edge.mesh.castShadow = false;
    });
  }

  destroy() {
    // Rimuovi gli oggetti dalla scena
    while(this.scene.children.length > 0){ 
      this.scene.remove(this.scene.children[0]); 
    }

    // Annulla l'animazione
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Rimuovi gli ascoltatori di eventi
    if (this.interactions) {
      this.renderer.domElement.removeEventListener('mousemove', this.interactions.onMouseMove);
      this.renderer.domElement.removeEventListener('click', this.interactions.onClick);
      window.removeEventListener('resize', this.interactions.onWindowResize);
    }

    // Rimuovi il renderer dal DOM
    this.container.removeChild(this.renderer.domElement);

    // Rilascia le risorse di Three.js
    this.renderer.dispose();

    // Imposta a null le proprietà per il garbage collection
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.nodes = null;
    this.edges = null;
    this.graph = null;
    this.interactions = null;
    this.tablet = null;
    this.tabletGeometry = null;
    this.tabletMaterial = null;
    this.directionalLight = null;
  }
}

export default Shaper;
