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

export class Game {
    constructor(container) {
        this.container = container;
        this.lastTime = 0;

        this.input = {
            keys: {},
            mouse: { x: 0, y: 0, down: false }
        };

        this.economy = new Economy();
        this.assets = new AssetManager();

        // Three.js Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2a2a2a);

        // Camera (Isometric-ish)
        const aspect = container.clientWidth / container.clientHeight;
        const d = 400;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);

        this.camera.position.set(200, 200, 200); // Isometric angle
        this.camera.lookAt(0, 0, 0); // Look at center of world (or player later)

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio); // Enable HD/Retina
        this.renderer.shadowMap.enabled = true;

        // Append canvas to container, but before UI layer
        this.container.insertBefore(this.renderer.domElement, this.container.firstChild);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); // Brighter
        this.scene.add(ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2); // Strong Sun
        this.dirLight.position.set(100, 200, 50);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.camera.left = -500;
        this.dirLight.shadow.camera.right = 500;
        this.dirLight.shadow.camera.top = 500;
        this.dirLight.shadow.camera.bottom = -500;
        this.scene.add(this.dirLight);

        // --- MAP SYSTEM (Infinite World) ---
        this.mapSystem = new MapSystem(this.scene);
        // Deferred update until all objects are created


        this.setupInput();
        this.setupUI();
        window.addEventListener('resize', () => this.resize());

        // Game State
        // Note: Coordinates in 3D are (x, 0, z). Y is up.
        // We will map 2D (x, y) to 3D (x, z).
        // Let's center the game area around 0,0 for easier camera logic?
        // Or keep 0,0 as top-left to match previous logic?
        // Let's keep 0,0 as top-left for now to minimize logic changes, 
        // but we might need to adjust camera position to look at the center of the play area.
        // Previous play area was approx 1280x720.
        // Let's shift camera to look at center: 640, 0, 360.
        // Camera (RPG/GBA Style - Straight angle, not diagonal)
        // Positioned South-Up (Looking North)
        this.camera.position.set(640, 400, 360 + 400); // Back and Up
        this.camera.lookAt(640, 0, 360);

        this.player = new Player(100, 100, this.scene, this.assets);
        this.unlockedZones = 1;

        this.spikes = [
            new Spike(300, 200, 200, 200, this.scene) // Chicken Zone
        ];

        // Cow Zone (Initialized but potentially hidden or inactive until unlocked? 
        // For simplicity, we create it when unlocked, OR create it now but don't spawn there)
        // Let's create it dynamically when unlocked to support "infinite" expansion logic if needed.


        this.animals = [];
        this.resources = [];

        this.spawnTimer = 0;
        this.spawnRate = 3;

        // Selling Workbench (Stardew Style) - Placed next to Expand Upgrade (50, 100)
        this.sellWorkbench = new SellWorkbench(150, 100, this.scene);

        // Decor House
        this.house = new House(500, 0, this.scene);



        // --- UPGRADES (Workbench + Lever) ---
        // We keep UpgradePad for the "Text/Visual" of cost, but interaction is via Lever.
        this.pads = [];
        this.projectLevers = []; // Stores { lever, cost, callback }

        // --- UPGRADES (Workbench + Lever) ---
        // Organized on Left Side (X < 0)
        this.pads = [];
        this.projectLevers = []; // Stores { lever, cost, callback }

        const createUpgradeStation = (x, y, name, cost, callback) => {
            // 1. Visual Bench (Pad)
            const pad = new UpgradePad(x, y, name, cost, this.scene, callback);
            this.pads.push(pad);

            // 2. Lever (Interaction) - Placed slightly to the right
            const lever = new Lever(x + 40, y, this.scene);
            // Store everything in one object
            this.projectLevers.push({ lever, pad, cost, callback });
        };

        // Helper to Create Upgrades for a Zone
        this.createZoneUpgrades = (index, animalType, zoneX, zoneY) => {
            // Position relative to Zone (Above the pen)
            // Pen Size: 200x200. Center at zoneX, zoneY? 
            // Spike constructor says: new Spike(x, y, width, height). Position is Top-Left?
            // "this.group.position.set(x + width / 2, 0, y + height / 2); // Center"
            // So x,y passed to Spike are indeed Top-Left corner of the area.

            // We want upgrades above the pen.
            // Pen Top-Left: zoneX, zoneY.
            // Upgrades Y: zoneY - 150 (Shift up further to avoid conveyor/shop overlap)

            // Position relative to Zone (Above the pen)
            // Pen Size: 200x200. Center at zoneX, zoneY (Top-Left coords).
            // Upgrades need to be ABOVE everything.
            // Image shows: Upgrades -> Conveyor Line -> Pen
            // Pen is at y=zoneY.

            // Conveyor Line should be at y = zoneY - 50? 
            // Upgrades at y = zoneY - 150.

            const upgradeY = zoneY - 150;

            // Initialize upgrades in economy if not present (default 1)
            const spikeKey = `spikes_${index}`;
            const spawnKey = `spawn_${index}`;
            if (!this.economy.upgrades[spikeKey]) this.economy.upgrades[spikeKey] = 1;
            if (!this.economy.upgrades[spawnKey]) this.economy.upgrades[spawnKey] = 1;

            // 1. More [Animal] (Left)
            createUpgradeStation(zoneX - 60, upgradeY, `More ${animalType}`, 25 + (index * 100), (price, station) => {
                if (this.economy.buyUpgrade(spawnKey, price)) {
                    const newCost = Math.floor(price * 1.6);
                    station.cost = newCost;
                    station.pad.updateCost(newCost);
                    return true;
                }
                return false;
            });

            // 2. Auto [Animal] (Middle) - Aligned with Pen Center
            const autoKey = `auto_${index}`;
            if (this.economy.upgrades[autoKey] === undefined) this.economy.upgrades[autoKey] = 0;

            createUpgradeStation(zoneX + 100, upgradeY, `Auto ${animalType}`, 100 + (index * 200), (price, station) => {
                if (this.economy.buyUpgrade(autoKey, price)) {
                    const newCost = Math.floor(price * 2.0);
                    station.cost = newCost;
                    station.pad.updateCost(newCost);
                    return true;
                }
                return false;
            });

            // 3. Spikes [Animal] (Right)
            createUpgradeStation(zoneX + 260, upgradeY, `Spikes ${animalType}`, 10 + (index * 50), (price, station) => {
                if (this.economy.buyUpgrade(spikeKey, price)) {
                    const newCost = Math.floor(price * 1.5);
                    station.cost = newCost;
                    station.pad.updateCost(newCost);
                    return true;
                }
                return false;
            });

            // 4. Static Road (Visual Conveyor)
            // Create immediately for layout visuals
            // Use existing spike object to store reference
            if (this.spikes[index] && !this.spikes[index].conveyorBelt) {
                const start = { x: zoneX + 100, y: zoneY + 100 };
                const mergePoint = { x: zoneX + 100, y: zoneY - 80 };
                const mainBusPoint = { x: 150, y: zoneY - 80 };
                const shopPoint = { x: 150, y: 100 };

                const path = [start, mergePoint, mainBusPoint, shopPoint];

                // 4a. Dirt Path (Always Visible Road)
                if (!this.spikes[index].road) {
                    this.spikes[index].road = new Road(path, this.scene);
                }

                // 4b. Conveyor Belt (Machine) - Only if Auto Upgrade? 
                // For now, let's keep it visible per previous logic, or maybe hide it?
                // User: "roads have nothing to do with conveyors".
                // I'll keep Conveyor but maybe the user wants them separate.
                // I will Add Road.
                // this.spikes[index].conveyorBelt = new ConveyorBelt(path, this.scene);
            }
        };

        // Initialize Zone 0 Upgrades (Chicken) - Zone 0 is at 300, 400 (Moved down to fit top bar)
        // Let's adjust initial positions.
        // Shop is at 150, 100.
        // We want a "Main Road" top.
        // Let's perform a layout shift.
        // Shop: 150, 100.
        // Zone 0: Row 0, Col 0.
        // Base X = 300. Base Y = 400.

        // Update Grid Logic in Expand Upgrade first to match this base.
        // We'll init Zone 0 manually at 300, 400.
        this.createZoneUpgrades(0, 'Chicken', 300, 400);
        this.spikes[0].setPosition(300, 400); // Update spike pos

        // 3. Area Upgrade (Progressive) - Placed to the left of Shop?
        createUpgradeStation(50, 100, "Expand", 1000, (price, station) => {
            if (this.economy.buyUpgrade('area', price)) {
                // Progressive Logic
                const nextZoneIndex = this.unlockedZones;
                this.unlockedZones++;

                // Grid Logic: 3 Columns
                const col = nextZoneIndex % 3;
                const row = Math.floor(nextZoneIndex / 3);

                // Spacing:
                // Zone Width 200. space 200. Total Block 400-500?
                // X: 300 + (col * 500)
                // Y: 400 + (row * 500)

                const newZoneY = 400 + (row * 500);
                const newZoneX = 300 + (col * 500);

                const newSpike = new Spike(newZoneX, newZoneY, 200, 200, this.scene);
                this.spikes.push(newSpike);

                // Create Trap Lever for New Zone
                const newTrapLever = new Lever(newZoneX - 50, newZoneY + 250, this.scene);
                this.trapLevers.push({ lever: newTrapLever, targets: [newSpike] });

                // Create Upgrades for New Zone
                const types = ['Chicken', 'Cow', 'Pig', 'Sheep', 'Duck', 'Horse'];
                const type = types[nextZoneIndex % types.length];
                this.createZoneUpgrades(nextZoneIndex, type, newZoneX, newZoneY);

                console.log(`Zone ${this.unlockedZones} Unlocked!`);

                const newCost = Math.floor(price * 2.5);
                station.cost = newCost;
                station.pad.updateCost(newCost);

                return true;
            }
            return false;
        });

        // --- TRAP SYSTEM ---
        this.trapLevers = [];
        const createTrap = (x, y, targetSpikes) => {
            const lever = new Lever(x, y, this.scene);
            this.trapLevers.push({ lever, targets: targetSpikes });
        };
        // Zone 1 Trap (Chicken Zone) - aligned with new Zone 0 pos
        createTrap(250, 650, [this.spikes[0]]); // y = 400 + 250

        // ... (Map Update remains same)

        // Initial Map Generation
        const trapLeverObstacles = this.trapLevers.map(t => t.lever);
        const leverObstacles = this.projectLevers.map(l => l.lever);
        const initObstacles = [...this.pads, ...this.spikes, ...leverObstacles, ...trapLeverObstacles, this.sellWorkbench];
        this.mapSystem.update(0, 0, initObstacles);
    }

    setupInput() {
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
        const d = 400;

        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    async start() {
        console.log("Loading assets...");
        const p1 = this.assets.load('chicken', '/farm_assets/models/chicken.glb?t=${Date.now()}');
        const p2 = this.assets.load('player_model', '/farm_assets/models/characters.glb?t=${Date.now()}');

        await Promise.all([p1, p2]);
        console.log("Assets loaded!");

        this.scene.remove(this.player.mesh);
        this.player = new Player(100, 100, this.scene, this.assets);

        // Debug: Force a Road
        new Road([{ x: 0, y: 0 }, { x: 500, y: 0 }], this.scene);

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
        const obstacles = [...this.pads, ...this.spikes, this.sellWorkbench, ...trapLeverObstacles];

        // Update Map System
        this.mapSystem.update(this.player.x, this.player.y, obstacles);

        // Camera Follow
        const targetX = this.player.x;
        const targetZ = this.player.y;

        this.camera.position.set(targetX, 400, targetZ + 400);
        this.camera.lookAt(targetX, 0, targetZ);

        // Light Follow
        this.dirLight.position.set(targetX + 100, 200, targetZ + 100);
        this.dirLight.target.position.set(targetX, 0, targetZ);
        this.dirLight.target.updateMatrixWorld();

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

        // Updates
        this.player.update(dt, this.input, bounds);
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
                        // 1. Zone Center (Start)
                        // 2. Merge Point: Up to Row Line (Y = zone.y - 80)
                        // 3. Row Highway: Left to Main Bus (X = 150)
                        // 4. Main Highway: Up to Shop (Y = 100)

                        const start = { x: zone.x + 100, y: zone.y + 100 };
                        const mergePoint = { x: zone.x + 100, y: zone.y - 80 }; // Just below upgrades
                        const mainBusPoint = { x: 150, y: zone.y - 80 }; // Left side of the world
                        const shopPoint = { x: 150, y: 100 }; // Sell Workbench

                        const path = [mergePoint, mainBusPoint, shopPoint];

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
                    // Visual Path matches Resource Path
                    const start = { x: zone.x + 100, y: zone.y + 100 };
                    const mergePoint = { x: zone.x + 100, y: zone.y - 80 };
                    const mainBusPoint = { x: 150, y: zone.y - 80 };
                    const shopPoint = { x: 150, y: 100 };
                    const end = { x: this.sellWorkbench.x, y: this.sellWorkbench.y }; // Should match 150, 100

                    // Create Belt segments
                    // We only create the segments relevant to THIS zone to avoid duplicate drawing of the main bus?
                    // Actually, ConveyorBelt is just visual meshes. Overlapping meshes look okay usually (z-fighting might flicker).
                    // Ideal:
                    // 1. Vertical Stub (Zone -> Merge)
                    // 2. Horizontal Segment (Merge -> MainBus) 
                    //    -> IF we are not the first zone, this draws over previous? No, each zone has unique X.
                    //    -> X is unique. So segment from X to 150 is unique length.
                    //    -> But if Zone 1 is at 300, line is 300->150.
                    //    -> If Zone 2 is at 800, line is 800->150. This overlaps Zone 1's line.
                    //    -> Better: Line to "Next Zone Left"? Or just simple full line?
                    //    -> Simple full line: Each zone draws its OWN line all the way to the bus.
                    //    -> Z-fighting is a risk.
                    //    -> Optimization: Draw line to `Math.max(150, prevZoneX)`? Too complex state.
                    //    -> Let's just draw the full line for now. Z-fighting on identical texture/color is usually invisible.

                    const path = [start, mergePoint, mainBusPoint, shopPoint];
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
