import React, { useState } from 'react';
import {
  TextCursorInput,
  ListChecks,
  ChevronDownSquare,
  PenTool,
  Upload,
  Image as ImageIcon,
  Type,
  Columns,
  SeparatorHorizontal,
  MoreHorizontal
} from 'lucide-react';

const TOOLS = [
  {
    id: 'text-input',
    label: 'Text Box',
    type: 'Short Text',
    icon: TextCursorInput
  },
  {
    id: 'checkbox',
    label: 'Checkboxes',
    type: 'Checkbox',
    icon: ListChecks
  },
  {
    id: 'dropdown',
    label: 'Choices Menu',
    type: 'Dropdown',
    icon: ChevronDownSquare
  },
  {
    id: 'signature',
    label: 'Signature',
    type: 'Signature',
    icon: PenTool
  },
  {
    id: 'file-upload',
    label: 'File Upload',
    type: 'File Upload',
    icon: Upload
  },
  {
    id: 'image',
    label: 'Image',
    type: 'File Upload',
    icon: ImageIcon
  },
  {
    id: 'text',
    label: 'Text / Heading',
    type: 'Header',
    icon: Type
  },
  {
    id: 'columns',
    label: 'Two Columns',
    type: 'Short Text',
    icon: Columns
  },
  {
    id: 'separator',
    label: 'Divider Line',
    type: 'Section',
    icon: SeparatorHorizontal
  }
];

const MORE_TOOL = {
  id: 'more',
  label: 'More Fields',
  type: 'Short Text',
  icon: MoreHorizontal
};

export default function SidebarTools({ 
  onAddField = () => {},
  onSelectTool = () => {} 
}) {
  const [hoveredTool, setHoveredTool] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const handleToolClick = (tool) => {
    onAddField(tool.type || 'Short Text');
    onSelectTool(tool);
  };

  const handleMouseEnter = (tool, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 6
    });
    setHoveredTool(tool);
  };

  const handleMouseLeave = () => {
    setHoveredTool(null);
  };

  return (
    <aside className="w-16 bg-slate-100/60 border-r border-slate-200/80 flex flex-col items-center pt-3 pb-4 select-none z-20 shrink-0 h-full overflow-y-auto no-scrollbar">
      {/* Top "Drag to add" Pill Badge with Down Arrow */}
      <div className="mb-2 flex flex-col items-center select-none shrink-0 animate-in fade-in duration-150">
        <div className="bg-[#2E3842] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs whitespace-nowrap tracking-tight">
          Drag to add
        </div>
        <div className="w-0 h-0 border-x-[4px] border-x-transparent border-t-[4px] border-t-[#2E3842]" />
      </div>

      {/* Main White Rounded Toolbar Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm py-2 px-1 flex flex-col items-center gap-1 w-11 shrink-0">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isHovered = hoveredTool?.id === tool.id;

          return (
            <button
              key={tool.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', tool.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleToolClick(tool)}
              onMouseEnter={(e) => handleMouseEnter(tool, e)}
              onMouseLeave={handleMouseLeave}
              aria-label={tool.label}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer active:scale-90 ${
                isHovered
                  ? 'text-blue-600 bg-blue-50/90 shadow-2xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100/80'
              }`}
            >
              <Icon className="w-5 h-5 transition-transform" />
            </button>
          );
        })}

        {/* Subtle separator divider before '...' */}
        <div className="w-6 h-px bg-slate-100 my-0.5" />

        {/* Bottom '...' More Options Tool */}
        <button
          type="button"
          onClick={() => handleToolClick(MORE_TOOL)}
          onMouseEnter={(e) => handleMouseEnter(MORE_TOOL, e)}
          onMouseLeave={handleMouseLeave}
          aria-label={MORE_TOOL.label}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 cursor-pointer active:scale-90 ${
            hoveredTool?.id === MORE_TOOL.id
              ? 'text-blue-600 bg-blue-50/90 shadow-2xs'
              : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100/80'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Exact Match Solid Blue Tooltip with Left-Pointing Triangular Arrow */}
      {hoveredTool && (
        <div 
          style={{ 
            top: `${tooltipPos.top}px`, 
            left: `${tooltipPos.left}px`,
            transform: 'translateY(-50%)'
          }}
          className="fixed z-50 pointer-events-none animate-in fade-in duration-100 flex items-center filter drop-shadow-md"
        >
          {/* Left Arrow pointing right at the hovered icon */}
          <div className="w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-blue-600 -mr-[1px]" />
          
          {/* Solid Blue Rectangular Pill Badge */}
          <div className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm whitespace-nowrap tracking-wide select-none">
            {hoveredTool.label}
          </div>
        </div>
      )}
    </aside>
  );
}
