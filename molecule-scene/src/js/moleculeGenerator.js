
import * as THREE from 'three';

// --------------------------------------------------
// Atom configuration
// --------------------------------------------------

const ELEMENTS = {
    H: {
        color: 0xc8eaff,
        emissive: 0x579bd9,
        radius: 0.22
    },
    C: {
        color: 0x168dff,
        emissive: 0x087dff,
        radius: 0.35
    },
    O: {
        color: 0xff455f,
        emissive: 0xff183d,
        radius: 0.38
    },
    N: {
        color: 0x426bff,
        emissive: 0x253cff,
        radius: 0.34
    },
    S: {
        color: 0xffd34e,
        emissive: 0xffa600,
        radius: 0.42
    },
    P: {
        color: 0xff8a36,
        emissive: 0xff5410,
        radius: 0.38
    }
};

// --------------------------------------------------
// Molecule generator
// --------------------------------------------------

export function createMolecule({
    atoms = [],
    bonds = [],
    scale = 1,
    atomScale = 1,
    bondRadius = 0.065,
    glow = 2.5
} = {}) {

    const molecule = new THREE.Group();

    molecule.name = 'Molecule';

    // Shared geometries
    const sphereGeometry = new THREE.SphereGeometry(
        1, 32, 32
    );


    const cylinderGeometry = new THREE.CylinderGeometry(
        1, 1, 1, 12
    );

    // Materials are cached per element
    const materials = {};

   function getMaterial(element) {

    if (!materials[element]) {

        const config = ELEMENTS[element] || ELEMENTS.C;

        materials[element] = new THREE.MeshPhysicalMaterial({
            color: 0x318cff,

            emissive: 0x0a3d85,
            emissiveIntensity: 1,

            roughness: 0.15,
            metalness: 0.0,

            transparent: true,
            opacity: 0.5,

            transmission: 0.25,
            thickness: 0.5,

            depthWrite: false
        });
    }

    return materials[element];
}

    // --------------------------------------------------
    // Create atoms
    // --------------------------------------------------

    const atomMeshes = [];

    atoms.forEach((atom, index) => {

        const config = ELEMENTS[atom.element] || ELEMENTS.C;

        const radius = (atom.radius ?? config.radius) * atomScale;

        const mesh = new THREE.Mesh(
            sphereGeometry,
            getMaterial(atom.element)
        );

        mesh.position.set(
            atom.position[0],
            atom.position[1],
            atom.position[2]
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.scale.setScalar(radius);

        mesh.name = `Atom_${atom.element}_${index}`;

        mesh.userData = {
            element: atom.element,
            atomIndex: index
        };

       

        molecule.add(mesh);

        atomMeshes.push(mesh);
    });

    // --------------------------------------------------
    // Create bonds
    // --------------------------------------------------

    function createBond(start, end, radius) {

        const direction = new THREE.Vector3()
            .subVectors(end, start);

        const length = direction.length();

        if (length === 0) return;

        const mesh = new THREE.Mesh(
            cylinderGeometry,
            new THREE.MeshPhysicalMaterial({
                color: 0x318cff,

            emissive: 0x0a3d85,
            emissiveIntensity: 1,

            roughness: 0.15,
            metalness: 0.0,

            transparent: true,
            opacity: 0.5,

            transmission: 0.25,
            thickness: 0.5,

            depthWrite: true
            })
        );

        mesh.position.copy(start)
            .add(end)
            .multiplyScalar(0.5);

        mesh.scale.set(
            radius,
            length,
            radius
        );

         mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        molecule.add(mesh);

        return mesh;
    }

    bonds.forEach((bond) => {

        const atomA = atomMeshes[bond.from];
        const atomB = atomMeshes[bond.to];

        if (!atomA || !atomB) return;

        const start = atomA.position;
        const end = atomB.position;

        const order = bond.order || 1;

        // Direction of the bond
        const direction = new THREE.Vector3()
            .subVectors(end, start)
            .normalize();

        // Perpendicular offset for multiple bonds
        const reference = Math.abs(direction.y) < 0.9
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(1, 0, 0);

        const perpendicular = new THREE.Vector3()
            .crossVectors(direction, reference)
            .normalize();

        const offset = bondRadius * 1.5;

        for (let i = 0; i < order; i++) {

            let displacement = 0;

            if (order === 2) {
                displacement = i === 0 ? -offset / 2 : offset / 2;
            }

            if (order === 3) {
                displacement = (i - 1) * offset;
            }

            const startOffset = start.clone()
                .addScaledVector(perpendicular, displacement);

            const endOffset = end.clone()
                .addScaledVector(perpendicular, displacement);

            createBond(
                startOffset,
                endOffset,
                bond.radius || bondRadius
            );
        }
    });

    molecule.scale.setScalar(scale);

    molecule.userData.atomCount = atoms.length;
    molecule.userData.bondCount = bonds.length;

    return molecule;
}
