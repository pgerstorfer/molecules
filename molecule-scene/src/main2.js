import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { cubeTexture, positionWorld, oscSine, time, pass, uniform } from 'three/tsl';
import { createMolecule } from './js/moleculeGenerator.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';

// let renderPipeline;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101820);

// const camera = new THREE.PerspectiveCamera(
// 	25,
// 	window.innerWidth / window.innerHeight,
// 	0.1,
// 	100,
// );
// camera.position.set(0, 0, 5);
let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera( 70, width / height, 0.5, 50 );
camera.position.z = -10;


scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 0));
const keyLight = new THREE.DirectionalLight(0xffffff, 1);
keyLight.position.set(3, 4, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;  
keyLight.shadow.camera.far = 100;
scene.add(keyLight);

const sphere = new THREE.Mesh(
	new THREE.SphereGeometry(1, 48, 32),
	new THREE.MeshPhysicalMaterial({ color: 0x44aaff, roughness: 1, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 }),
);
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add(sphere);

// const geometry = new THREE.SphereGeometry( 60, 20, 10 );
// 				const material = new THREE.MeshBasicNodeMaterial();
// 				material.colorNode = cubeTextureNode.mul( oscPos );

// Mehrere Moleküle zufällig hinzufügen

const molecules = [];

for (let i = 0; i < 100; i++) {

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

        scale: 0.5 + Math.random() * 0.8,
        glow: 2.5
    });

    molecule.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 30
    );

    molecule.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );

    scene.add(molecule);

    molecules.push(molecule);
}



// Renderer

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop( animate );
renderer.toneMapping = THREE.ACESFilmicToneMapping

renderer.outputColorSpace = THREE.SRGBColorSpace;   
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;

await renderer.init();

// Controls

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.001;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.maxDistance = 25;  

const effectController = {
					focusDistance: uniform( 9.5 ),
					focalLength: uniform( 2.5 ),
					bokehScale: uniform( 13.5 ),

                    bloomStrength: uniform( 2.2 ),
                    bloomRadius: uniform( 0.5 ),
                    bloomThreshold: uniform( 0.02 ),

                    filmIntensity: uniform( 1.5 ),

                    exposure: 0.7

				};


renderer.toneMappingExposure = effectController.exposure;
                

const gui = new GUI();

               
const dofFolder = gui.addFolder('Depth of Field');
dofFolder.add(effectController.focusDistance, 'value', 0, 20, 0.001)
  .name('Focus Distance');
dofFolder.add(effectController.focalLength, 'value', 1, 10, 0.01)
  .name('Focal Length');
dofFolder.add(effectController.bokehScale, 'value', 0, 20, 0.01)
  .name('Bokeh Scale');

const bloomFolder = gui.addFolder('Bloom');
bloomFolder.add(effectController.bloomStrength, 'value', 0, 10, 0.01)
  .name('Bloom Strength');
bloomFolder.add(effectController.bloomRadius, 'value', 0, 1, 0.01)
  .name('Bloom Radius');
bloomFolder.add(effectController.bloomThreshold, 'value', 0.001, 0.1, 0.001)
  .name('Bloom Threshold'); 

const filmFolder = gui.addFolder('Film');
filmFolder.add(effectController.filmIntensity, 'value', 0, 5, 0.01)
  .name('Film Intensity');

  const colorFolder = gui.addFolder('Color');
colorFolder.add(renderer, 'toneMappingExposure', 0, 2, 0.01)
  .name('Exposure');


// Post Processing



const renderPipeline = new THREE.RenderPipeline( renderer );


const scenePass = pass( scene, camera );

const scenePassColor = scenePass.getTextureNode().toInspector( 'Color' );
const scenePassViewZ = scenePass.getViewZNode();

const dofPass = dof( scenePassColor, scenePassViewZ, effectController.focusDistance, effectController.focalLength, effectController.bokehScale );

const bloomPass = bloom( dofPass, effectController.bloomStrength, effectController.bloomRadius, effectController.bloomThreshold );

const colorWithBloom = dofPass.add(bloomPass);
const filmPass = film(colorWithBloom, effectController.filmIntensity);

renderPipeline.outputNode = filmPass;


function animate() {

				controls.update();

				renderPipeline.render();

                molecules.forEach((molecule, i) => {
        molecule.rotation.y += 0.001 + i * 0.0001;
		
    });

			}


window.addEventListener('resize', () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});
