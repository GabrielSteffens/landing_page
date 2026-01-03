import * as THREE from 'three';

export class UpgradePad {
    constructor(x, y, label, cost, scene, onBuy) {
        this.x = x;
        this.y = y;
        this.width = 120;
        this.height = 120;
        this.cost = cost;
        this.label = label;
        this.onBuy = onBuy;
        this.scene = scene;

        // Group
        this.group = new THREE.Group();
        this.group.position.set(x, 1, y);
        scene.add(this.group);
        this.cooldown = 0;

        // Visual: Upgrade Workbench (Sprite) - High Quality with Transparency
        const map = new THREE.CanvasTexture(document.createElement('canvas')); // Placeholder
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.NearestFilter; // Sharpness

        const img = new Image();
        img.src = `assets/textures/upgrade_bench.png?t=${Date.now()}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Remove White Background
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Check if White (or very close)
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0; // Alpha 0
                }
            }
            ctx.putImageData(imgData, 0, 0);
            map.image = canvas;
            map.needsUpdate = true;
        };

        const mat = new THREE.SpriteMaterial({ map: map });
        const mesh = new THREE.Sprite(mat);
        mesh.scale.set(90, 90, 1); // Increased from 60
        mesh.position.y = 30; // Raised to sit better (center is at 30, height is 90/2 = 45... wait center is 0.5,0.5. So 45 is half. position 45 puts bottom at 0)
        // actually let's just make it bigger.
        this.group.add(mesh);



        // Ground Podium Removed as per user request
        // Just Sprite and Shadow remain
        // Shadow
        // Text Canvas (Price - Floating above)
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;
        this.canvas.height = 1024;
        this.ctx = this.canvas.getContext('2d');
        this.updateTexture();

        const tex = new THREE.CanvasTexture(this.canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter; // Sharp Text
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        const textSprite = new THREE.Sprite(spriteMat);
        textSprite.position.y = 80; // Higher up
        textSprite.scale.set(60, 60, 1);
        this.group.add(textSprite);
    }

    updateTexture() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 1024, 1024);

        // Background for text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        // Scale coords by 4 (256 -> 1024)
        // 10, 80, 236, 100, 20  ->  40, 320, 944, 400, 80
        ctx.roundRect(40, 320, 944, 400, 80);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 160px Arial'; // 40 * 4
        ctx.textAlign = 'center';
        ctx.fillText(this.label, 512, 480); // 128*4, 120*4

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 200px Arial'; // 50 * 4
        ctx.fillText(`${this.cost} $`, 512, 680); // 128*4, 170*4
    }

    updateCost(newCost) {
        this.cost = newCost;
        this.canvas.getContext('2d').clearRect(0, 0, 1024, 1024); // Force clear

        // Find the sprite with CanvasTexture (it's the last one added usually, or filter)
        const textSprite = this.group.children.find(c => c.isSprite && c.material.map && c.material.map.isCanvasTexture);
        if (textSprite) {
            this.updateTexture();
            textSprite.material.map.needsUpdate = true;
        }
    }

    checkCollision(player, economy) {
        // Simple AABB
        if (player.x > this.x - this.width / 2 &&
            player.x < this.x + this.width / 2 &&
            player.y > this.y - this.height / 2 &&
            player.y < this.y + this.height / 2) {

            // Try buy
            if (economy.coins >= this.cost) {
                // Add debounce to prevent instant rapid buying?
                if (this.cooldown && this.cooldown > 0) return false;

                if (this.onBuy(this.cost)) {
                    // Cost Scaling
                    const newCost = Math.floor(this.cost * 1.5);
                    this.updateCost(newCost);

                    // Cooldown to prevent accidental double buy
                    this.cooldown = 1.0;
                    return true;
                }
            }
        }
        if (this.cooldown > 0) this.cooldown -= 0.016; // Approx dt
        return false;
    }
}
