import React from 'react';
import { ToolType } from './DrawingEngine';
import {
    Pencil, Paintbrush, Eraser, Minus, Square, Circle, Triangle,
    Hexagon, Pentagon, Star, ArrowRight, Move, ZoomIn, Hand, Type,
    Pipette, PaintBucket, Brush, Wind, Droplets, Feather, Pen,
    Heart, Diamond
} from 'lucide-react';

interface Props {
    activeTool: ToolType;
    onToolSelect: (t: ToolType) => void;
}

const TOOL_GROUPS = [
    {
        label: 'فُرَش', tools: [
            { id: 'pencil' as ToolType, icon: Pencil, tip: 'قلم رصاص (P)' },
            { id: 'brush' as ToolType, icon: Paintbrush, tip: 'فرشاة (B)' },
            { id: 'airbrush' as ToolType, icon: Wind, tip: 'بخاخ' },
            { id: 'calligraphy' as ToolType, icon: Pen, tip: 'خط عربي' },
            { id: 'oil' as ToolType, icon: Brush, tip: 'فرشاة زيتية' },
            { id: 'watercolor' as ToolType, icon: Droplets, tip: 'ألوان مائية' },
            { id: 'charcoal' as ToolType, icon: Feather, tip: 'فحم' },
            { id: 'eraser' as ToolType, icon: Eraser, tip: 'ممحاة (E)' },
        ]
    },
    {
        label: 'أشكال', tools: [
            { id: 'line' as ToolType, icon: Minus, tip: 'خط' },
            { id: 'rect' as ToolType, icon: Square, tip: 'مستطيل' },
            { id: 'circle' as ToolType, icon: Circle, tip: 'دائرة / بيضوي' },
            { id: 'triangle' as ToolType, icon: Triangle, tip: 'مثلث' },
            { id: 'pentagon' as ToolType, icon: Pentagon, tip: 'خُماسي' },
            { id: 'hexagon' as ToolType, icon: Hexagon, tip: 'سُداسي' },
            { id: 'star' as ToolType, icon: Star, tip: 'نجمة' },
            { id: 'arrow' as ToolType, icon: ArrowRight, tip: 'سهم' },
            { id: 'heart' as ToolType, icon: Heart, tip: 'قلب' },
            { id: 'diamond' as ToolType, icon: Diamond, tip: 'ماسة' },
        ]
    },
    {
        label: 'أدوات', tools: [
            { id: 'move' as ToolType, icon: Move, tip: 'تحريك (V)' },
            { id: 'eyedropper' as ToolType, icon: Pipette, tip: 'قطارة ألوان (I)' },
            { id: 'fill' as ToolType, icon: PaintBucket, tip: 'تعبئة (G)' },
            { id: 'text' as ToolType, icon: Type, tip: 'نص (T)' },
            { id: 'zoom' as ToolType, icon: ZoomIn, tip: 'تكبير (Z)' },
            { id: 'hand' as ToolType, icon: Hand, tip: 'تحريك اللوحة (H)' },
        ]
    }
];

export const DrawingToolbar: React.FC<Props> = ({ activeTool, onToolSelect }) => {
    return (
        <div className="drawing-toolbar">
            {TOOL_GROUPS.map(group => (
                <div key={group.label} className="tool-group">
                    <div className="tool-group-label">{group.label}</div>
                    <div className="tool-group-items">
                        {group.tools.map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => onToolSelect(tool.id)}
                                className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
                                title={tool.tip}
                            >
                                <tool.icon size={17} strokeWidth={activeTool === tool.id ? 2.5 : 1.8} />
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
