import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

class GraphInteractions {
  constructor(camera, renderer, scene, nodes) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.nodes = nodes;
    this.controls = null;
    this.selectedNode = null;
    this.hoveredNode = null;
    this.composer = null;
    this.outlinePass = null;
    this.initOrbitControls();
    this.initPostProcessing();
    this.addEventListeners();
  }

  initOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.rotateSpeed = 0.3;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.8;
    this.controls.minPolarAngle = Math.PI / 4;
    this.controls.maxPolarAngle = Math.PI - Math.PI / 4;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
  }

  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
    this.outlinePass.edgeStrength = 2.5;
    this.outlinePass.edgeGlow = 0.0;
    this.outlinePass.edgeThickness = 1.0;
    this.outlinePass.pulsePeriod = 0;
    this.outlinePass.visibleEdgeColor.set('#ffff00'); // Yellow color
    this.outlinePass.hiddenEdgeColor.set('#190a05'); // Dark color
    this.composer.addPass(this.outlinePass);

    const effectFXAA = new ShaderPass(FXAAShader);
    effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    this.composer.addPass(effectFXAA);
  }

  addEventListeners() {
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  onMouseMove(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.nodes.map(node => node.mesh));
    if (intersects.length > 0) {
      const hoveredObject = intersects[0].object;
      this.highlightNode(hoveredObject);
    } else {
      this.unhighlightNode();
    }
    this.controls.update();
  }

  onClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

    console.log(`Mouse coordinates: (${mouse.x}, ${mouse.y})`); // Debug: log mouse coordinates

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.nodes.map(node => node.mesh));
    console.log(`Number of intersects: ${intersects.length}`); // Debug: log number of intersects
    
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      this.selectNode(selectedObject);
    }
  }

  highlightNode(nodeMesh) {
    if (this.hoveredNode !== nodeMesh) {
      this.unhighlightNode();
      this.hoveredNode = nodeMesh;
      this.outlinePass.selectedObjects = [nodeMesh];
    }
  }

  unhighlightNode() {
    if (this.hoveredNode) {
      this.outlinePass.selectedObjects = [];
      this.hoveredNode = null;
    }
  }

  selectNode(nodeMesh) {
    if (this.selectedNode) {
      this.selectedNode.resetColor();
    }
    const selectedNode = this.nodes.find(node => node.mesh === nodeMesh);
    if (selectedNode) {
      selectedNode.highlight();
      this.selectedNode = selectedNode;
    }
  }

  update() {
    this.controls.update();
    this.composer.render();
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(width, height);
  }

  removeMouseMovements() {
    this.disableMouseRotation();
    this.disableMousePanning();
  }

  enableMouseRotation() {
    this.controls.enableRotate = true;
  }

  disableMouseRotation() {
    this.controls.enableRotate = false;
  }

  enableMousePanning() {
    this.controls.enablePan = true;
  }

  disableMousePanning() {
    this.controls.enablePan = false;
  }
}

export default GraphInteractions;
