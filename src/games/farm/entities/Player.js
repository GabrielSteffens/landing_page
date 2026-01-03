import * as THREE from 'three';
import { SpriteAnimator } from '../systems/SpriteAnimator.js';

export class Player {
    constructor(x, y, scene, assetManager) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 200;
        this.holdingMeat = 0;
        this.heldValue = 0;
        this.maxCapacity = Infinity; // No limit
        this.walkTimer = 0;

        // Sprite Setup (Pixel Art)
        const texLoader = new THREE.TextureLoader();
        const map = texLoader.load('/farm_assets/textures/farmer.png');
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.NearestFilter;

        const material = new THREE.SpriteMaterial({ map: map });
        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(60, 60, 1); // Adjust size to match world scale
        this.mesh.center.set(0.5, 0); // Pivot at bottom center (feet)
        this.mesh.renderOrder = 999; // Ensure drawn on top of ground
        this.mesh.frustumCulled = false; // Prevent disappearance on edges/neg coords

        this.mesh.position.set(x, 0.1, y); // Slightly above 0 to prevent z-fight
        scene.add(this.mesh);

        // Shadow Blob (Simple Circle under sprite)
        const shadowGeo = new THREE.CircleGeometry(12, 16);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 1;
        scene.add(this.shadow);

        // Helper for stack (Adjust position for sprite)
        this.stackItems = [];
        this.stackGroup = new THREE.Group();
        this.stackGroup.position.set(0, 35, 0); // Above head
        scene.add(this.stackGroup); // Stack needs to be in scene to not rotate with billboard? 
        // Actually, if we add to mesh (Sprite), it will carry the stack.
        // But Sprite rotates to face camera. We arguably want stack to be "3D" or also Billboard?
        // Let's attach to scene and update position manually for now to avoid billboard rotation issues.
    }

    update(dt, input, bounds) {
        let dx = 0;
        let dz = 0;

        if (input.keys['ArrowUp'] || input.keys['w']) dz -= 1;
        if (input.keys['ArrowDown'] || input.keys['s']) dz += 1;
        if (input.keys['ArrowLeft'] || input.keys['a']) dx -= 1;
        if (input.keys['ArrowRight'] || input.keys['d']) dx += 1;

        if (dx !== 0 || dz !== 0) {
            const length = Math.sqrt(dx * dx + dz * dz);
            dx /= length;
            dz /= length;
        }

        this.x += dx * this.speed * dt;
        this.y += dz * this.speed * dt;

        // Infinite Map: No bounds clamping!
        // this.x = Math.max(0, Math.min(bounds.width - this.width, this.x));
        // this.y = Math.max(0, Math.min(bounds.height - this.height, this.y));

        this.mesh.position.x = this.x;
        this.mesh.position.z = this.y;

        // Sync Shadow & Stack
        if (this.shadow) {
            this.shadow.position.x = this.x;
            this.shadow.position.z = this.y;
        }
        if (this.stackGroup) {
            this.stackGroup.position.x = this.x;
            this.stackGroup.position.z = this.y; // + offset if needed, but we set y=35 in constructor
        }

        // Rotation (Flip Sprite if moving left/right?)
        // Rotation (Flip Sprite if moving left/right?)
        if (dx !== 0) {
            // Flip using Negative Scale (Works for centered sprites)
            if (dx < 0) this.mesh.scale.x = -60;
            else this.mesh.scale.x = 60;
        }

        if (dx !== 0 || dz !== 0) {
            // No Bob - Keep flat on ground to prevent flying/disappearing
            this.mesh.position.y = 0.1;
        } else {
            this.mesh.position.y = 0.1;
        }

        // --- STACK VISUALS ---
        this.updateStack(dt, dx !== 0 || dz !== 0);
    }

    updateStack(dt, isMoving) {
        // 1. Sync Count
        const currentCount = this.holdingMeat; // Or calculate from value if we prefer visualization by value

        if (this.stackItems.length < currentCount) {
            // Add items
            const needed = currentCount - this.stackItems.length;
            // Parent is scaled 30x, so we use small values
            const meatGeo = new THREE.BoxGeometry(0.3, 0.15, 0.4);
            const meatMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b }); // Meat Red
            const boneGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
            const boneMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); // Bone White

            for (let i = 0; i < needed; i++) {
                const group = new THREE.Group();
                const meat = new THREE.Mesh(meatGeo, meatMat);
                const bone = new THREE.Mesh(boneGeo, boneMat);
                bone.position.z = 0.2; // Stick out
                group.add(meat);
                group.add(bone);

                group.castShadow = true;

                // Stack vertically (small increment)
                const yPos = this.stackItems.length * 0.2;
                group.position.set(0, yPos, 0);

                this.stackGroup.add(group);
                this.stackItems.push(group);
            }
        } else if (this.stackItems.length > currentCount) {
            // Remove items
            while (this.stackItems.length > currentCount) {
                const item = this.stackItems.pop();
                this.stackGroup.remove(item);
            }
        }

        // 2. Animate Wobble (Lag effect)
        // Simple spring-like lag
        this.stackItems.forEach((item, index) => {
            // Higher items wobble more
            const intensity = (index + 1) * 0.05;

            // Target rotation based on player movement
            // If moving, stack leans back slightly? Or sways L/R

            if (isMoving) {
                // Waddle lag
                const targetZ = Math.sin(this.walkTimer - index * 0.5) * 0.1 * (index * 0.5);
                // Simple lerp (manual since no physics engine)
                item.rotation.z += (targetZ - item.rotation.z) * dt * 5;
            } else {
                // Return to 0
                item.rotation.z += (0 - item.rotation.z) * dt * 5;
            }
        });
    }
}
