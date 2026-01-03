import * as THREE from 'three';

export class Resource {
    constructor(x, y, value, scene, target = null) {
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 15;
        this.value = value;
        this.collected = false;
        this.scene = scene;
        this.target = target;
        this.speed = 100; // Speed of conveyor
        this.path = [];

        const geometry = new THREE.BoxGeometry(10, 10, 10);
        const material = new THREE.MeshStandardMaterial({ color: 0xff6b6b }); // Meat
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, 5, y);
        scene.add(this.mesh);
    }

    setPath(path) {
        this.path = [...path];
        if (this.path.length > 0) {
            this.target = this.path.shift();
        }
    }

    update(dt) {
        this.mesh.rotation.y += dt;
        this.mesh.position.y = 5 + Math.sin(Date.now() / 200) * 2;

        if (this.target) {
            // Move towards target
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 5) {
                const moveDist = this.speed * dt;
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * moveDist;
                this.y += Math.sin(angle) * moveDist;

                this.mesh.position.x = this.x;
                this.mesh.position.z = this.y;
            } else {
                // Reached waypoint
                if (this.path && this.path.length > 0) {
                    this.target = this.path.shift(); // Next waypoint
                } else {
                    // Reached end of path (presumably workbench)
                    // Keep target as is? Or clear it? 
                    // If we clear it, it stops moving.
                    // The game loop checks distance to workbench to collect/sell it.
                }
            }
        }
    }

    destroy() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
    }

    render(ctx) {
        // No-op for 3D
    }
}
