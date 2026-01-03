import * as THREE from 'three';
import { Player } from './entities/Player.js';
import { Spike } from './entities/Spike.js';
import { Lever } from './entities/Lever.js';
import { Animal } from './entities/Animal.js';
import { Resource } from './entities/Resource.js';
import { Economy } from './systems/Economy.js';
import { AssetManager } from './systems/AssetManager.js';
import { UpgradePad } from './entities/UpgradePad.js';
import { SellWorkbench } from './entities/SellWorkbench.js';
import { MapSystem } from './systems/MapSystem.js';
import { ConveyorBelt } from './entities/ConveyorBelt.js';
import { House } from './entities/House.js';
import { Road } from './entities/Road.js';
import { VirtualJoystick } from './systems/VirtualJoystick.js';
import { SaveSystem } from './systems/SaveSystem.js';

export class Game {
    constructor(container) {
        console.log("GAME: Constructor Started");
        this.container = container;
        this.lastTime = 0;

        this.input = {
            keys: {},
            mouse: { x: 0, y: 0, down: false }
        };

        this.economy = new Economy();
        this.assets = new AssetManager();
        this.saveSystem = new SaveSystem(this);

        // Three.js Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2a2a2a);

        // Camera (Isometric-ish)
        const aspect = container.clientWidth / container.clientHeight;
        this.viewSize = 300; // Zoom Level (Smaller = Closer/Zoomed In)
        const d = this.viewSize;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);



        // Camera Position - Centered on the new grid
        // Center of Grid approx: X=600, Z=400
        this.camera.position.set(600, 400, 400 + 400);
        this.camera.lookAt(600, 0, 400);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.domElement.style.zIndex = '0';
        this.renderer.domElement.style.position = 'absolute'; // Force overlap handling
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';

        this.container.insertBefore(this.renderer.domElement, this.container.firstChild);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.dirLight.position.set(100, 200, 50);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.camera.left = -1000;
        this.dirLight.shadow.camera.right = 1000;
        this.dirLight.shadow.camera.top = 1000;
        this.dirLight.shadow.camera.bottom = -1000;
        this.scene.add(this.dirLight);

        // --- MAP SYSTEM ---
        this.mapSystem = new MapSystem(this.scene);

        this.setupInput();
        this.setupUI();
        window.addEventListener('resize', () => this.resize());

        // --- DEBUG COORDINATES ---
        this.debugDiv = document.createElement('div');
        this.debugDiv.style.position = 'absolute';
        this.debugDiv.style.top = '10px';
        this.debugDiv.style.right = '10px';
        this.debugDiv.style.color = 'yellow';
        this.debugDiv.style.fontFamily = 'monospace';
        this.debugDiv.style.fontSize = '16px';
        this.debugDiv.style.fontWeight = 'bold';
        this.debugDiv.style.pointerEvents = 'none';
        this.debugDiv.style.background = 'rgba(0, 0, 0, 0.5)';
        this.debugDiv.style.padding = '5px';
        document.body.appendChild(this.debugDiv);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.mouseWorld = new THREE.Vector3();

        window.addEventListener('mousemove', (event) => {
            // Calculate mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Raycast
            this.raycaster.setFromCamera(this.mouse, this.camera);

            if (this.raycaster.ray.intersectPlane(this.groundPlane, this.mouseWorld)) {
                // Show World Z as "Y" because code logic uses (x, y) mapped to (x, z)
                this.debugDiv.innerText = `X: ${Math.round(this.mouseWorld.x)}, Y: ${Math.round(this.mouseWorld.z)}`;
            }
        });

        this.player = new Player(100, 100, this.scene, this.assets);
        this.unlockedZones = 1; // Start with 1, but we layout all placeholders?
        // Let's unlock all 6 for this "Layout Demo" or keep progression?
        // Image shows full factory. Let's act as if layout is fixed.

        this.animals = [];
        this.resources = [];
        this.spawnTimer = 0;
        this.spawnRate = 3;

        // --- LAYOUT CONFIGURATION ---
        // Origin (0,0) is top-left.

        // 1. House (Top Left)
        this.house = new House(-100, -50, this.scene);

        // 2. Shop (Left, Vertical Center relative to rows)
        // Rows at Y=250 and Y=550. Center Y=400.
        this.sellWorkbench = new SellWorkbench(60, 400, this.scene);

        // 3. Roads (Visual Frame)
        this.staticRoads = [];
        // Top Road
        this.staticRoads.push(new Road([{ x: -120, y: 10 }, { x: 1200, y: 10 }], this.scene));
        // Left Road
        this.staticRoads.push(new Road([{ x: -150, y: -20 }, { x: -150, y: 1200 }], this.scene));
        // Bottom Road
        this.staticRoads.push(new Road([{ x: -150, y: 1170 }, { x: 1200, y: 1170 }], this.scene));



        // 4. Grid System (2 Rows x 3 Cols)
        this.spikes = [];
        this.pads = [];
        this.projectLevers = [];
        this.trapLevers = [];

        const ROWS = 2;
        const COLS = 3;
        const START_X = 250;
        const START_Y = 250;
        const GAP_X = 400;
        const ROW_GAP = 400;

        // Factory Helper (Class Method now)

        this.createZoneUpgrades = (index, animalType, zoneX, zoneY, isTopRow) => {
            // Upgrade Position:
            // Top Row: Above the Pen?
            // Bottom Row: Below the Pen? 
            // Image shows markers "Above" the chicken sprites in the top row.
            // Let's put them consistently ABOVE the pen for now.

            const upgradeY = zoneY - 80;

            const spikeKey = `spikes_${index}`;
            const spawnKey = `spawn_${index}`;
            const autoKey = `auto_${index}`;

            // Initialize Economy
            if (!this.economy.upgrades[spikeKey]) this.economy.upgrades[spikeKey] = 1;
            if (!this.economy.upgrades[spawnKey]) this.economy.upgrades[spawnKey] = 1;
            if (this.economy.upgrades[autoKey] === undefined) this.economy.upgrades[autoKey] = 0;

            // Compact Upgrade Station (Only 1 Combined or 3?)
            // Image shows "Plus" icon next to chicken. Maybe simplified?
            // We'll stick to our 3-upgrade levers but spread them tighter.

            // 1. Spawn (Left)
            this.createUpgradeStation(zoneX, upgradeY, `Spawn`, 25 + (index * 50), (price, station) => {
                if (this.economy.buyUpgrade(spawnKey, price)) {
                    station.pad.updateCost(Math.floor(price * 1.6));
                    return true;
                }
                return false;
            });

            // 2. Auto (Middle)
            this.createUpgradeStation(zoneX + 110, upgradeY, `Auto`, 100 + (index * 150), (price, station) => {
                if (this.economy.buyUpgrade(autoKey, price)) {
                    station.pad.updateCost(Math.floor(price * 2.0));
                    return true;
                }
                return false;
            });

            // 3. Spikes (Right)
            this.createUpgradeStation(zoneX + 220, upgradeY, `Dmg`, 10 + (index * 20), (price, station) => {
                if (this.economy.buyUpgrade(spikeKey, price)) {
                    station.pad.updateCost(Math.floor(price * 1.5));
                    return true;
                }
                return false;
            });
        };

        // Create the 6 Zones Logic (But only init first one)
        const animalTypes = ['Chicken', 'Cow', 'Pig', 'Sheep', 'Duck', 'Horse']; // Restored variety or keep all chicken? Let's use variety for fun progression

        // Grid Constants
        // These are already defined above, but keeping them here for clarity as per instruction.
        // const ROWS = 2;
        // const COLS = 3;
        // const START_X = 250;
        // const START_Y = 250;
        // const GAP_X = 350;
        // const ROW_GAP = 300;

        // Helper to spawn a specific zone index
        this.unlockZone = (index) => {
            if (index >= ROWS * COLS) return; // Maxed out

            const col = index % COLS;
            const row = Math.floor(index / COLS);

            const x = START_X + (col * GAP_X);
            const y = START_Y + (row * ROW_GAP);

            // Create Pen (Spike Logic)
            // Row 0 (Top) -> Gate at Bottom. Row 1 (Bottom) -> Gate at Top.
            // Forced Bottom Gate for all rows
            const gateSide = 'bottom';
            const spike = new Spike(x, y, 300, 200, this.scene, gateSide);
            this.spikes.push(spike);

            // Create Upgrades
            this.createZoneUpgrades(index, animalTypes[index], x, y, row === 0);

            // Create Trap Lever (The Gate)
            // Position dependent on gateSide
            // Center Y is y + 100 (relative to top left? wait).
            // in Game logic: x, y is TOP LEFT of zone.
            // Spike constructor center: x + width/2, y + height/2.
            // Height 200.
            // Bottom Fence Y = y + 200.
            // Top Fence Y = y.

            // Gate at Bottom (y + 200) + 5px margin
            const gateY = y + 200 + 5;
            // Center X = x + 150
            const gateX = x + 150;

            // --- CONFIGURAÇÃO DA POSIÇÃO DA ALAVANCA ---
            // Mude este valor para mover a alavanca (ex: -50 para esquerda, +50 para direita)
            const leverOffsetX = -170;
            const leverX = gateX + leverOffsetX;

            const trapLever = new Lever(leverX, gateY, this.scene);
            this.trapLevers.push({ lever: trapLever, targets: [spike] });

            // --- CONVEYOR BELT (Below the Pen) ---
            // Discrete belts for each unit
            const beltY = y + 240;

            const belt = new ConveyorBelt([
                { x: x, y: beltY },
                { x: x + 300, y: beltY }
            ], this.scene);
            if (!this.belts) this.belts = [];
            this.belts.push(belt);

            // Allow obstacles update
            // We need to re-push obstacles to MapSystem or it handles dynamic?
            // MapSystem.update takes a list. We should update check list.
            // But MapSystem.update is called every frame with checks?
            // "this.mapSystem.update(this.player.x, this.player.y, obstacles);" in Game loop.
            // So just adding to this.spikes and this.pads is enough for collision logic in update().
            // However, static map decorations (trees) check during generation.
            // If we want to clear trees from the new zone, we might need a mechanism.
            // For now, trees might clip through new zones. We can accept that or clear them.
        };

        // Game logic initialization is deferred to start()
        console.log("GAME: Constructor Finished");
    }

    createUpgradeStation(x, y, name, cost, callback) {
        // ... (lines 246-251)
        const pad = new UpgradePad(x, y, name, cost, this.scene, callback);
        this.pads.push(pad);
        const lever = new Lever(x + 50, y, this.scene);
        this.projectLevers.push({ lever, pad, cost, callback });
    }

    createZoneExpander() {
        // Expand Upgrade (Global) - Place near house
        // Logic: Buy -> Unlock Next Index
        this.createUpgradeStation(250, -50, "Expand Grid", 100, (price, station) => { // Cheap start 100
            if (this.unlockedZones < 6) {
                if (this.economy.buyUpgrade('area', price)) {
                    this.unlockZone(this.unlockedZones);
                    this.unlockedZones++;

                    // Scale Cost
                    const newCost = Math.floor(price * 2.5);
                    station.cost = newCost;
                    station.pad.updateCost(newCost);

                    if (this.unlockedZones >= 6) {
                        station.pad.name = "Maxed Out";
                        station.pad.updateText();
                        station.cost = 999999;
                    }
                    return true;
                }
            }
            return false;
        });
    }

    setupInput() {
        this.input = { keys: {}, joystick: null };
        this.joystick = new VirtualJoystick();
        this.input.joystick = this.joystick;

        window.addEventListener('keydown', e => this.input.keys[e.key] = true);
        window.addEventListener('keyup', e => this.input.keys[e.key] = false);

        window.addEventListener('keydown', e => {
            if (e.code === 'Space') {
                this.checkInteractions();
            }
        });
    }

    setupUI() {
        const panel = document.getElementById('upgrade-panel');
        if (panel) panel.style.display = 'none';

        const exportBtn = document.getElementById('btn-hud-save');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.saveSystem.save();
                this.saveSystem.export();
            });
        }
    }

    checkInteractions() {
        // 1. Trap Levers
        this.trapLevers.forEach(trapObj => {
            const dist = Math.hypot(this.player.x - trapObj.lever.x, this.player.y - trapObj.lever.y);
            if (dist < 50) {
                if (trapObj.lever.interact()) {
                    trapObj.targets.forEach(spike => spike.activate());
                }
            }
        });

        // 2. Upgrade Levers
        this.projectLevers.forEach((leverObj) => {
            const dist = Math.hypot(this.player.x - leverObj.lever.x, this.player.y - leverObj.lever.y);
            if (dist < 50) {
                if (leverObj.lever.interact()) {
                    const success = leverObj.callback(leverObj.cost, leverObj);
                    if (success) {
                        leverObj.lever.active = false;
                    } else {
                        console.log("Not enough money!");
                        leverObj.lever.active = false;
                        leverObj.lever.cooldown = 0;
                        leverObj.lever.update(0);
                    }
                }
            }
        });

        // 3. Sell Workbench Interactions are automatic (collision)
    }

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        const d = this.viewSize; // Use centralized zoom level

        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }
    // ...

    // ...
    clearLevel() {
        console.log("Cleaning up level...");

        // 1. Clear known belts (Reference cleanup)
        if (this.belts) {
            this.belts.forEach(belt => {
                if (belt.meshes) belt.meshes.forEach(mesh => this.scene.remove(mesh));
            });
        }
        this.belts = [];

        // 2. Aggressive Cleanup (Ghost hunting)
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const child = this.scene.children[i];
            if (child.name === 'conveyor') {
                this.scene.remove(child);
            }
            // 3. Heuristic Cleanup
            else if (child.isMesh && child.geometry && child.geometry.type === 'BoxGeometry') {
                if (Math.abs(child.position.y - 0.2) < 0.001) {
                    console.log("Removed ghost conveyor by Heuristic:", child);
                    this.scene.remove(child);
                }
            }
        }
    }

    async start(loadFromSave = true) {
        console.log(`GAME: start() called. loadFromSave=${loadFromSave}`);
        console.log("Loading assets...");
        const p1 = this.assets.load('chicken', '/farm_assets/models/chicken.glb?t=${Date.now()}');
        const p2 = this.assets.load('player_model', '/farm_assets/models/characters.glb?t=${Date.now()}');

        await Promise.all([p1, p2]);
        console.log("Assets loaded!");

        this.scene.remove(this.player.mesh);

        // CLEANUP: Remove old level objects to prevent duplication (Z-fighting)
        this.clearLevel();

        this.player = new Player(100, 100, this.scene, this.assets);

        // --- GAME STATE INITIALIZATION ---
        if (loadFromSave) {
            console.log("Attempting to load save...");
            if (this.saveSystem.load()) {
                console.log("Save loaded. Restoring zones:", this.unlockedZones);
                // Re-create all unlocked zones
                for (let i = 0; i < this.unlockedZones; i++) {
                    this.unlockZone(i);
                }
            } else {
                console.log("Save load failed or empty. Starting fresh.");
                this.unlockedZones = 1;
                this.unlockZone(0);
            }
        } else {
            console.log("New Game requested. Resetting.");
            this.saveSystem.reset();
            this.unlockedZones = 1;
            this.unlockZone(0);
        }

        // Create Global Expansion Station
        this.createZoneExpander();

        // Initial Map Update
        const allObstacles = [
            ...this.pads,
            ...this.spikes,
            ...this.projectLevers.map(l => l.lever),
            ...this.trapLevers.map(t => t.lever),
            this.sellWorkbench,
            this.house
        ];
        this.mapSystem.update(0, 0, allObstacles);

        // --- AUTO SAVE LOOP ---
        setInterval(() => {
            this.saveSystem.save();
        }, 5000); // Auto-save every 5 seconds

        // Start Loop
        this.renderer.setAnimationLoop(this.loop.bind(this));
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render();
    }

    update(dt) {
        // Dynamic Bounds - Expand as zones unlock (Grid)
        const maxRows = Math.ceil(this.unlockedZones / 3);
        const worldHeight = 2000 + (maxRows * 500);
        const bounds = { x: 0, y: 0, width: 2600 + (3 * 400), height: worldHeight + 500 };

        // Map System Call - Pass Obstacles for tree spawn
        const trapLeverObstacles = this.trapLevers.map(t => t.lever);
        // Rename to avoid conflict with player collision obstacles
        const staticObstacles = [...this.pads, ...this.spikes, this.sellWorkbench, ...trapLeverObstacles];

        // Update Map System
        this.mapSystem.update(this.player.x, this.player.y, staticObstacles);

        // Camera Follow (Zoomed In)
        const targetX = this.player.x;
        const targetZ = this.player.y;

        // ORIGINAL: 400, 400 (Far)
        // ZOOMED: 280, 280 (Closer)
        this.camera.position.set(targetX, 280, targetZ + 280);
        this.camera.lookAt(targetX, 0, targetZ);

        // Light Follow
        this.dirLight.position.set(targetX + 100, 200, targetZ + 100);
        this.dirLight.target.position.set(targetX, 0, targetZ);
        this.dirLight.target.updateMatrixWorld();

        // Check Input Joystick Action (Polling)
        if (this.input.joystick && this.input.joystick.action) {
            if (!this.input.joystick.wasPressed) {
                this.checkInteractions();
                this.input.joystick.wasPressed = true;
            }
        } else if (this.input.joystick) {
            this.input.joystick.wasPressed = false;
        }

        // Spawning
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spikes.forEach((zone, index) => {
                const spawnLevel = this.economy.upgrades[`spawn_${index}`] || 1;
                // Global cap scaled by spawn levels
                if (this.animals.length < 10 * spawnLevel * this.unlockedZones) {
                    const types = ['chicken', 'cow', 'pig', 'sheep', 'duck', 'horse'];
                    const type = types[index % types.length];
                    const model = type === 'chicken' ? this.assets.get('chicken') : null;

                    const animal = new Animal(
                        zone.x + Math.random() * (zone.width - 20),
                        zone.y + Math.random() * (zone.height - 20),
                        this.scene,
                        model,
                        type
                    );
                    animal.homeZone = zone;
                    this.animals.push(animal);
                }
            });
            this.spawnTimer = this.spawnRate;
        }

        // Create Obstacle List for Collision
        const obstacles = [];

        // 1. House (Centered approx around x,y)
        obstacles.push({
            x: this.house.x - 120, // Move left relative to scale center
            y: this.house.y - 40,
            w: 240,
            h: 80
        });

        // 2. Shop
        obstacles.push({
            x: this.sellWorkbench.x - 30,
            y: this.sellWorkbench.y - 30,
            w: 60,
            h: 60
        });

        // 3. Upgrades
        this.pads.forEach(p => {
            obstacles.push({
                x: p.x - 40,
                y: p.y - 40,
                w: 80,
                h: 80
            });
        });

        // 4. Fences (Perimeter of Spikes)
        this.spikes.forEach(s => {
            const margin = 5;
            // Top
            obstacles.push({ x: s.x, y: s.y, w: s.width, h: margin });
            // Left
            obstacles.push({ x: s.x, y: s.y, w: margin, h: s.height });
            // Right
            obstacles.push({ x: s.x + s.width - margin, y: s.y, w: margin, h: s.height });

            // Bottom (With Gate)
            const gateWidth = 80;
            const segW = (s.width - gateWidth) / 2;
            // Bottom Left Segment
            obstacles.push({ x: s.x, y: s.y + s.height - margin, w: segW, h: margin });
            // Bottom Right Segment
            obstacles.push({ x: s.x + s.width - segW, y: s.y + s.height - margin, w: segW, h: margin });
        });

        // Updates
        this.player.update(dt, this.input, bounds, obstacles);
        this.spikes.forEach(spike => spike.update(dt));
        this.trapLevers.forEach(t => t.lever.update(dt));
        this.projectLevers.forEach(l => l.lever.update(dt));
        this.animals.forEach(animal => animal.update(dt, animal.homeZone));
        this.resources.forEach(res => res.update(dt));

        // Auto-Farming Logic
        this.spikes.forEach((zone, index) => {
            const autoLevel = this.economy.upgrades[`auto_${index}`];
            if (autoLevel > 0) {
                if (!zone.autoTimer) zone.autoTimer = 0;
                zone.autoTimer -= dt;

                if (zone.autoTimer <= 0) {
                    // Find random animal in this zone
                    const zoningAnimals = this.animals.filter(a => a.homeZone === zone && a.alive);
                    if (zoningAnimals.length > 0) {
                        const victim = zoningAnimals[Math.floor(Math.random() * zoningAnimals.length)];

                        // BUS CONVEYOR PATHING:
                        // Row 0 (Top): Paths DOWN to Y=480 (Central Bus)
                        // Row 1 (Bottom): Paths UP to Y=480

                        // Zone Coords are Top-Left. 
                        // Center X = zone.x + 150 (since width 300)
                        // Center Y = zone.y + 100 (since height 200)

                        const zoneCenterX = zone.x + 150;
                        const zoneCenterY = zone.y + 100;

                        const BUS_Y = 480;
                        const SHOP_X = 50;
                        const SHOP_Y = 380; // sellWorkbench at 0, 350. Size approx 50-80?

                        const start = { x: victim.x, y: victim.y };
                        const laneMerge = { x: zoneCenterX, y: BUS_Y };
                        const busEnd = { x: SHOP_X, y: BUS_Y };
                        const shopTarget = { x: SHOP_X, y: SHOP_Y };

                        const path = [laneMerge, busEnd, shopTarget];

                        const res = new Resource(start.x, start.y, victim.dropValue, this.scene, null);
                        res.setPath(path);
                        this.resources.push(res);

                        victim.alive = false;
                        this.scene.remove(victim.mesh);

                        zone.autoTimer = Math.max(0.5, 5.5 - (autoLevel * 0.5));
                    } else {
                        zone.autoTimer = 1;
                    }
                }

                // Visual Belt Check
                if (!zone.conveyorBelt) {
                    const zoneCenterX = zone.x + 150;
                    const zoneCenterY = zone.y + 100; // Visual start from center of pen
                    const BUS_Y = 480;
                    const SHOP_X = 50;
                    const SHOP_Y = 380;

                    const start = { x: zoneCenterX, y: zoneCenterY };
                    const laneMerge = { x: zoneCenterX, y: BUS_Y };
                    const busEnd = { x: SHOP_X, y: BUS_Y };
                    const shopTarget = { x: SHOP_X, y: SHOP_Y };

                    const path = [start, laneMerge, busEnd, shopTarget];
                    zone.conveyorBelt = new ConveyorBelt(path, this.scene);
                }
            }
        });

        // Collisions: Spikes vs Animals
        // Collisions: Spikes vs Animals
        this.spikes.forEach((spike, index) => {
            if (spike.active) {
                // Get Damage based on Zone Upgrade
                const spikeLevel = this.economy.upgrades[`spikes_${index}`] || 1;
                const damage = 100 * Math.pow(1.5, spikeLevel - 1); // Base 100, x1.5 per level

                this.animals.forEach(animal => {
                    if (animal.alive &&
                        animal.x + animal.width > spike.x &&
                        animal.x < spike.x + spike.width &&
                        animal.y + animal.height > spike.y &&
                        animal.y < spike.y + spike.height) {

                        if (animal.takeDamage(damage * dt)) {
                            this.resources.push(new Resource(animal.x, animal.y, animal.dropValue, this.scene));
                        }
                    }
                });
            }
        });

        // Cleanup dead animals
        this.animals = this.animals.filter(a => {
            if (!a.alive) {
                // Mesh removal handled in Animal class or we should do it here?
                // Better to let Animal handle its own cleanup or call a destroy method
                // For now, let's assume Animal removes itself from scene on death or we call it
                return false;
            }
            return true;
        });

        // Collisions: Player vs Resources
        this.resources.forEach(res => {
            if (!res.collected) {
                const dist = Math.hypot(this.player.x - res.x, this.player.y - res.y);
                if (dist < 30) {
                    if (this.player.holdingMeat < this.player.maxCapacity) {
                        res.collected = true;
                        res.destroy(); // Remove mesh
                        this.player.holdingMeat++;
                        this.player.heldValue += res.value; // Add actual value
                        this.economy.meat = this.player.holdingMeat;
                        this.economy.updateUI();
                    }
                }
            }
        });

        this.resources = this.resources.filter(r => !r.collected);



        // Sell Workbench Collision
        this.sellWorkbench.checkCollision(this.player, this.economy);

        // Auto-Sell Logic for Conveyor Resources
        this.resources.forEach(res => {
            if (res.target && !res.collected) {
                const dist = Math.hypot(res.x - this.sellWorkbench.x, res.y - this.sellWorkbench.y);
                if (dist < 20) {
                    res.collected = true;
                    res.destroy();
                    this.economy.addCoins(res.value); // Direct credit
                    // Visual popup?
                }
            }
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
