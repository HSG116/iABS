// DrawingEngine.ts - Ultra-smooth professional drawing engine

export interface Layer {
    id: string;
    name: string;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    visible: boolean;
    locked: boolean;
    opacity: number;
    blendMode: GlobalCompositeOperation;
}

export interface HistoryEntry {
    layerId: string;
    imageData: ImageData;
}

export type ToolType =
    | 'pencil' | 'brush' | 'airbrush' | 'calligraphy' | 'oil' | 'watercolor' | 'charcoal'
    | 'eraser'
    | 'line' | 'rect' | 'circle' | 'triangle' | 'pentagon' | 'hexagon' | 'star' | 'arrow' | 'heart' | 'diamond'
    | 'move' | 'eyedropper' | 'gradient' | 'fill'
    | 'text' | 'zoom' | 'hand';

export interface BrushSettings {
    color: string;
    size: number;
    opacity: number;
    hardness: number;
    fillShape: boolean;        // fill shapes or stroke only
    stabilizer: number;        // 0-10 stroke stabilizer strength
    glow?: boolean;            // Neon glow effect
}

// Stroke smoothing point buffer
interface SmoothPoint {
    x: number;
    y: number;
    pressure: number;
    time: number;
}

export class DrawingEngine {
    private mainCanvas: HTMLCanvasElement;
    private mainCtx: CanvasRenderingContext2D;
    layers: Layer[] = [];
    activeLayerId: string = '';
    private undoStack: HistoryEntry[][] = [];
    private redoStack: HistoryEntry[][] = [];
    private maxHistory = 50;
    width: number;
    height: number;
    backgroundColor: string = '#FFFFFF';

    // Smooth stroke state
    private pointBuffer: SmoothPoint[] = [];
    private lastMidPoint: { x: number; y: number } | null = null;
    mirrorMode: boolean = false;

    constructor(canvas: HTMLCanvasElement, w = 1920, h = 1080) {
        this.mainCanvas = canvas;
        this.mainCtx = canvas.getContext('2d', { willReadFrequently: true })!;
        this.width = w;
        this.height = h;
        canvas.width = w;
        canvas.height = h;
        this.addLayer('الخلفية');
        this.fillBackground();
        this.composite();
    }

    fillBackground() {
        const bg = this.layers[0];
        if (!bg) return;
        bg.ctx.fillStyle = this.backgroundColor;
        bg.ctx.fillRect(0, 0, this.width, this.height);
    }

    setBackgroundColor(color: string) {
        this.backgroundColor = color;
        this.saveToHistory();
        this.fillBackground();
        this.composite();
    }

    hardReset() {
        this.saveToHistory();
        this.backgroundColor = '#FFFFFF';
        // Clear all layers
        this.layers.forEach(l => {
            l.ctx.clearRect(0, 0, this.width, this.height);
        });
        // Refill background
        this.fillBackground();
        this.composite();
    }

    addLayer(name?: string): Layer {
        const id = 'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        const c = document.createElement('canvas');
        c.width = this.width;
        c.height = this.height;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const layer: Layer = {
            id, name: name || `طبقة ${this.layers.length + 1}`,
            canvas: c, ctx, visible: true, locked: false, opacity: 1,
            blendMode: 'source-over'
        };
        this.layers.push(layer);
        this.activeLayerId = id;
        this.composite();
        return layer;
    }

    duplicateLayer(srcId: string): Layer | null {
        const src = this.layers.find(l => l.id === srcId);
        if (!src) return null;
        const layer = this.addLayer(src.name + ' (نسخة)');
        layer.ctx.drawImage(src.canvas, 0, 0);
        layer.opacity = src.opacity;
        layer.blendMode = src.blendMode;
        this.composite();
        return layer;
    }

    mergeDown(id: string) {
        const idx = this.layers.findIndex(l => l.id === id);
        if (idx <= 0) return;
        this.saveToHistory();
        const upper = this.layers[idx];
        const lower = this.layers[idx - 1];
        lower.ctx.globalAlpha = upper.opacity;
        lower.ctx.globalCompositeOperation = upper.blendMode;
        lower.ctx.drawImage(upper.canvas, 0, 0);
        lower.ctx.globalAlpha = 1;
        lower.ctx.globalCompositeOperation = 'source-over';
        this.layers.splice(idx, 1);
        this.activeLayerId = lower.id;
        this.composite();
    }

    clearLayer(id: string) {
        const layer = this.layers.find(l => l.id === id);
        if (!layer) return;
        this.saveToHistory();
        layer.ctx.clearRect(0, 0, this.width, this.height);
        this.composite();
    }

    deleteLayer(id: string) {
        if (this.layers.length <= 1) return;
        this.layers = this.layers.filter(l => l.id !== id);
        if (this.activeLayerId === id) this.activeLayerId = this.layers[this.layers.length - 1].id;
        this.composite();
    }

    reorderLayers(fromIdx: number, toIdx: number) {
        const [moved] = this.layers.splice(fromIdx, 1);
        this.layers.splice(toIdx, 0, moved);
        this.composite();
    }

    getActiveLayer(): Layer | undefined {
        return this.layers.find(l => l.id === this.activeLayerId);
    }

    saveToHistory() {
        const snapshot = this.layers.map(l => ({
            layerId: l.id,
            imageData: l.ctx.getImageData(0, 0, this.width, this.height)
        }));
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
        this.redoStack = [];
    }

    undo(): boolean {
        if (this.undoStack.length === 0) return false;
        const current = this.layers.map(l => ({ layerId: l.id, imageData: l.ctx.getImageData(0, 0, this.width, this.height) }));
        this.redoStack.push(current);
        const prev = this.undoStack.pop()!;
        prev.forEach(entry => {
            const layer = this.layers.find(l => l.id === entry.layerId);
            if (layer) layer.ctx.putImageData(entry.imageData, 0, 0);
        });
        this.composite();
        return true;
    }

    redo(): boolean {
        if (this.redoStack.length === 0) return false;
        const current = this.layers.map(l => ({ layerId: l.id, imageData: l.ctx.getImageData(0, 0, this.width, this.height) }));
        this.undoStack.push(current);
        const next = this.redoStack.pop()!;
        next.forEach(entry => {
            const layer = this.layers.find(l => l.id === entry.layerId);
            if (layer) layer.ctx.putImageData(entry.imageData, 0, 0);
        });
        this.composite();
        return true;
    }

    composite() {
        const ctx = this.mainCtx;
        ctx.clearRect(0, 0, this.width, this.height);
        // Draw checkerboard for transparency
        this.drawCheckerboard(ctx);
        for (const layer of this.layers) {
            if (!layer.visible) continue;
            ctx.globalAlpha = layer.opacity;
            ctx.globalCompositeOperation = layer.blendMode;
            ctx.drawImage(layer.canvas, 0, 0);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    private drawCheckerboard(ctx: CanvasRenderingContext2D) {
        const s = 12;
        const cols = Math.ceil(this.width / s);
        const rows = Math.ceil(this.height / s);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                ctx.fillStyle = (r + c) % 2 === 0 ? '#e8e8e8' : '#f8f8f8';
                ctx.fillRect(c * s, r * s, s, s);
            }
        }
    }

    // ===================== ULTRA-SMOOTH STROKE ENGINE =====================

    beginStroke(x: number, y: number, brush: BrushSettings, tool: ToolType) {
        this.pointBuffer = [{ x, y, pressure: 1, time: Date.now() }];
        this.lastMidPoint = { x, y };
        const layer = this.getActiveLayer();
        if (!layer) return;
        const ctx = layer.ctx;
        this.setupBrushContext(ctx, brush, tool);
        // Draw initial dot
        if (['pencil', 'brush', 'eraser'].includes(tool)) {
            ctx.beginPath();
            ctx.arc(x, y, brush.size / 2, 0, Math.PI * 2);
            if (tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fill();
            } else {
                ctx.fill();
            }
            if (this.mirrorMode) {
                const mx = this.width - x;
                ctx.beginPath();
                ctx.arc(mx, y, brush.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        if (['airbrush', 'watercolor', 'charcoal', 'oil'].includes(tool)) {
            this.drawSpecialBrush(ctx, x, y, brush, tool);
        }
        this.composite();
    }

    continueStroke(x: number, y: number, brush: BrushSettings, tool: ToolType) {
        const layer = this.getActiveLayer();
        if (!layer) return;
        const ctx = layer.ctx;

        // Add point to buffer with stabilizer
        const stab = brush.stabilizer || 0;
        if (stab > 0 && this.pointBuffer.length > 0) {
            const last = this.pointBuffer[this.pointBuffer.length - 1];
            const factor = stab / 10;
            x = last.x + (x - last.x) * (1 - factor);
            y = last.y + (y - last.y) * (1 - factor);
        }
        this.pointBuffer.push({ x, y, pressure: 1, time: Date.now() });

        this.setupBrushContext(ctx, brush, tool);

        if (['pencil', 'brush', 'eraser'].includes(tool)) {
            this.drawSmoothLine(ctx, brush, tool === 'eraser');
        } else if (['airbrush', 'watercolor', 'charcoal', 'oil', 'calligraphy'].includes(tool)) {
            this.drawSpecialBrush(ctx, x, y, brush, tool);
        }
        this.composite();
    }

    endStroke() {
        this.pointBuffer = [];
        this.lastMidPoint = null;
        const layer = this.getActiveLayer();
        if (layer) {
            layer.ctx.globalCompositeOperation = 'source-over';
            layer.ctx.globalAlpha = 1;
        }
    }

    private setupBrushContext(ctx: CanvasRenderingContext2D, brush: BrushSettings, tool: ToolType) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brush.size;
        ctx.globalAlpha = brush.opacity;
        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = brush.color;
            ctx.strokeStyle = brush.color;
            if (brush.glow) {
                ctx.shadowBlur = brush.size * 1.5;
                ctx.shadowColor = brush.color;
            } else {
                ctx.shadowBlur = 0;
            }
        }
    }

    /** Draw ultra-smooth quadratic Bézier curves through the point buffer */
    private drawSmoothLine(ctx: CanvasRenderingContext2D, brush: BrushSettings, isEraser: boolean) {
        const pts = this.pointBuffer;
        if (pts.length < 2) return;

        const p1 = pts[pts.length - 2];
        const p2 = pts[pts.length - 1];
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        ctx.beginPath();
        if (this.lastMidPoint) {
            ctx.moveTo(this.lastMidPoint.x, this.lastMidPoint.y);
            ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
        } else {
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mid.x, mid.y);
        }
        ctx.stroke();

        // Mirror
        if (this.mirrorMode) {
            const mLast = this.lastMidPoint ? { x: this.width - this.lastMidPoint.x, y: this.lastMidPoint.y } : null;
            const mMid = { x: this.width - mid.x, y: mid.y };
            const mP1 = { x: this.width - p1.x, y: p1.y };
            ctx.beginPath();
            if (mLast) {
                ctx.moveTo(mLast.x, mLast.y);
                ctx.quadraticCurveTo(mP1.x, mP1.y, mMid.x, mMid.y);
            } else {
                ctx.moveTo(mP1.x, mP1.y);
                ctx.lineTo(mMid.x, mMid.y);
            }
            ctx.stroke();
        }

        this.lastMidPoint = mid;
    }

    private drawSpecialBrush(ctx: CanvasRenderingContext2D, x: number, y: number, brush: BrushSettings, tool: ToolType) {
        const sz = brush.size;
        if (tool === 'airbrush') {
            for (let i = 0; i < 25; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.random() * sz;
                ctx.globalAlpha = 0.015 * brush.opacity;
                ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.5, 1.5);
            }
        } else if (tool === 'watercolor') {
            for (let i = 0; i < 4; i++) {
                ctx.globalAlpha = 0.02 * brush.opacity;
                ctx.beginPath();
                ctx.arc(x + (Math.random() - 0.5) * sz * 0.5, y + (Math.random() - 0.5) * sz * 0.5, sz * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (tool === 'charcoal') {
            ctx.globalAlpha = 0.12 * brush.opacity;
            for (let i = 0; i < 8; i++) {
                const ox = (Math.random() - 0.5) * sz * 0.7;
                const oy = (Math.random() - 0.5) * sz * 0.7;
                ctx.fillRect(x + ox, y + oy, 1 + Math.random() * 2, 1 + Math.random() * 2);
            }
        } else if (tool === 'oil') {
            ctx.globalAlpha = 0.5 * brush.opacity;
            ctx.lineWidth = sz * 1.5;
            const last = this.pointBuffer.length > 1 ? this.pointBuffer[this.pointBuffer.length - 2] : null;
            if (last) {
                ctx.beginPath();
                ctx.moveTo(last.x, last.y);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        } else if (tool === 'calligraphy') {
            ctx.lineWidth = sz;
            ctx.lineCap = 'butt';
            const last = this.pointBuffer.length > 1 ? this.pointBuffer[this.pointBuffer.length - 2] : null;
            if (last) {
                const dx = x - last.x;
                const angle = Math.atan2(y - last.y, dx);
                ctx.lineWidth = sz * (0.3 + 0.7 * Math.abs(Math.sin(angle)));
                ctx.beginPath();
                ctx.moveTo(last.x, last.y);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
            ctx.lineCap = 'round';
        }
        ctx.globalAlpha = brush.opacity;
    }

    // ===================== SHAPES (10 shapes) =====================

    drawShape(tool: ToolType, sx: number, sy: number, ex: number, ey: number, brush: BrushSettings) {
        const layer = this.getActiveLayer();
        if (!layer) return;
        const ctx = layer.ctx;
        ctx.strokeStyle = brush.color;
        ctx.fillStyle = brush.color;
        ctx.lineWidth = brush.size;
        ctx.globalAlpha = brush.opacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const w = ex - sx, h = ey - sy;
        ctx.beginPath();

        switch (tool) {
            case 'line':
                ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
                ctx.stroke();
                break;
            case 'rect':
                if (brush.fillShape) ctx.fillRect(sx, sy, w, h);
                else ctx.strokeRect(sx, sy, w, h);
                break;
            case 'circle': {
                const rx = Math.abs(w) / 2, ry = Math.abs(h) / 2;
                const cx = sx + w / 2, cy = sy + h / 2;
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                brush.fillShape ? ctx.fill() : ctx.stroke();
                break;
            }
            case 'triangle':
                ctx.moveTo(sx + w / 2, sy);
                ctx.lineTo(sx, ey);
                ctx.lineTo(ex, ey);
                ctx.closePath();
                brush.fillShape ? ctx.fill() : ctx.stroke();
                break;
            case 'pentagon':
                this.drawPolygonPath(ctx, sx + w / 2, sy + h / 2, Math.min(Math.abs(w), Math.abs(h)) / 2, 5);
                brush.fillShape ? ctx.fill() : ctx.stroke();
                break;
            case 'hexagon':
                this.drawPolygonPath(ctx, sx + w / 2, sy + h / 2, Math.min(Math.abs(w), Math.abs(h)) / 2, 6);
                brush.fillShape ? ctx.fill() : ctx.stroke();
                break;
            case 'star':
                this.drawStarPath(ctx, sx + w / 2, sy + h / 2, 5, Math.abs(w) / 2, Math.abs(w) / 4);
                brush.fillShape ? ctx.fill() : ctx.stroke();
                break;
            case 'arrow':
                this.drawArrowPath(ctx, sx, sy, ex, ey);
                ctx.stroke();
                break;
            case 'heart':
                this.drawHeartPath(ctx, sx + w / 2, sy + h / 2, Math.min(Math.abs(w), Math.abs(h)) / 2);
                brush.fillShape ? ctx.fill() : ctx.stroke();
                break;
            case 'diamond':
                ctx.moveTo(sx + w / 2, sy);
                ctx.lineTo(ex, sy + h / 2);
                ctx.lineTo(sx + w / 2, ey);
                ctx.lineTo(sx, sy + h / 2);
                ctx.closePath();
                brush.fillShape ? ctx.fill() : ctx.stroke();
                break;
        }
        ctx.globalAlpha = 1;
        this.composite();
    }

    /** Preview shape on temporary overlay without modifying the layer */
    previewShape(previewCanvas: HTMLCanvasElement, tool: ToolType, sx: number, sy: number, ex: number, ey: number, brush: BrushSettings) {
        const ctx = previewCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.strokeStyle = brush.color;
        ctx.fillStyle = brush.color;
        ctx.lineWidth = brush.size;
        ctx.globalAlpha = brush.opacity * 0.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([6, 4]);

        const w = ex - sx, h = ey - sy;
        ctx.beginPath();
        switch (tool) {
            case 'line': ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); break;
            case 'rect':
                if (brush.fillShape) ctx.fillRect(sx, sy, w, h);
                else ctx.strokeRect(sx, sy, w, h); break;
            case 'circle': {
                const rx = Math.abs(w) / 2, ry = Math.abs(h) / 2;
                ctx.ellipse(sx + w / 2, sy + h / 2, rx, ry, 0, 0, Math.PI * 2);
                brush.fillShape ? ctx.fill() : ctx.stroke(); break;
            }
            case 'triangle':
                ctx.moveTo(sx + w / 2, sy); ctx.lineTo(sx, ey); ctx.lineTo(ex, ey); ctx.closePath();
                brush.fillShape ? ctx.fill() : ctx.stroke(); break;
            case 'pentagon':
                this.drawPolygonPath(ctx, sx + w / 2, sy + h / 2, Math.min(Math.abs(w), Math.abs(h)) / 2, 5);
                brush.fillShape ? ctx.fill() : ctx.stroke(); break;
            case 'hexagon':
                this.drawPolygonPath(ctx, sx + w / 2, sy + h / 2, Math.min(Math.abs(w), Math.abs(h)) / 2, 6);
                brush.fillShape ? ctx.fill() : ctx.stroke(); break;
            case 'star':
                this.drawStarPath(ctx, sx + w / 2, sy + h / 2, 5, Math.abs(w) / 2, Math.abs(w) / 4);
                brush.fillShape ? ctx.fill() : ctx.stroke(); break;
            case 'arrow': this.drawArrowPath(ctx, sx, sy, ex, ey); ctx.stroke(); break;
            case 'heart':
                this.drawHeartPath(ctx, sx + w / 2, sy + h / 2, Math.min(Math.abs(w), Math.abs(h)) / 2);
                brush.fillShape ? ctx.fill() : ctx.stroke(); break;
            case 'diamond':
                ctx.moveTo(sx + w / 2, sy); ctx.lineTo(ex, sy + h / 2); ctx.lineTo(sx + w / 2, ey); ctx.lineTo(sx, sy + h / 2); ctx.closePath();
                brush.fillShape ? ctx.fill() : ctx.stroke(); break;
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }

    private drawPolygonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number) {
        for (let i = 0; i <= sides; i++) {
            const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    private drawStarPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR); rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR); rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
    }

    private drawArrowPath(ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number) {
        ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
        const angle = Math.atan2(ey - sy, ex - sx);
        const headLen = 25;
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
    }

    private drawHeartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
        const s = size;
        ctx.moveTo(cx, cy + s * 0.7);
        ctx.bezierCurveTo(cx - s * 1.2, cy, cx - s * 0.6, cy - s, cx, cy - s * 0.4);
        ctx.bezierCurveTo(cx + s * 0.6, cy - s, cx + s * 1.2, cy, cx, cy + s * 0.7);
    }

    // ===================== BUCKET FILL =====================

    fillBucket(x: number, y: number, color: string) {
        const layer = this.getActiveLayer();
        if (!layer) return;
        const ctx = layer.ctx;
        const ix = Math.floor(x), iy = Math.floor(y);
        if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;

        // Sample from the main (merged) canvas to detect boundaries, but paint on active layer
        const mainData = this.mainCtx.getImageData(0, 0, this.width, this.height).data;
        const targetIdx = (iy * this.width + ix) * 4;
        const tr = mainData[targetIdx], tg = mainData[targetIdx + 1], tb = mainData[targetIdx + 2], ta = mainData[targetIdx + 3];

        const layerData = ctx.getImageData(0, 0, this.width, this.height);
        const data = layerData.data;

        // Parse fill color
        const temp = document.createElement('canvas');
        temp.width = 1; temp.height = 1;
        const tctx = temp.getContext('2d')!;
        tctx.fillStyle = color;
        tctx.fillRect(0, 0, 1, 1);
        const [fr, fg, fb] = tctx.getImageData(0, 0, 1, 1).data;
        if (tr === fr && tg === fg && tb === fb && ta === 255) return;

        const tolerance = 35;
        const match = (idx: number) => {
            return Math.abs(mainData[idx] - tr) <= tolerance &&
                Math.abs(mainData[idx + 1] - tg) <= tolerance &&
                Math.abs(mainData[idx + 2] - tb) <= tolerance &&
                Math.abs(mainData[idx + 3] - ta) <= tolerance;
        };

        const visited = new Uint8Array(this.width * this.height);
        const stack = [ix, iy];
        const w = this.width, h = this.height;

        while (stack.length > 0) {
            const cy = stack.pop()!, cx = stack.pop()!;
            if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
            const pixelIdx = cy * w + cx;
            if (visited[pixelIdx]) continue;
            const dataIdx = pixelIdx * 4;
            if (!match(dataIdx)) continue;

            visited[pixelIdx] = 1;
            data[dataIdx] = fr; data[dataIdx + 1] = fg; data[dataIdx + 2] = fb; data[dataIdx + 3] = 255;
            stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
        }
        ctx.putImageData(layerData, 0, 0);
        this.composite();
    }

    // ===================== FILTERS =====================

    applyFilter(filter: string, intensity: number = 1) {
        const layer = this.getActiveLayer();
        if (!layer) return;
        this.saveToHistory();
        const ctx = layer.ctx;
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2];
            switch (filter) {
                case 'grayscale': {
                    const avg = 0.299 * r + 0.587 * g + 0.114 * b;
                    d[i] = r + (avg - r) * intensity;
                    d[i + 1] = g + (avg - g) * intensity;
                    d[i + 2] = b + (avg - b) * intensity;
                    break;
                }
                case 'invert':
                    d[i] = r + (255 - 2 * r) * intensity;
                    d[i + 1] = g + (255 - 2 * g) * intensity;
                    d[i + 2] = b + (255 - 2 * b) * intensity;
                    break;
                case 'brightness':
                    d[i] = Math.min(255, r + 40 * intensity);
                    d[i + 1] = Math.min(255, g + 40 * intensity);
                    d[i + 2] = Math.min(255, b + 40 * intensity);
                    break;
                case 'contrast': {
                    const f = 1 + 0.5 * intensity;
                    d[i] = Math.min(255, Math.max(0, f * (r - 128) + 128));
                    d[i + 1] = Math.min(255, Math.max(0, f * (g - 128) + 128));
                    d[i + 2] = Math.min(255, Math.max(0, f * (b - 128) + 128));
                    break;
                }
                case 'sepia':
                    d[i] = Math.min(255, r + (r * 0.393 + g * 0.769 + b * 0.189 - r) * intensity);
                    d[i + 1] = Math.min(255, g + (r * 0.349 + g * 0.686 + b * 0.168 - g) * intensity);
                    d[i + 2] = Math.min(255, b + (r * 0.272 + g * 0.534 + b * 0.131 - b) * intensity);
                    break;
                case 'warm':
                    d[i] = Math.min(255, r + 15 * intensity);
                    d[i + 2] = Math.max(0, b - 15 * intensity);
                    break;
                case 'cool':
                    d[i] = Math.max(0, r - 15 * intensity);
                    d[i + 2] = Math.min(255, b + 15 * intensity);
                    break;
                case 'saturate': {
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    const sat = 1 + 0.5 * intensity;
                    d[i] = Math.min(255, Math.max(0, gray + (r - gray) * sat));
                    d[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * sat));
                    d[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * sat));
                    break;
                }
                case 'desaturate': {
                    const gray2 = 0.299 * r + 0.587 * g + 0.114 * b;
                    const desat = 1 - 0.5 * intensity;
                    d[i] = Math.min(255, Math.max(0, gray2 + (r - gray2) * desat));
                    d[i + 1] = Math.min(255, Math.max(0, gray2 + (g - gray2) * desat));
                    d[i + 2] = Math.min(255, Math.max(0, gray2 + (b - gray2) * desat));
                    break;
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
        this.composite();
    }

    applyBlur(radius = 3) {
        const layer = this.getActiveLayer();
        if (!layer) return;
        this.saveToHistory();
        const ctx = layer.ctx;
        ctx.filter = `blur(${radius}px)`;
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.filter = 'none';
        this.composite();
    }

    applySharpen() {
        const layer = this.getActiveLayer();
        if (!layer) return;
        this.saveToHistory();
        const ctx = layer.ctx;
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        const d = imageData.data;
        const w = this.width;
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        const copy = new Uint8ClampedArray(d);
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let val = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            val += copy[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    d[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, val));
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
        this.composite();
    }

    // ===================== FLIP =====================

    flipLayer(dir: 'h' | 'v') {
        const layer = this.getActiveLayer();
        if (!layer) return;
        this.saveToHistory();
        const temp = document.createElement('canvas');
        temp.width = this.width; temp.height = this.height;
        const tctx = temp.getContext('2d')!;
        tctx.drawImage(layer.canvas, 0, 0);
        layer.ctx.clearRect(0, 0, this.width, this.height);
        layer.ctx.save();
        if (dir === 'h') { layer.ctx.translate(this.width, 0); layer.ctx.scale(-1, 1); }
        else { layer.ctx.translate(0, this.height); layer.ctx.scale(1, -1); }
        layer.ctx.drawImage(temp, 0, 0);
        layer.ctx.restore();
        this.composite();
    }

    // ===================== EXPORT =====================

    exportPNG(): string { return this.mainCanvas.toDataURL('image/png'); }
    exportJPEG(q = 0.92): string { return this.mainCanvas.toDataURL('image/jpeg', q); }
    exportSVG(): string {
        const data = this.mainCanvas.toDataURL('image/png');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}"><image href="${data}" width="${this.width}" height="${this.height}"/></svg>`;
    }

    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }
    get historyCount() { return this.undoStack.length; }
}
