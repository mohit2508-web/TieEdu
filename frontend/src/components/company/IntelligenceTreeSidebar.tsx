import React, { useState } from 'react';
import { ContentModule, ContentItem } from '@/types';
import {
  CheckCircle2, Lock, Eye, ChevronRight, ChevronDown,
  Search, X, List
} from 'lucide-react';

interface TopicTreeProps {
  modules: ContentModule[];
  selectedItem: ContentItem;
  solvedItemIds: string[];
  isUnlocked: boolean;
  onSelectItem: (item: ContentItem) => void;
  onBackToModules: () => void;
  companyName: string;
}

/* The actual tree content — shared between desktop sidebar and mobile drawer */
function TreeContent({
  modules,
  selectedItem,
  solvedItemIds,
  isUnlocked,
  onSelectItem,
  searchQuery,
  onSearchChange,
  onBackToModules,
  companyName,
}: TopicTreeProps & { searchQuery: string; onSearchChange: (v: string) => void }) {
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (id: string) => {
    setCollapsedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[--border-subtle] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[--brand-accent]">{companyName}</p>
            <h3 className="text-[13px] font-bold text-[--text-heading]">Topics</h3>
          </div>
          <button
            onClick={onBackToModules}
            className="text-xs text-[--text-muted] hover:text-[--brand-primary] transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[--text-light] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search topics..."
            className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-[#F4F4F2] rounded-lg border border-[--border-subtle] focus:outline-none focus:ring-2 focus:ring-[--brand-accent]/40 placeholder-[--text-light]"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-[--text-muted]" />
            </button>
          )}
        </div>
      </div>

      {/* Module + Item Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {modules.map((mod) => {
          const isCollapsed = collapsedModules[mod.id];
          const filteredItems = (mod.items || []).filter(i =>
            !searchQuery || i.question_text?.toLowerCase().includes(searchQuery.toLowerCase())
          );

          // Hide module entirely if search has no matches
          if (searchQuery && filteredItems.length === 0) return null;

          return (
            <div key={mod.id} className="mb-1">
              {/* Module Header */}
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#F4F4F2] transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    mod.round_type === 'OA' ? 'bg-amber-400' :
                    mod.round_type === 'Technical' ? 'bg-blue-500' :
                    mod.round_type === 'SystemDesign' ? 'bg-purple-500' :
                    mod.round_type === 'HR' ? 'bg-emerald-500' :
                    'bg-gray-400'
                  }`} />
                  <span className="text-[12px] font-semibold text-[--text-heading] leading-snug text-left">
                    {mod.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[10px] text-[--text-muted]">{filteredItems.length}</span>
                  {isCollapsed
                    ? <ChevronRight className="w-3.5 h-3.5 text-[--text-muted]" />
                    : <ChevronDown className="w-3.5 h-3.5 text-[--text-muted]" />
                  }
                </div>
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="ml-4 border-l border-[--border-subtle]">
                  {filteredItems.map((item) => {
                    const isSelected = item.id === selectedItem.id;
                    const isSolved = solvedItemIds.includes(item.id);
                    const isAccessible = item.is_free_preview || isUnlocked;

                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectItem(item)}
                        disabled={!isAccessible}
                        className={`sidebar-item w-full ${isSelected ? 'active' : ''} ${isSolved ? 'solved' : ''} ${!isAccessible ? 'locked' : ''}`}
                      >
                        {/* Status icon */}
                        <span className="sidebar-icon shrink-0 mt-0.5">
                          {isSolved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : !isAccessible ? (
                            <Lock className="w-3.5 h-3.5 text-[--text-light]" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-[--text-muted]" />
                          )}
                        </span>

                        {/* Question text — WRAPS, not truncated */}
                        <span className="flex-1 leading-snug text-left">
                          {item.question_text}
                        </span>

                        {/* Badges */}
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                          {item.is_free_preview && !isSelected && (
                            <span className="text-[9px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                              Free
                            </span>
                          )}
                          <span className={`text-[9px] font-semibold capitalize ${
                            item.difficulty === 'hard' ? 'text-red-500' :
                            item.difficulty === 'medium' ? 'text-amber-500' :
                            'text-emerald-500'
                          }`}>
                            {item.difficulty}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {modules.length === 0 && (
          <p className="px-4 py-6 text-sm text-[--text-muted] text-center">No modules available.</p>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   DESKTOP SIDEBAR (sticky, full height)
   ================================================================ */
export const IntelligenceTreeSidebar: React.FC<TopicTreeProps> = (props) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div
      className="reader-sidebar-desktop w-[260px] xl:w-[280px] shrink-0 bg-white border-r border-[--border-subtle] overflow-hidden"
      style={{ height: 'calc(100vh - 56px)', position: 'sticky', top: 56, overflowY: 'hidden' }}
    >
      <TreeContent {...props} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
    </div>
  );
};

/* ================================================================
   MOBILE SIDEBAR (drawer overlay)
   ================================================================ */
interface MobileSidebarProps extends TopicTreeProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebarDrawer: React.FC<MobileSidebarProps> = ({ isOpen, onClose, ...props }) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed left-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-white z-50 shadow-2xl sidebar-drawer lg:hidden overflow-hidden flex flex-col">
        <TreeContent {...props} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      </div>
    </>
  );
};
