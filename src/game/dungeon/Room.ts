export interface Door {
    x: number;
    y: number;
    targetRoomId: number;
    side: 'top' | 'bottom' | 'left' | 'right';
}

export interface RoomData {
    id: number;
    worldX: number;   // top-left world X
    worldY: number;   // top-left world Y
    widthPx: number;
    heightPx: number;
    isBossRoom: boolean;
    doors: Door[];
    cleared: boolean;
    spawned: boolean;
}
