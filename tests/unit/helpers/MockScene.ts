import { vi } from 'vitest';

/**
 * Creates a chainable mock game-object (sprite, image, graphics, text).
 * x and y are stored so distance calculations work correctly.
 */
export function makeGameObject(x = 0, y = 0) {
    const obj: any = {
        x,
        y,
        width: 32,
        height: 32,
        active: true,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        // Physics body stub for Player.triggerMelee velocity check
        body: { velocity: { x: 0, y: 0 } },
        // Data store for setData / getData
        _data: {} as Record<string, any>,
    };

    const chainableMethods = [
        'setDepth', 'setScale', 'setScrollFactor', 'setVisible', 'setOrigin',
        'setAlpha', 'setTint', 'clearTint', 'setVelocity', 'setCollideWorldBounds',
        'setActive', 'setText', 'setPosition', 'refreshBody', 'destroy',
        'fillStyle', 'lineStyle', 'fillRect', 'strokeRect', 'beginPath',
        'moveTo', 'lineTo', 'closePath', 'fillPath', 'strokePath', 'clear',
        'setSize', 'strokePath', 'setData',
    ];

    for (const method of chainableMethods) {
        obj[method] = vi.fn((..._args: any[]) => obj);
    }

    // getData needs to return the stored data value
    obj.getData = vi.fn((key: string) => obj._data[key]);
    // setData needs to store the value AND remain chainable
    const origSetData = obj.setData;
    obj.setData = vi.fn((key: string, value: any) => {
        obj._data[key] = value;
        return obj;
    });

    return obj;
}

/**
 * Factory for a minimal Phaser Scene mock that covers all constructors and
 * methods used across entities, systems, and the dungeon generator.
 *
 * Key behaviours:
 *  - physics.add.sprite(x, y) stores and returns x/y so distance checks work
 *  - tweens.add calls onComplete() synchronously so lifecycle tests are simple
 *  - time.addEvent returns a TimerEvent stub with a destroy() spy
 */
export function makeMockScene() {
    const scene: any = {
        physics: {
            add: {
                sprite: vi.fn((x: number, y: number, _key: string) => makeGameObject(x, y)),
                staticGroup: vi.fn(() => {
                    return {
                        create: vi.fn((x: number, y: number, _key: string) => makeGameObject(x, y)),
                        add: vi.fn(),
                        getChildren: vi.fn(() => []),
                    };
                }),
                group: vi.fn(() => ({
                    add: vi.fn(),
                    create: vi.fn(() => makeGameObject()),
                    getFirstDead: vi.fn(() => null),
                    getChildren: vi.fn(() => []),
                    killAndHide: vi.fn(),
                })),
                overlap: vi.fn(),
                collider: vi.fn(() => ({})),
            },
            world: {
                setBounds: vi.fn(),
                removeCollider: vi.fn(),
            },
        },

        add: {
            sprite: vi.fn((x: number, y: number, _key: string) => makeGameObject(x, y)),
            image: vi.fn((x: number, y: number, _key: string) => makeGameObject(x, y)),
            graphics: vi.fn((_cfg?: any) => makeGameObject()),
            text: vi.fn((_x: number, _y: number, _text: string, _style?: any) => makeGameObject()),
        },

        tweens: {
            // Calls onComplete synchronously so lifecycle assertions don't need async
            add: vi.fn((config: any) => {
                if (config?.onComplete) config.onComplete();
                return {};
            }),
        },

        time: {
            delayedCall: vi.fn(),
            addEvent: vi.fn((_config: any) => ({ destroy: vi.fn() })),
            now: 0,
        },

        input: {
            keyboard: {
                createCursorKeys: vi.fn(() => ({
                    left:  { isDown: false },
                    right: { isDown: false },
                    up:    { isDown: false },
                    down:  { isDown: false },
                })),
                addKey: vi.fn(() => ({ isDown: false })),
                removeKey: vi.fn(),
            },
            on: vi.fn(),
            activePointer: { worldX: 0, worldY: 0 },
        },

        cameras: {
            main: {
                setBackgroundColor: vi.fn(),
                setBounds: vi.fn(),
                startFollow: vi.fn(),
                pan: vi.fn(),
                setScrollFactor: vi.fn(),
            },
        },
    };

    return scene;
}

/** Minimal pointer stub used in Player tests */
export function makePointer(worldX = 100, worldY = 0) {
    return { worldX, worldY };
}
