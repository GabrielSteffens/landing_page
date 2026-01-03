export class SaveSystem {
    constructor(game) {
        this.game = game;
        this.saveKey = 'chicken_tycoon_save';
    }

    save() {
        const data = {
            meat: this.game.economy.meat,
            coins: this.game.economy.coins,
            upgrades: this.game.economy.upgrades,
            unlockedZones: this.game.unlockedZones,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem(this.saveKey, JSON.stringify(data));
            console.log('Game Saved!', data);
            return true;
        } catch (e) {
            console.error('Save Failed:', e);
            return false;
        }
    }

    load() {
        try {
            const json = localStorage.getItem(this.saveKey);
            if (!json) return false;

            const data = JSON.parse(json);
            console.log('Game Loaded:', data);

            // Restore Data
            this.game.economy.meat = data.meat || 0;
            this.game.economy.coins = data.coins || 0;
            this.game.economy.upgrades = data.upgrades || {};

            // Validate Unlocked Zones (Prevent errors if save is corrupted or old)
            const loadedZones = data.unlockedZones || 1;
            this.game.unlockedZones = loadedZones;

            // Update UI
            this.game.economy.updateUI();

            return true;
        } catch (e) {
            console.error('Load Failed:', e);
            return false;
        }
    }

    // Helper to clear save
    reset() {
        localStorage.removeItem(this.saveKey);
        // location.reload(); // Don't reload, just let caller handle
    }

    export() {
        const data = {
            meat: this.game.economy.meat,
            coins: this.game.economy.coins,
            upgrades: this.game.economy.upgrades,
            unlockedZones: this.game.unlockedZones,
            timestamp: Date.now()
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chicken_tycoon_save.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    import(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    // Validate basic structure
                    if (data.timestamp && data.economy !== undefined) {
                        // Compatibility check if needed, mainly just checking if keys exist
                    }

                    // Save to local storage for persistent load
                    localStorage.setItem(this.saveKey, JSON.stringify(data));
                    resolve(true);
                } catch (err) {
                    console.error("Invalid Save File", err);
                    resolve(false);
                }
            };
            reader.readAsText(file);
        });
    }
}
