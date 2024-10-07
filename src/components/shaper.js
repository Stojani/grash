import * as THREE from 'three';
import { forceSimulation, forceManyBody, forceCenter, forceLink, forceCollide, forceRadial } from 'd3-force';
import Graph from '../model/Graph';
import GraphInteractions from './GraphInteractions';
import Node from '../model/Node';
import Edge from '../model/Edge';

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

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 15;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(this.defaultBackgroundColor);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

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

    const textureLoader = new THREE.TextureLoader();
    const paperTexture = textureLoader.load('assets/watercolor-paper-texture.jpg');

    this.tabletGeometry = new THREE.BoxGeometry(100, 100, 0.5);
    this.tabletMaterial = new THREE.MeshStandardMaterial({
      map: paperTexture,
      bumpMap: paperTexture,
      bumpScale: 0.05,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    this.tablet = new THREE.Mesh(this.tabletGeometry, this.tabletMaterial);
    this.tablet.position.z = -1;
    this.tablet.visible = false;
    //this.tablet.receiveShadow = true;
    this.scene.add(this.tablet);

    this.interactions = new GraphInteractions(this.camera, this.renderer, this.scene, this.nodes, this.edges);
    this.addLight(0,0,8);

    //useful for debug
    //const axesHelper = new THREE.AxesHelper(15);
    //this.scene.add(axesHelper);

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
      .force('attract', forceRadial(0, 0, 0).strength(0.1))
      .on('tick', () => this.ticked());

    this.simulation = simulation;
  }

  stopSimulation() {
    if (this.simulation) {
      this.simulation.stop();
    }
  }

  updateSimulation() {
    //this.stopSimulation();
  
    // Non riavviare la simulazione se è già stabile (alpha è vicino a 0)
    //
    /*if (this.simulation.alpha() < 0.05) {
      console.log('La simulazione è già stabile. Nessun aggiornamento necessario.');
      return;
    }*/

    // Verifica se ci sono nodi ed archi da utilizzare per la simulazione
    if (this.nodes.length === 0 || this.edges.length === 0) {
      console.warn('No nodes or edges available for simulation.');
      return;
    }

    // Inizializza nuovamente la simulazione con i nodi e archi aggiornati
    this.simulation = forceSimulation(this.nodes)
      .force('link', forceLink(this.edges).id(d => d.id).distance(8)) // Aggiorna il link con gli archi rimasti
      .force('charge', forceManyBody().strength(-10).distanceMax(50))  // Riduci la forza e limita la distanza
      .force('center', forceCenter(0, 0))                              // Mantieni il centro
      .force('collide', forceCollide().radius(0.5))                    // Mantieni la forza di collisione
      .on('tick', () => this.ticked());
  
    // Forza il riavvio della simulazione
    //this.simulation.alpha(1).restart();
  }

  updateGraphSimulation() {
    this.simulation.nodes(this.nodes);
    this.simulation.force("link").links(this.edges);
  
    this.simulation.alpha(0.1).restart();
  }

  ticked() {
    if (!this.nodes || !this.edges) return;

    this.nodes.forEach(node => {
      node.mesh.position.x = node.x;
      node.mesh.position.y = node.y;
      node.mesh.position.z = node.z;
    });

    this.edges.forEach(edge => edge.updateGeometry());

    /*
    if (this.interactions.nodeInfoPopUp) {
      this.interactions.nodeInfoPopUp.position.copy(this.interactions.selectedNode.mesh.position);
      this.interactions.nodeInfoPopUp.position.z += 1.5;
    }
    if (this.popup && this.selectedNode) {
        // Mantieni il popup leggermente spostato rispetto al nodo selezionato
        this.popup.position.copy(this.selectedNode.mesh.position);
        this.popup.position.x += 0.5; // Mantieni l'offset a destra
        this.popup.position.y += 1.5; // Mantieni l'offset sopra
    }
    */
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

  setCameraPosition(x, y, z) {
    if (!this.camera) return;
    this.camera.position.set(x, y, z);
    this.camera.updateProjectionMatrix();
  }

  setCameraSettings({ fov = 35, distance = 30, near = 0.1, far = 1000 }) {
    if (!this.camera) return;
    
    //this.camera.position.set(0, 0, distance);
    //this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.fov = fov;
    this.camera.near = near;
    this.camera.far = far;
    this.camera.updateProjectionMatrix();
  }

  resetCameraSettings() {
    if (!this.camera) return;
    
    this.camera.fov = 50; //default
    this.camera.near = 0.1; //default
    this.camera.far = 2000; //default
    this.camera.updateProjectionMatrix();
  }

  setAllNodesColor(color) {
    if (!this.nodes) return;
    this.nodes.forEach(node => {
      node.color = color; // Utilizza il setter per aggiornare il colore e il materiale
    });
  }

  setAllEdgesColor(color) {
    if (!this.edges) return;
    this.edges.forEach(edge => {
      edge.color = color; // Utilizza il setter per aggiornare il colore e il materiale
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

  removeMouseMovements() {
    if (this.interactions) {
      this.interactions.removeMouseMovements();
    }
  }

  removeSelectedNodes() {
    //this.stopSimulation();

    this.interactions.removeSelectedNodes();
    this.nodes = this.interactions.nodes;
    this.edges = this.interactions.edges;

    this.updateGraphSimulation();
  }

  addNode(x = 0, y = 0, z = 0) {
    const existingIds = this.nodes.map(node => parseInt(node.id, 10)).filter(id => !isNaN(id));
    existingIds.sort((a, b) => a - b);
  
    let newId = existingIds.length ? existingIds[existingIds.length - 1] + 1 : 1;
    for (let i = 0; i < existingIds.length; i++) {
      if (existingIds[i] !== i + 1) {
        newId = i + 1;
        break;
      }
    }
  
    const newNode = new Node(newId.toString(), x, y, z);
    this.nodes.push(newNode);
    this.scene.add(newNode.mesh);
  
    this.updateGraphSimulation();
  
    return newNode;
  }

  addEdge(sourceNode, targetNode) {
    // Verifica che i nodi siano validi
    if (!sourceNode || !targetNode) {
      console.warn("Uno o entrambi i nodi sono null.");
      return;
    }

    // Verifica che l'arco non esista già tra i due nodi
    const existingEdge = this.edges.find(edge => 
      (edge.source === sourceNode && edge.target === targetNode) || 
      (edge.source === targetNode && edge.target === sourceNode)
    );

    if (existingEdge) {
      console.warn("L'arco tra questi nodi esiste già.");
      return;
    }

    // Crea un nuovo arco (Edge) tra i due nodi
    const newEdge = new Edge(sourceNode, targetNode);

    // Aggiungi l'arco alla scena
    this.edges.push(newEdge);
    this.scene.add(newEdge.mesh);

    // Aggiorna la simulazione per considerare il nuovo arco
    this.updateGraphSimulation();
  }

  extrudeSelectedNodes() {
    //this.stopSimulation();
    this.interactions.extrudeSelectedNodes();
  }

  doExtrusion() {
    //this.stopSimulation();
    this.interactions.extrudeSelectedNodes();
    this.interactions.extrudeSelectedEdges();
  }

  resetExtrusion() {
    //this.stopSimulation();
    this.interactions.resetExtrusion();
  }


}

export default Shaper;
