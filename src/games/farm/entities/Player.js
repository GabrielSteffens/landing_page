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
        this.maxCapacity = Infinity; // No limit
        this.walkTimer = 0;
        this.wobbleTimer = 0; // For animation

        // Sprite Setup (Pixel Art)
        const texLoader = new THREE.TextureLoader();
        const map = texLoader.load('/farm_assets/textures/farmer.png');
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.NearestFilter;

        const material = new THREE.SpriteMaterial({ map: map });
        material.depthTest = false; // Always render on top (Foreground)
        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(60, 60, 1); // Adjust size to match world scale
        this.mesh.center.set(0.5, 0); // Pivot at bottom center (feet)
        this.mesh.renderOrder = 999; // Ensure drawn on top of ground
        this.mesh.frustumCulled = false; // Prevent disappearance on edges/neg coords

        this.mesh.position.set(x, 2.5, y); // Raised to 2.5 to be above Roads (0.5) and Shadows (1.0)
        scene.add(this.mesh);

        // Shadow Blob (Simple Circle under sprite)
        const shadowGeo = new THREE.CircleGeometry(12, 16);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 1.1; // Slightly above ground objects
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

    update(dt, input, bounds, obstacles = []) {
        let dx = 0;
        let dz = 0;

        if (input.keys['ArrowUp'] || input.keys['w']) dz -= 1;
        if (input.keys['ArrowDown'] || input.keys['s']) dz += 1;
        if (input.keys['ArrowLeft'] || input.keys['a']) dx -= 1;
        if (input.keys['ArrowRight'] || input.keys['d']) dx += 1;

        // Joystick Input
        if (input.joystick && input.joystick.active) {
            dx += input.joystick.delta.x;
            dz += input.joystick.delta.y;
        }

        if (dx !== 0 || dz !== 0) {
            const length = Math.sqrt(dx * dx + dz * dz);
            // Only normalize if length > 1 (to allow slow movement with joystick)
            if (length > 1) {
                dx /= length;
                dz /= length;
            }
        }

        // --- COLLISION LOGIC ---
        // Try move X
        const nextX = this.x + dx * this.speed * dt;
        if (!this.checkCollision(nextX, this.y, obstacles)) {
            this.x = nextX;
        }

        // Try move Z (Y in 2D logic)
        const nextY = this.y + dz * this.speed * dt;
        if (!this.checkCollision(this.x, nextY, obstacles)) {
            this.y = nextY;
        }

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

        // --- PROCEDURAL ANIMATION (WADDLE) ---
        if (dx !== 0 || dz !== 0) {
            this.wobbleTimer += dt * 15; // Speed of waddle

            // Waddle (Rotate Z)
            this.mesh.material.rotation = Math.sin(this.wobbleTimer) * 0.2; // +/- 0.2 rad tilt

            // Bob (Bounce Y)
            // Base Y is 2.5. Bounce adds up to 1.0
            const bob = Math.abs(Math.sin(this.wobbleTimer * 2)) * 1.5;
            this.mesh.position.y = 2.5 + bob;
        } else {
            // Reset when stopped
            this.mesh.material.rotation = 0;
            this.mesh.position.y = 2.5;
            this.wobbleTimer = 0;
        }

        // --- STACK VISUALS ---
        this.updateStack(dt, dx !== 0 || dz !== 0);
    }

    checkCollision(x, y, obstacles) {
        const half = 10; // Hitbox radius (smaller than visual)
        for (const obs of obstacles) {
            // AABB Check
            // Player Box: [x-half, x+half] x [y-half, y+half]
            // Obs Box: [obs.x, obs.x + obs.w] x [obs.y, obs.y + obs.h]
            if (x + half > obs.x && x - half < obs.x + obs.w &&
                y + half > obs.y && y - half < obs.y + obs.h) {
                return true;
            }
        }
        return false;
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
