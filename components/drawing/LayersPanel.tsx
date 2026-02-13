import React, { useState, useRef, useEffect } from 'react';
import { Layer } from './DrawingEngine';
import {
    Eye, EyeOff, Lock, Unlock, Plus, Trash2, ChevronDown, ChevronUp,
    Copy, Layers, Merge, Eraser as EraserIcon, Sparkles, Crown
} from 'lucide-react';

interface Props {
    layers: Layer[];
    activeLayerId: string;
    onSelectLayer: (id: string) => void;
    onAddLayer: () => void;
    onDeleteLayer: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onReorder: (from: number, to: number) => void;
    onOpacityChange: (id: string, val: number) => void;
    onDuplicate: (id: string) => void;
    onMergeDown: (id: string) => void;
    onClearLayer: (id: string) => void;
    onBlendModeChange: (id: string, mode: GlobalCompositeOperation) => void;
}

const BLEND_MODES: { value: GlobalCompositeOperation; label: string }[] = [
    { value: 'source-over', label: 'عادي' },
    { value: 'multiply', label: 'ضرب' },
    { value: 'screen', label: 'شاشة' },
    { value: 'overlay', label: 'تراكب' },
    { value: 'darken', label: 'تعتيم' },
    { value: 'lighten', label: 'تفتيح' },
    { value: 'color-dodge', label: 'حرق لوني' },
    { value: 'color-burn', label: 'إشعال لوني' },
    { value: 'hard-light', label: 'ضوء قوي' },
    { value: 'soft-light', label: 'ضوء ناعم' },
    { value: 'difference', label: 'فرق' },
    { value: 'exclusion', label: 'استثناء' },
];

export const LayersPanel: React.FC<Props> = ({
    layers, activeLayerId, onSelectLayer, onAddLayer, onDeleteLayer,
    onToggleVisibility, onToggleLock, onReorder, onOpacityChange,
    onDuplicate, onMergeDown, onClearLayer, onBlendModeChange
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
    const [showBlend, setShowBlend] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close context menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Refresh layer previews
    const drawPreview = (el: HTMLCanvasElement | null, layer: Layer) => {
        if (!el) return;
        const c = el.getContext('2d');
        if (!c) return;
        el.width = 44; el.height = 28;
        c.clearRect(0, 0, 44, 28);
        // Mini checkerboard
        const s = 4;
        for (let r = 0; r < 7; r++) for (let cc = 0; cc < 11; cc++) {
            c.fillStyle = (r + cc) % 2 === 0 ? '#3a3a3a' : '#4a4a4a';
            c.fillRect(cc * s, r * s, s, s);
        }
        c.drawImage(layer.canvas, 0, 0, 44, 28);
    };

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ id, x: e.clientX, y: e.clientY });
    };

    return (
        <div className="layers-panel">
            <div className="layers-header" onClick={() => setCollapsed(!collapsed)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} style={{ opacity: 0.5 }} />
                    <span>الطبقات</span>
                    <span style={{ fontSize: 10, opacity: 0.4, fontWeight: 600 }}>({layers.length})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="pro-badge"><Crown size={9} /> PRO</div>
                    {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </div>

            {!collapsed && (
                <>
                    <div className="layers-actions">
                        <button onClick={onAddLayer} className="layer-action-btn add" title="طبقة جديدة">
                            <Plus size={13} /> طبقة جديدة
                        </button>
                    </div>

                    <div className="layers-list">
                        {[...layers].reverse().map((layer, revIdx) => {
                            const realIdx = layers.length - 1 - revIdx;
                            const isActive = layer.id === activeLayerId;

                            return (
                                <div
                                    key={layer.id}
                                    className={`layer-item ${isActive ? 'active' : ''}`}
                                    onClick={() => onSelectLayer(layer.id)}
                                    onContextMenu={e => handleContextMenu(e, layer.id)}
                                >
                                    {/* Preview thumbnail */}
                                    <div className="layer-preview">
                                        <canvas ref={el => drawPreview(el, layer)} width={44} height={28} />
                                    </div>

                                    {/* Info */}
                                    <div className="layer-info">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span className="layer-name">{layer.name}</span>
                                            {layer.locked && <Lock size={9} style={{ opacity: 0.4 }} />}
                                        </div>
                                        <div className="layer-opacity-row">
                                            <input
                                                type="range" min="0" max="100"
                                                value={Math.round(layer.opacity * 100)}
                                                onChange={e => { e.stopPropagation(); onOpacityChange(layer.id, +e.target.value / 100); }}
                                                onClick={e => e.stopPropagation()}
                                                className="layer-opacity-slider"
                                            />
                                            <span className="layer-opacity-val">{Math.round(layer.opacity * 100)}%</span>
                                        </div>
                                        {/* Blend mode selector */}
                                        <div style={{ marginTop: 2 }}>
                                            <select
                                                value={layer.blendMode}
                                                onChange={e => { e.stopPropagation(); onBlendModeChange(layer.id, e.target.value as GlobalCompositeOperation); }}
                                                onClick={e => e.stopPropagation()}
                                                className="blend-select"
                                            >
                                                {BLEND_MODES.map(m => (
                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="layer-controls">
                                        <button onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                                            className={`layer-ctrl-btn ${!layer.visible ? 'off' : ''}`} title={layer.visible ? 'إخفاء' : 'إظهار'}>
                                            {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); onToggleLock(layer.id); }}
                                            className={`layer-ctrl-btn ${layer.locked ? 'locked' : ''}`} title={layer.locked ? 'فتح' : 'قفل'}>
                                            {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                                        </button>
                                    </div>

                                    {/* Reorder arrows */}
                                    <div className="layer-reorder">
                                        {realIdx < layers.length - 1 && (
                                            <button onClick={e => { e.stopPropagation(); onReorder(realIdx, realIdx + 1); }}
                                                className="layer-ctrl-btn" title="أعلى"><ChevronUp size={11} /></button>
                                        )}
                                        {realIdx > 0 && (
                                            <button onClick={e => { e.stopPropagation(); onReorder(realIdx, realIdx - 1); }}
                                                className="layer-ctrl-btn" title="أسفل"><ChevronDown size={11} /></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick actions bar */}
                    <div className="layer-quick-actions">
                        <button onClick={() => { const l = layers.find(l => l.id === activeLayerId); if (l) onDuplicate(l.id); }}
                            className="layer-quick-btn" title="تكرار الطبقة"><Copy size={13} /></button>
                        <button onClick={() => { const l = layers.find(l => l.id === activeLayerId); if (l) onMergeDown(l.id); }}
                            className="layer-quick-btn" title="دمج للأسفل"><Merge size={13} /></button>
                        <button onClick={() => { const l = layers.find(l => l.id === activeLayerId); if (l) onClearLayer(l.id); }}
                            className="layer-quick-btn" title="مسح الطبقة"><EraserIcon size={13} /></button>
                        {layers.length > 1 && (
                            <button onClick={() => { const l = layers.find(l => l.id === activeLayerId); if (l) onDeleteLayer(l.id); }}
                                className="layer-quick-btn del" title="حذف الطبقة"><Trash2 size={13} /></button>
                        )}
                    </div>
                </>
            )}

            {/* Right-click context menu */}
            {contextMenu && (
                <div ref={menuRef} className="layer-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
                    <button onClick={() => { onDuplicate(contextMenu.id); setContextMenu(null); }}>
                        <Copy size={12} /> تكرار
                    </button>
                    <button onClick={() => { onMergeDown(contextMenu.id); setContextMenu(null); }}>
                        <Merge size={12} /> دمج مع الأسفل
                    </button>
                    <button onClick={() => { onClearLayer(contextMenu.id); setContextMenu(null); }}>
                        <EraserIcon size={12} /> مسح المحتوى
                    </button>
                    <div className="ctx-divider" />
                    <button className="ctx-danger" onClick={() => { onDeleteLayer(contextMenu.id); setContextMenu(null); }}>
                        <Trash2 size={12} /> حذف الطبقة
                    </button>
                </div>
            )}
        </div>
    );
};
