import * as THREE from 'three';

export class ConveyorBelt {
    constructor(path, scene) {
        this.scene = scene;
        this.meshes = [];

        const texLoader = new THREE.TextureLoader();
        const texture = texLoader.load('assets/textures/path.png');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;

        // Loop through segments
        for (let i = 0; i < path.length - 1; i++) {
            const start = path[i];
            const end = path[i + 1];

            // Calculate length and angle
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);

            // Clone texture for independent tiling
            const t = texture.clone();
            t.needsUpdate = true;
            t.repeat.set(length / 32, 1); // 32px per tile

            const material = new THREE.MeshStandardMaterial({
                map: t,
                roughness: 1,
                bumpScale: 0.5
            });

            // Adjust geometry length slightly to avoid gaps? Or overlap?
            // Let's use exact length + small overlap
            // Use Plane for flat road (Aesthetic only)
            const geo = new THREE.PlaneGeometry(length + 2, 30);
            const mesh = new THREE.Mesh(geo, material);

            mesh.rotation.x = -Math.PI / 2; // Lay flat on ground
            mesh.rotation.y = -angle; // Rotate to face direction (applied after X rot? No, Euler order is XYZ usually)
            // Wait, if I set rotation.x and rotation.y...
            // ThreeJS Default Order is XYZ.
            // X rotates (Up) -> Flat. Local Z points Up (World Y). Local Y points Back (World -Z).
            // Y rotates around World Y (because Local Z is up... wait).
            // Actually, simpler: mesh.rotation.set(-Math.PI/2, 0, -angle); -> Orbit controls style.
            // Let's verify rotation order:
            // BoxGeometry is easy.
            // Plane:
            // Just use BoxGeometry with height 0.1?
            // Yes, BoxGeometry(length, 0.1, 30) is much safer and guarantees logic matches previous box code.

            const boxGeo = new THREE.BoxGeometry(length + 2, 0.2, 30); // Very flat box
            const flatMesh = new THREE.Mesh(boxGeo, material);

            flatMesh.position.x = start.x + dx / 2;
            flatMesh.position.y = 0.2; // Slightly above ground (0)
            flatMesh.position.z = start.y + dy / 2;

            flatMesh.rotation.y = -angle;

            this.scene.add(flatMesh);
            this.meshes.push(flatMesh);
        }
    }
}
