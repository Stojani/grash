import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

class GraphInteractions {
  constructor(camera, renderer, scene, nodes, edges) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.nodes = nodes;
    this.edges = edges;
    this.controls = null;
    this.selectedNodes = [];
    this.selectedNode = null;
    this.selectedEdges = [];
    this.selectedEdge = null;
    this.hoveredNode = null;
    this.hoveredEdge = null;
    this.raycaster = new THREE.Raycaster();
    this.nodeInfoPopUp = null;
    this.flagShowNodePopUp = true;
    this.initOrbitControls();
    this.addEventListeners();
  }

  initOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    //this.controls.enableDamping = true;
    //this.controls.dampingFactor = 0.25;
    //this.controls.rotateSpeed = 0.3;
    //this.controls.zoomSpeed = 0.9;
    //this.controls.panSpeed = 0.8;
    //this.controls.minPolarAngle = Math.PI / 4;
    //this.controls.maxPolarAngle = Math.PI - Math.PI / 4;
    //this.controls.minDistance = 1;
    //this.controls.maxDistance = 1000;
    //this.controls.enablePan = true;
    //this.controls.screenSpacePanning = true;
  }

  addEventListeners() {
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.camera);

    const nodeIntersects = this.raycaster.intersectObjects(this.nodes.map(node => node.mesh));
    if (nodeIntersects.length > 0) {
        const hoveredObject = nodeIntersects[0].object;
        this.highlightNode(hoveredObject);
    } else {
        this.unhighlightNode();
    }

    const edgeIntersects = this.raycaster.intersectObjects(this.edges.map(edge => edge.mesh), true);

    if (edgeIntersects.length > 0) {

      const hoveredEdgeObject = edgeIntersects[0].object;
      const hoveredEdge = this.edges.find(edge => edge.mesh === hoveredEdgeObject);

      if (hoveredEdge && hoveredEdge !== this.hoveredEdge) {
        this.unhighlightEdge(this.hoveredEdge);
        this.highlightEdge(hoveredEdge);
        this.hoveredEdge = hoveredEdge;
      }
    } else if (this.hoveredEdge) {
      this.unhighlightEdge(this.hoveredEdge);
      this.hoveredEdge = null;
    }

    this.controls.update();
  }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.camera);

    const nodeIntersects = this.raycaster.intersectObjects(this.nodes.map(node => node.mesh));
    if (nodeIntersects.length > 0) {
        const selectedNode = nodeIntersects[0].object;
        this.selectNode(selectedNode);
    } else {
        const edgeIntersects = this.raycaster.intersectObjects(this.edges.map(edge => edge.mesh));
        if (edgeIntersects.length > 0) {
            const selectedEdge = edgeIntersects[0].object;
            this.selectEdge(selectedEdge);
        }
    }
  }

  highlightNode(nodeMesh) {
    if (this.hoveredNode) {
      this.hoveredNode.resetHoverHighlight();
    }
    const hoveredNode = this.nodes.find(node => node.mesh === nodeMesh);
    if (hoveredNode) {
      hoveredNode.hoverHighlight();
      this.hoveredNode = hoveredNode;
    }
  }

  unhighlightNode() {
    if (this.hoveredNode) {
      this.hoveredNode.resetHoverHighlight();
      this.hoveredNode = null;
    }
  }

  selectNode(nodeMesh) {
    const selectedNode = this.nodes.find(node => node.mesh === nodeMesh);
    if (selectedNode) {
      const index = this.selectedNodes.indexOf(selectedNode);
      if (index === -1) {
          selectedNode.highlight();
          this.selectedNodes.push(selectedNode);
          if (this.flagShowNodePopUp) {
            this.showPopup(selectedNode);
          }
      } else {
          selectedNode.resetColor();
          this.selectedNodes.splice(index, 1);
          this.hidePopup();
      }
    }
  }

  //ARCHI
  calculateDistanceToEdge(mousePosition, edge) {
    const start = edge.source.mesh.position;
    const end = edge.target.mesh.position;

    const lineVec = new THREE.Vector3().subVectors(end, start);
    const startToMouse = new THREE.Vector3().subVectors(mousePosition, start);

    const projectionLength = startToMouse.dot(lineVec) / lineVec.lengthSq();
    const closestPoint = start.clone().add(lineVec.multiplyScalar(projectionLength));

    return mousePosition.distanceTo(closestPoint);
  }

  highlightEdgeOnProximity(mousePosition) {
    let closestEdge = null;
    let minDistance = Infinity;

    this.edges.forEach(edge => {
        const distance = this.calculateDistanceToEdge(mousePosition, edge);

        if (distance < 0.2 && distance < minDistance) {
            closestEdge = edge;
            minDistance = distance;
        }
    });

    if (closestEdge) {
        this.highlightEdge(closestEdge);
    } else {
        this.unhighlightAllEdges();
    }
  }

  highlightEdge(edge) {
    if (edge && edge.mesh && edge.mesh.material) {
      if (!this.selectedEdges.includes(edge)) {
        edge.originalColor = edge.mesh.material.color.getHex();
        edge.mesh.material.color.set('#FFD700');
      }
    }
  }

  unhighlightEdge(edge) {
    if (edge && edge.mesh && edge.mesh.material && edge.originalColor !== undefined) {
      if (!this.selectedEdges.includes(edge)) {
        edge.mesh.material.color.set(edge.originalColor);
      }
    }
  }

  unhighlightAllEdges() {
    this.edges.forEach(edge => {
        if (edge && edge.mesh && edge.mesh.material) {
            edge.mesh.material.color.set(edge.originalColor);
        }
    });
  }

  selectEdge(edge) {
    const selectedEdge = this.edges.find(e => e.mesh === edge);

    if (selectedEdge) {
        const index = this.selectedEdges.indexOf(selectedEdge);

        if (index === -1) {
            selectedEdge.color = '#FF0000';
            this.selectedEdges.push(selectedEdge);
        } else {
            selectedEdge.resetColor();
            this.selectedEdges.splice(index, 1);
        }
    }
  }

  update() {
    this.controls.update();
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  removeMouseMovements() {
    this.disableMouseRotation();
    this.disableMousePanning();
  }

  restoreMouseMovements() {
    this.enableMouseRotation();
    this.enableMousePanning();
  }

  enableMouseRotation() {
    this.controls.enableRotate = true;
  }

  disableMouseRotation() {
    this.controls.enableRotate = false;
  }

  enableRotationAroundTest() {
    this.controls.enableRotate = true;

    // Permette la rotazione completa sull'asse azimutale attorno a Z
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;

    // Blocca l'angolo polare per mantenere la vista sul piano YZ
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Disabilita la panoramica per evitare spostamenti laterali della camera
    this.controls.enablePan = false;
  }

  enableRotationAroundY() {
    this.controls.enableRotate = true;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.minPolarAngle = 0; // Blocca movimenti sull'asse Z (zenitale)
    this.controls.maxPolarAngle = Math.PI; // Mantiene la rotazione libera su Y
  }

  disableRotationAroundY() {
    this.controls.enableRotate = false;
    this.controls.minPolarAngle = 0; // Permette di tornare alle rotazioni libere su X, Y e Z
    this.controls.maxPolarAngle = Math.PI;
  }

  enableRotationAroundZ() {
    this.controls.enableRotate = true;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.minPolarAngle = Math.PI / 2; // Blocca rotazione su X e Y
    this.controls.maxPolarAngle = Math.PI / 2;
  }

  disableRotationAroundZ() {
    this.controls.enableRotate = false;
    this.controls.minPolarAngle = 0; // Permette rotazioni libere su X e Y
    this.controls.maxPolarAngle = Math.PI;
  }

  enableMousePanning() {
    this.controls.enablePan = true;
  }

  disableMousePanning() {
    this.controls.enablePan = false;
  }

  removeNode(nodeMesh) {
    const nodeToRemove = this.nodes.find(node => node.mesh === nodeMesh);
    if (nodeToRemove) {
      const edgesToRemove = this.edges.filter(edge => edge.source === nodeToRemove || edge.target === nodeToRemove);
  
      edgesToRemove.forEach(edge => {
        if (edge.mesh && edge.mesh.parent) {
          edge.mesh.parent.remove(edge.mesh);
          edge.mesh.geometry.dispose();
          edge.mesh.material.dispose();
        }
      });
  
      this.edges = this.edges.filter(edge => !edgesToRemove.includes(edge));
  
      if (nodeToRemove.mesh && nodeToRemove.mesh.parent) {
        nodeToRemove.mesh.parent.remove(nodeToRemove.mesh);
        nodeToRemove.mesh.geometry.dispose();
        nodeToRemove.mesh.material.dispose();
      }
  
      this.nodes = this.nodes.filter(node => node !== nodeToRemove);
  
      this.selectedNodes = this.selectedNodes.filter(node => node !== nodeToRemove);
      if (this.hoveredNode === nodeToRemove) {
        this.hoveredNode = null;
      }
    }
  }

  removeSelectedNodes() {
    const nodesToRemove = [...this.selectedNodes];
    nodesToRemove.forEach(node => {
      this.removeNode(node.mesh);
    });
    this.selectedNodes = [];
  }

  createPopup(node) {
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: this.createTextTexture(`ID: ${node.id}\nX: ${node.x}\nY: ${node.y}\nZ: ${node.z}`),
        transparent: true
    });

    const sprite = new THREE.Sprite(spriteMaterial);   
    sprite.position.copy(node.mesh.position);
    sprite.position.y += 2;
    sprite.scale.set(3, 3, 1);

    this.nodeInfoPopUp = sprite;
    this.scene.add(this.nodeInfoPopUp);
    
  }

  createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const lines = text.split('\n');

    const fontSize = 14;
    const lineHeight = fontSize * 1.2;
    const padding = 8;

    const maxWidth = Math.max(...lines.map(line => context.measureText(line).width)) + padding * 2;
    const totalHeight = lineHeight * lines.length + padding * 2;

    const scaleFactor = 3;
    canvas.width = maxWidth * scaleFactor;
    canvas.height = totalHeight * scaleFactor;
    context.scale(scaleFactor, scaleFactor);

    context.beginPath();
    context.moveTo(padding, padding);
    context.lineTo(maxWidth - padding, padding);
    context.quadraticCurveTo(maxWidth, padding, maxWidth, padding * 2);
    context.lineTo(maxWidth, totalHeight - padding);
    context.quadraticCurveTo(maxWidth, totalHeight, maxWidth - padding, totalHeight);
    context.lineTo(padding, totalHeight);
    context.quadraticCurveTo(0, totalHeight, 0, totalHeight - padding);
    context.lineTo(0, padding * 2);
    context.quadraticCurveTo(0, padding, padding, padding);
    context.closePath();

    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fill();

    context.font = `${fontSize}px Arial`;
    context.fillStyle = 'rgba(0, 0, 0, 1)';
    lines.forEach((line, index) => {
        context.fillText(line, padding, lineHeight * (index + 1) + padding);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true; 
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  showPopup(node) {
    if (this.nodeInfoPopUp) {
        this.scene.remove(this.nodeInfoPopUp);
    }
    this.createPopup(node);
  }

  hidePopup() {
    if (this.nodeInfoPopUp) {
        this.scene.remove(this.nodeInfoPopUp);
        this.nodeInfoPopUp = null;
    }
  }

  extrudeNode(node, extrusionAmount = 1) {
    node.mesh.position.z += extrusionAmount;
    this.animatePulsatingColor(node);
  }

  animatePulsatingColor(node) {
    const originalColor = new THREE.Color(node.color);
    const highlightColor = new THREE.Color(0xffff00);
    const pulseSpeed = 0.01;
    let pulseDirection = 1;
    let intensity = 0;
  
    const pulse = () => {
      intensity += pulseSpeed * pulseDirection;
  
      if (intensity >= 1) {
        pulseDirection = -1;
        intensity = 1;
      } else if (intensity <= 0) {
        pulseDirection = 1;
        intensity = 0;
      } 
      const pulsatingColor = originalColor.clone().lerp(highlightColor, intensity);
      node.mesh.material.color.set(pulsatingColor);
      node.pulseAnimation = requestAnimationFrame(pulse);
    };
    pulse();
  }

  resetPulsation(node) {
    if (node.pulseAnimation) {
      cancelAnimationFrame(node.pulseAnimation);
      node.pulseAnimation = null;
    }
  
    node.mesh.material.color.set(node.originalColor);
    node.intensity = 0;
    node.pulseDirection = 1;
  }

  resetExtrudeNode(node) {
    node.mesh.position.z = node.initialZ;
    if (this.pulseAnimation) {
      cancelAnimationFrame(this.pulseAnimation);
      this.pulseAnimation = null;
    }
    node.mesh.material.color.set(node.originalColor || node.color);
  }

  //NODES EXTRUSION
  extrudeNodeAsMushroomWithStem(node, extrusionHeight = 0.5, duration = 2000) {
    const initialZ = node.mesh.position.z;
    const startTime = performance.now();
  
    const baseRadius = 0.3;
    const topRadius = 0.15;
  
    const height = Math.abs(extrusionHeight - initialZ);
    const stemGeometry = new THREE.CylinderGeometry(topRadius, baseRadius,  height, 32);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#999999', transparent: true, opacity: 0.8 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.rotation.x = Math.PI / 2;
    stem.position.set(node.mesh.position.x, node.mesh.position.y, initialZ);
    stem.scale.y = 0;
    this.scene.add(stem);
    node.extrusionStem = stem;
  
    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
  
      const z = initialZ + progress * (extrusionHeight - initialZ);
      node.mesh.position.z = z;
  
      stem.scale.y = progress;
      stem.position.z = initialZ + (progress * height) / 2;
  
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
  
    requestAnimationFrame(animate);
  }

  resetNodeExtrusion(node, extrusionHeight = 0.5, duration = 2000) {
    const stem = node.extrusionStem;
    const finalZ = node.mesh.position.z;
    const initialZ = finalZ - extrusionHeight;
    const startTime = performance.now();
    const height = Math.abs(finalZ - initialZ);

    const animateReset = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      node.mesh.position.z = finalZ - progress * (finalZ - initialZ);

      stem.scale.y = 1 - progress;
      stem.position.z = (height * (1 - progress)) / 2;

      if (progress >= 1) {
        this.scene.remove(stem);
        stem.geometry.dispose();
        stem.material.dispose();
        node.extrusionStem = null;
      }

      if (progress < 1) {
        requestAnimationFrame(animateReset);
      }
    };
  
    requestAnimationFrame(animateReset);
  }

  extrudeNodes(nodes) {
    nodes.forEach(node => {
      this.extrudeNodeAsMushroomWithStem(node);
    });
  }

  resetNodesExtrusion(nodes) {
    nodes.forEach(node => {
      this.resetNodeExtrusion(node);
    });
  }

  extrudeNodesByGroup(nodes) {
    nodes.forEach(node => {
      this.extrudeNodeAsMushroomWithStem(node, node.group);
    });
  }

  resetNodesExtrusionByGroup(nodes) {
    nodes.forEach(node => {
      this.resetNodeExtrusion(node, node.group);
    });
  }

  extrudeSelectedNodes() {
    const nodesToExtrude = [...this.selectedNodes];
    this.extrudeNodes(nodesToExtrude);
  }

  //EDGES EXTRUSION
  extrudeEdgeAsBox(edge, finalZ = 0.5) {
    const duration = 2000;
    const startZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = startZ;
    const startTime = performance.now();

    const start = edge.source.mesh.position;
    const end = edge.target.mesh.position;
    const distance = start.distanceTo(end);

    const depth = 0.05;

    const boxGeometry = new THREE.BoxGeometry(finalZ, depth, distance);
    //colors: grey: #999999 ---- gold-yellow: #f2de05
    const boxMaterial = new THREE.MeshStandardMaterial({ color: '#f2de05', transparent: true, opacity: 0.8 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);

    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    box.position.copy(midPoint);

    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Vector3(0, 1, 0));
    box.quaternion.setFromRotationMatrix(orientation);
    box.scale.x = 0;

    this.scene.add(box);
    edge.extrusionBox = box;

    const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const z = initialZ + progress * (finalZ - initialZ);
        edge.mesh.position.z = z;
    
        box.scale.x = progress;
        box.position.z = initialZ + (progress * finalZ) / 2;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
  }

  resetEdgeExtrusion(edge, duration = 2000) {
    const box = edge.extrusionBox;
    const finalZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = finalZ - 0.5;
    const startTime = performance.now();

    const animateReset = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        edge.mesh.position.z = finalZ - progress * (finalZ - initialZ);;

        box.position.z = (finalZ * (1 - progress)) / 2;
        box.scale.x = 1 - progress;

        if (progress >= 1) {
            this.scene.remove(box);
            box.geometry.dispose();
            box.material.dispose();
            edge.extrusionBox = null;
        }

        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    };

    requestAnimationFrame(animateReset);
  }

  //EDGES EXTRUSION AS TRAPEZIO
  extrudeEdgeAsTrapezoid(edge, finalZ = 0.5) {
    const duration = 2000;
    const startZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = startZ;
    const startTime = performance.now();

    const start = edge.source.mesh.position;
    const end = edge.target.mesh.position;
    const distance = start.distanceTo(end);

    const baseRadius = 0.10;
    const topRadius = 0.05;

    let trapezoidGeometry = new THREE.CylinderGeometry(
        topRadius,
        baseRadius,
        0.5,
        4,
        1,
        false,
        Math.PI / 4
    );

    trapezoidGeometry.rotateX(Math.PI / 2);

    const trapezoidMaterial = new THREE.MeshStandardMaterial({ color: '#f2de05', transparent: true, opacity: 0.8 });
    const trapezoid = new THREE.Mesh(trapezoidGeometry, trapezoidMaterial);

    //const axesHelper = new THREE.AxesHelper(2);
    //trapezoid.add(axesHelper.clone())

    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    trapezoid.position.copy(midPoint);
    trapezoid.position.z = initialZ;

    const angleY = Math.atan2(end.y - start.y, end.x - start.x);
    trapezoid.rotation.z = angleY;

    trapezoid.scale.z = 0;
    trapezoid.scale.x = distance*7;
    trapezoid.scale.y = 1.7;

    this.scene.add(trapezoid);
    edge.extrusionTrapezoid = trapezoid;

    const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const z = initialZ + progress * (finalZ - initialZ);
        edge.mesh.position.z = z;

        trapezoid.scale.z = progress;
        trapezoid.position.z = initialZ + (progress * finalZ) / 2;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
  }

  resetEdgeExtrusionTrapezoid(edge, duration = 2000) {
    const trapezoid = edge.extrusionTrapezoid;
    const finalZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = finalZ - 0.5;
    const startTime = performance.now();

    const animateReset = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        edge.mesh.position.z = finalZ - progress * (finalZ - initialZ);
      
        trapezoid.position.z = (finalZ * (1 - progress)) / 2;
        trapezoid.scale.z = 1 - progress;

        if (progress >= 1) {
            this.scene.remove(trapezoid);
            trapezoid.geometry.dispose();
            trapezoid.material.dispose();
            edge.extrusionTrapezoid = null;
        }

        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    };

    requestAnimationFrame(animateReset);
  }

  //EDGES EXTRUSION AS CUSTOM TRAPEZOID
  extrudeEdgeAsCustomTrapezoid(edge, finalZ = 0.5) {
    const duration = 2000;
    const initialZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const startTime = performance.now();

    const start = edge.source.mesh.position;
    const end = edge.target.mesh.position;
    const distance = start.distanceTo(end);

    const baseWidth = 0.30;
    const topWidth = 0.05;
    const height = 0.5;

    const shape = new THREE.Shape();
    shape.moveTo(-baseWidth / 2, 0);
    shape.lineTo(baseWidth / 2, 0);
    shape.lineTo(topWidth / 2, height);
    shape.lineTo(-topWidth / 2, height);
    shape.closePath();

    const trapezoidGeometry = new THREE.ExtrudeGeometry(shape, {
        depth: distance,
        bevelEnabled: false
    });

    const trapezoidMaterial = new THREE.MeshStandardMaterial({ color: '#f2de05', transparent: true, opacity: 0.8 });
    const trapezoid = new THREE.Mesh(trapezoidGeometry, trapezoidMaterial);

    trapezoid.position.copy(end);

    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Vector3(0, 0, 1));
    trapezoid.quaternion.setFromRotationMatrix(orientation);

    trapezoid.scale.y = 0;
    this.scene.add(trapezoid);
    edge.extrusionTrapezoid = trapezoid;

    const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const z = initialZ + progress * (finalZ - initialZ);
        edge.mesh.position.z = z;

        trapezoid.scale.y = progress;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
  }

  resetEdgeExtrusionAsCustomTrapezoid(edge, duration = 2000) {
    const trapezoid = edge.extrusionTrapezoid;
    const finalZ = (edge.source.mesh.position.z + edge.target.mesh.position.z) / 2;
    const initialZ = finalZ - 0.5;
    const startTime = performance.now();

    const animateReset = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        edge.mesh.position.z = finalZ - progress * (finalZ - initialZ);
      
        trapezoid.scale.y = 1 - progress;

        if (progress >= 1) {
            this.scene.remove(trapezoid);
            trapezoid.geometry.dispose();
            trapezoid.material.dispose();
            edge.extrusionTrapezoid = null;
        }

        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    };

    requestAnimationFrame(animateReset);
  }

  extrudeEdges(edges) {
    edges.forEach(edge => {
        //this.extrudeEdgeAsBox(edge);
        //this.extrudeEdgeAsTrapezoid(edge);
        this.extrudeEdgeAsCustomTrapezoid(edge);
    });
  }

  resetEdgesExtrusion(edges) {
    edges.forEach(edge => {
        //this.resetEdgeExtrusion(edge);
        //this.resetEdgeExtrusionTrapezoid(edge);
        this.resetEdgeExtrusionAsCustomTrapezoid(edge); 
    });
  }

  extrudeSelectedEdges() {
    const edgesToExtrude = [...this.selectedEdges];
    this.extrudeEdges(edgesToExtrude);
  }

  resetExtrusion() {
    const nodesToReset = [...this.selectedNodes];
    this.resetNodesExtrusion(nodesToReset);
    const edgesToReset = [...this.selectedEdges];
    this.resetEdgesExtrusion(edgesToReset);
  }

  extrudePath(nodesToExtrude, edgesToExtrude) {
    this.extrudeNodes(nodesToExtrude);
    this.extrudeEdges(edgesToExtrude);
  }

  resetPathExtrusion(nodesToReset, edgesToReset) {
    this.resetNodesExtrusion(nodesToReset);
    this.resetEdgesExtrusion(edgesToReset);
  }

  enableShowNodePopUp() {
    this.flagShowNodePopUp = true;
  }

  disableShowNodePopUp() {
    this.flagShowNodePopUp = false;
  }

  
}

export default GraphInteractions;
