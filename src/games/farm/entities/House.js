import * as THREE from 'three';

export class House {
    constructor(x, y, scene) {
        this.x = x;
        this.y = y;
        this.scene = scene;

        const texLoader = new THREE.TextureLoader();
        const map = texLoader.load('/farm_assets/textures/house.png');
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.NearestFilter;

        const material = new THREE.SpriteMaterial({ map: map });
        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(300, 300, 1);
        this.mesh.center.set(0.5, 0.1); // Bottom anchor
        this.mesh.position.set(x, 15, y);

        scene.add(this.mesh);

        // Shadow
        const shadowGeo = new THREE.CircleGeometry(80, 16);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(x, 1, y);
        scene.add(shadow);
    }
}
