import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PostProcessing, WebGPURenderer } from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';
import { uniform, float } from 'three/tsl';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import {
  artisticBokeh
} from './shaders/ArtisticBokeh.js';
import {
    abs,
    clamp,
    vec4
} from 'three/tsl';
import { createMolecule } from './js/moleculeGenerator.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';




const scene = new THREE.Scene();

// Background Gradient

const gradientCanvas = document.createElement('canvas');
gradientCanvas.width = 256;
gradientCanvas.height = 256;

const gradientContext = gradientCanvas.getContext('2d');
const gradient = gradientContext.createLinearGradient(0, 0, 0, gradientCanvas.height);

// const gradient = gradientContext.createRadialGradient(
//     128, 128, 20, // inner circle: x, y, radius
//     256, 256, 256 // outer circle: x, y, radius
// );

gradient.addColorStop(0, '#202530');
gradient.addColorStop(1, '#020815');

gradientContext.fillStyle = gradient;
gradientContext.fillRect(0, 0, gradientCanvas.width, gradientCanvas.height);

const gradientTexture = new THREE.CanvasTexture(gradientCanvas);
gradientTexture.colorSpace = THREE.SRGBColorSpace;


scene.background = gradientTexture;
scene.background = new THREE.Color('#011b35'); 


// Camera

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    50,
);
camera.position.set(30, 20, 50);

const renderer = new WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.sRGBToneMapping;
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

const boxSize = 10;
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(boxSize, boxSize, boxSize),
    new THREE.MeshStandardMaterial({
        color: 0x4f8cff,
        emissive: 0x1f44aa,
        emissiveIntensity: 0,
        roughness: 0.4,
    }),
);
cube.position.set(.5, .1, -5);
// scene.add(cube);



// Lights

scene.add(new THREE.AmbientLight(0xffffff, 0));
const light = new THREE.PointLight(0xffffff, 1);
light.position.set(100, 100, -100);
scene.add(light);




// OrbitControls

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = -0.3;

// Window Resize

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// obj loader 
const objLoader = new OBJLoader();
objLoader.load('./assets/DNA.obj', (dna) => {
    scene.add(dna);
});


// Water Molecule

const waterTest = createMolecule({

    atoms: [
        { element: 'O', position: [0, 0, 0] },
        { element: 'H', position: [-0.8, 0.6, 0] },
        { element: 'H', position: [0.8, 0.6, 0] }
    ],

    bonds: [
        { from: 0, to: 1 },
        { from: 0, to: 2 }
    ],

    scale: 10,
    glow: 2.5
});

waterTest.position.set(0, 0, 0);

// scene.add(waterTest);

// Mehrere Moleküle zufällig hinzufügen

const molecules = [];

for (let i = 0; i < 50; i++) {

    const molecule = createMolecule({
        atoms: [
            { element: 'C', position: [0, 0, 0] },
            { element: 'O', position: [1, 0, 0] },
            { element: 'H', position: [-0.8, 0.5, 0] }
        ],

        bonds: [
            { from: 0, to: 1, order: 2 },
            { from: 0, to: 2 }
        ],

        scale: 10 + Math.random() * 0.8,
        glow: 2.5
    });

    molecule.position.set(
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 150
    );

    molecule.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );

    scene.add(molecule);

    molecules.push(molecule);
}



// Animation Loop

await renderer.init();

// Post Processing

const postProcessing = new PostProcessing(renderer);
const scenePass = pass(scene, camera);
const sceneColor = scenePass.getTextureNode('output');
const bloomPass = bloom(sceneColor, 
	5, // strength
	1, // radius
	0.01 // threshold
);

const scenePassColor = scenePass.getTextureNode().toInspector( 'Color' );
const scenePassViewZ = scenePass.getViewZNode();

const focusDistance = uniform(1000);
const focalLength = uniform(200);
const bokehScale = uniform(5);

// const dofPass = dof(
// 	scenePassColor,
// 	scenePassViewZ,
// 	focusDistance,
// 	focalLength,
// 	bokehScale
// );

const dofPass = dof(
 	scenePassColor,
	scenePassViewZ,
	200.0,  // Fokusdistanz
    660,	   // focalLength
    30.0   // bokehScale
);

const filmIntensity = uniform(1.1);
const filmPass = film(scenePass, filmIntensity);

const colorNode = scenePass.getTextureNode('output');
const viewZNode = scenePass.getViewZNode();
const bokeh = artisticBokeh(
  colorNode,
  viewZNode,
  {
	  focusDistance: 2,
    focusRange: 10,
    maxBlur: 60,
    samples: 24,
    highlightBoost: 4.0
  }
);

postProcessing.outputNode = sceneColor.add(dofPass).add(bloomPass).add(filmPass);


filmIntensity.value = 5;



// const debugDepth = abs(viewZNode);

// const normalizedDepth = clamp(
//     debugDepth.div(200.0),
//     0.0,
//     1.0
// );

// postProcessing.outputNode = vec4(
//     normalizedDepth,
//     normalizedDepth,
//     normalizedDepth,
//     1.0
// );


renderer.setAnimationLoop(() => {

	

    controls.update();
    postProcessing.render();

	waterTest.rotation.x += 0.003;
    waterTest.rotation.y += 0.006;

	molecules.forEach((molecule, i) => {
        molecule.rotation.y += 0.001 + i * 0.0001;
		
    });

	
});





