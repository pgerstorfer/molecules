
import * as THREE from 'three/webgpu';

import {
  pass
} from 'three/tsl';

import {
  artisticBokeh
} from '/shaders/ArtisticBokeh.js';

// --------------------------------------------------
// Renderer
// --------------------------------------------------

const renderer = new THREE.WebGPURenderer({
  antialias: true
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.toneMapping = THREE.ACESFilmicToneMapping;

document.body.appendChild(renderer.domElement);

await renderer.init();

// --------------------------------------------------
// Scene
// --------------------------------------------------

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x07152f);

// --------------------------------------------------
// Camera
// --------------------------------------------------

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 0, 12);
camera.lookAt(0, 0, 0);

// --------------------------------------------------
// Lights
// --------------------------------------------------

const ambientLight = new THREE.AmbientLight(
  0x5275c9,
  1.5
);

scene.add(ambientLight);

const pointLight = new THREE.PointLight(
  0x35aaff,
  80,
  30
);

pointLight.position.set(2, 3, 5);
scene.add(pointLight);

// --------------------------------------------------
// Molecule creation
// --------------------------------------------------

const moleculeGroup = new THREE.Group();

scene.add(moleculeGroup);

const atomGeometry = new THREE.SphereGeometry(
  0.25,
  32,
  32
);

const atomMaterial = new THREE.MeshStandardMaterial({
  color: 0x168dff,
  emissive: 0x087dff,
  emissiveIntensity: 2.5,
  roughness: 0.3,
  metalness: 0.1
});

const bondMaterial = new THREE.MeshStandardMaterial({
  color: 0x1559aa,
  emissive: 0x063e8e,
  emissiveIntensity: 1.2
});

function addAtom(position, scale = 1) {

  const atom = new THREE.Mesh(
    atomGeometry,
    atomMaterial
  );

  atom.position.copy(position);
  atom.scale.setScalar(scale);

  moleculeGroup.add(atom);

  return atom;
}

function addBond(a, b) {

  const direction = new THREE.Vector3()
    .subVectors(b.position, a.position);

  const length = direction.length();

  const geometry = new THREE.CylinderGeometry(
    0.055,
    0.055,
    length,
    12
  );

  const bond = new THREE.Mesh(
    geometry,
    bondMaterial
  );

  bond.position.copy(a.position)
    .add(b.position)
    .multiplyScalar(0.5);

  bond.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  moleculeGroup.add(bond);
}

// Molecule A
const a1 = addAtom(new THREE.Vector3(-1, 0, 0), 1.3);
const a2 = addAtom(new THREE.Vector3(0, 0.8, 0), 0.8);
const a3 = addAtom(new THREE.Vector3(1, 0, 0), 1.1);
const a4 = addAtom(new THREE.Vector3(0, -0.8, 0), 0.8);

addBond(a1, a2);
addBond(a2, a3);
addBond(a3, a4);
addBond(a4, a1);
addBond(a1, a3);

// Weitere Moleküle
function createSmallMolecule(x, y, z, scale) {

  const group = new THREE.Group();

  group.position.set(x, y, z);
  group.scale.setScalar(scale);

  scene.add(group);

  const positions = [
    new THREE.Vector3(-0.5, 0, 0),
    new THREE.Vector3(0.5, 0.3, 0),
    new THREE.Vector3(0.8, -0.5, 0)
  ];

  const atoms = positions.map(position => {

    const atom = new THREE.Mesh(
      atomGeometry,
      atomMaterial
    );

    atom.position.copy(position);
    group.add(atom);

    return atom;
  });

  function createConnection(a, b) {

    const direction = new THREE.Vector3()
      .subVectors(b.position, a.position);

    const bond = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.05,
        0.05,
        direction.length(),
        10
      ),
      bondMaterial
    );

    bond.position.copy(a.position)
      .add(b.position)
      .multiplyScalar(0.5);

    bond.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );

    group.add(bond);
  }

  createConnection(atoms[0], atoms[1]);
  createConnection(atoms[1], atoms[2]);
  createConnection(atoms[2], atoms[0]);

  return group;
}

const molecule2 = createSmallMolecule(
  -3, 1.5, -3, 0.8
);

const molecule3 = createSmallMolecule(
  3, -1, -5, 1.2
);

const molecule4 = createSmallMolecule(
  -2, -2, 3, 1.5
);

// --------------------------------------------------
// Render Pipeline
// --------------------------------------------------

const renderPipeline = new THREE.RenderPipeline(
  renderer
);

const scenePass = pass(scene, camera);

const colorNode = scenePass.getTextureNode('output');
const viewZNode = scenePass.getViewZNode();

const bokeh = artisticBokeh(
  colorNode,
  viewZNode,
  {
    focusDistance: 50,
    focusRange: 0.001,
    maxBlur: .025,
    samples: 24,
    highlightBoost: 4.0
  }
);

renderPipeline.outputNode = bokeh.node;

// --------------------------------------------------
// Animation
// --------------------------------------------------

function animate() {

  requestAnimationFrame(animate);

  moleculeGroup.rotation.y += 0.002;
  moleculeGroup.rotation.x += 0.001;

  molecule2.rotation.y -= 0.003;
  molecule3.rotation.x += 0.002;
  molecule4.rotation.y += 0.002;

  renderPipeline.render();
}

animate();

// --------------------------------------------------
// Resize
// --------------------------------------------------

window.addEventListener('resize', () => {

  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
});
