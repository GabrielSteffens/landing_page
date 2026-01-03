import * as THREE from 'three';

export class SellWorkbench {
    constructor(x, y, scene) {
        this.x = x;
        this.y = y;
        this.width = 60; // Size of interaction area
        this.height = 60;
        this.scene = scene;

        // Visual Sprite - The Shop (Chest)
        const texLoader = new THREE.TextureLoader();
        const map = texLoader.load('assets/textures/chest.png');
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.NearestFilter;
        const material = new THREE.SpriteMaterial({ map: map });
        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(60, 60, 1); // Chest Size
        this.mesh.center.set(0.5, 0.2); // Anchor
        this.mesh.position.set(x, 15, y); // Raised slightly

        // Add shadow
        const shadowGeo = new THREE.CircleGeometry(25, 16);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.set(x, 1, y);

        scene.add(this.shadow);
        scene.add(this.mesh);
    }

    update(dt) {
        // bobbing or static? Static is fine for a table.
    }

    checkCollision(player, economy) {
        // Simple AABB or Distance check
        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        // Interaction radius (Aggressively Increased)
        if (dist < 150) {
            if (player.holdingMeat > 0) {
                // Sell everything
                economy.sellMeat(player.heldValue);
                player.holdingMeat = 0;
                player.heldValue = 0;
                economy.meat = 0; // Sync UI
                economy.updateUI();

                console.log("Sold items! Value:", economy.money);

                // Visual Feedback: Flash the bench? or Player?
                // Simple scale bump
                this.mesh.scale.set(70, 70, 1);
                setTimeout(() => this.mesh.scale.set(60, 60, 1), 200);
            }
        }
    }
}
