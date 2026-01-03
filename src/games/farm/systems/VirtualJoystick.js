export class VirtualJoystick {
    constructor() {
        this.active = false;
        this.origin = { x: 0, y: 0 };
        this.current = { x: 0, y: 0 };
        this.delta = { x: 0, y: 0 }; // Normalized -1 to 1

        // Visual Elements
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.bottom = '50px';
        this.container.style.left = '50px';
        this.container.style.width = '120px';
        this.container.style.height = '120px';
        this.container.style.borderRadius = '50%';
        this.container.style.background = 'rgba(255, 255, 255, 0.1)';
        this.container.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        this.container.style.touchAction = 'none'; // Prevent scroll
        this.container.style.display = 'none'; // Hidden unless touch detected? Or always visible on mobile?
        // Let's create a detector or just always show it for now, user can hide it.
        // Or better: auto-detect touch event to show it.

        // Knob
        this.knob = document.createElement('div');
        this.knob.style.position = 'absolute';
        this.knob.style.left = '50%';
        this.knob.style.top = '50%';
        this.knob.style.width = '50px';
        this.knob.style.height = '50px';
        this.knob.style.transform = 'translate(-50%, -50%)';
        this.knob.style.borderRadius = '50%';
        this.knob.style.background = 'rgba(255, 255, 255, 0.5)';
        this.knob.style.pointerEvents = 'none';

        this.container.appendChild(this.knob);
        document.body.appendChild(this.container);

        // 2. Action Button (Bottom Right)
        this.btnAction = document.createElement('div');
        this.btnAction.style.position = 'absolute';
        this.btnAction.style.bottom = '50px';
        this.btnAction.style.right = '50px';
        this.btnAction.style.width = '100px';
        this.btnAction.style.height = '100px';
        this.btnAction.style.borderRadius = '50%';
        this.btnAction.style.background = 'rgba(255, 0, 0, 0.3)'; // Red tint
        this.btnAction.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        this.btnAction.style.touchAction = 'none';
        this.btnAction.style.display = 'none';
        this.btnAction.innerHTML = "Use";
        this.btnAction.style.color = "white";
        this.btnAction.style.justifyContent = "center"; // Flex center text
        this.btnAction.style.alignItems = "center";
        this.btnAction.style.fontSize = "24px";
        this.btnAction.style.fontWeight = "bold";

        document.body.appendChild(this.btnAction);

        this.setupEvents();
        this.checkMobile();
    }

    checkMobile() {
        // Simple check to show joystick
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this.container.style.display = 'block';
            this.btnAction.style.display = 'flex';
        }
    }

    setupEvents() {
        const handleStart = (e) => {
            this.active = true;
            this.origin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            this.updateKnob(e.touches[0].clientX, e.touches[0].clientY);
        };

        const handleMove = (e) => {
            if (!this.active) return;
            e.preventDefault(); // Stop scrolling
            this.updateKnob(e.touches[0].clientX, e.touches[0].clientY);
        };

        const handleEnd = (e) => {
            this.active = false;
            this.delta = { x: 0, y: 0 };
            this.knob.style.transform = `translate(-50%, -50%)`;
        };

        // Attach to container for specific area control
        this.container.addEventListener('touchstart', handleStart);
        this.container.addEventListener('touchmove', handleMove);
        this.container.addEventListener('touchend', handleEnd);

        // Action Button Events
        this.btnAction.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.action = true;
            this.btnAction.style.background = 'rgba(255, 0, 0, 0.6)';
        });

        this.btnAction.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.action = false;
            this.btnAction.style.background = 'rgba(255, 0, 0, 0.3)';
        });
    }

    updateKnob(clientX, clientY) {
        // Calculate reset joystick relative to container center
        // Actually, let's make it static stick logic.
        // Container is fixed.
        const rect = this.container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = clientX - centerX;
        let dy = clientY - centerY;

        // Limit radius
        const radius = rect.width / 2;
        const distance = Math.hypot(dx, dy);

        if (distance > radius) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * (radius - 25); // -25 for knob radius
            dy = Math.sin(angle) * (radius - 25);
        }

        // Normalize delta for Game Input (-1 to 1)
        this.delta.x = dx / (radius - 25);
        this.delta.y = dy / (radius - 25);

        // Visual update
        this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
}
