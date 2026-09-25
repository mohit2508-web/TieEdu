import React, { useState } from 'react';
import { Company, ContentModule, ContentItem } from '@/types';
import {
  createModuleApi, updateModuleApi, deleteModuleApi, reorderModulesApi,
  createItemApi, updateItemApi, deleteItemApi, deleteBlockApi, reorderBlocksApi
} from '@/lib/api';
import { BlockEditorModal } from '@/components/modals/BlockEditorModal';
import { ModulePdfManager } from '@/components/admin/ModulePdfManager';
import {
  Plus, BookOpen, Lock, Edit3, Trash2, ChevronUp, ChevronDown,
  X, Eye, Sparkles, Layers, Save, CheckCircle2, FileText
} from 'lucide-react';

interface ContentBuilderProps {
  companies: Company[];
  selectedCompanyId: string;
  onSelectCompany: (id: string) => void;
  onEditModule: (module: ContentModule) => void;
  onRefresh: () => void;
}

const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]";
const labelCls = "block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1";

const MODULE_TYPES = ['complete_pack', 'preparation_guide', 'technical_question', 'hr_question', 'dsa_question', 'system_design', 'cheat_sheet', 'salary_insight'];
const ROUND_TYPES = ['OA', 'Technical', 'SystemDesign', 'HR', 'Managerial'];

export const ContentBuilder: React.FC<ContentBuilderProps> = ({ companies, selectedCompanyId, onSelectCompany, onEditModule, onRefresh }) => {
  const company = companies.find((c) => c.id === selectedCompanyId) || companies[0];
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<ContentModule | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: '', module_type: 'complete_pack', round_type: 'OA', description: '', price: 249, is_premium: true });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemModal, setItemModal] = useState<{ moduleId: string; item: ContentItem | null; open: boolean }>({ moduleId: '', item: null, open: false });
  const [blockTarget, setBlockTarget] = useState<{ itemId: string; module: ContentModule } | null>(null);
  const [pdfManagerModule, setPdfManagerModule] = useState<ContentModule | null>(null);
  const [savedMsg, setSavedMsg] = useState('');

  const flash = (txt: string) => { setSavedMsg(txt); setTimeout(() => setSavedMsg(''), 2000); };

  const openModuleModal = (mod?: ContentModule) => {
    if (mod) {
      setEditingModule(mod);
      setModuleForm({ title: mod.title, module_type: mod.module_type, round_type: mod.round_type || 'OA', description: mod.description || '', price: mod.price || 249, is_premium: mod.is_premium });
    } else {
      setEditingModule(null);
      setModuleForm({ title: '', module_type: 'complete_pack', round_type: 'OA', description: '', price: 249, is_premium: true });
    }
    setShowModuleModal(true);
  };

  const handleModuleSubmit = async () => {
    if (!moduleForm.title.trim()) return flash('Module title required');
    if (editingModule) {
      await updateModuleApi(editingModule.id, moduleForm);
      flash('Module updated');
    } else {
      await createModuleApi(company.id, moduleForm);
      flash('Module created');
    }
    setShowModuleModal(false);
    onRefresh();
  };

  const handleReorder = async (idx: number, dir: -1 | 1) => {
    const mods = company.modules || [];
    const target = idx + dir;
    if (target < 0 || target >= mods.length) return;
    const ids = mods.map((m) => m.id);
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    await reorderModulesApi(company.id, ids as string[]);
    onRefresh();
  };

  const handleDeleteModule = async (mod: ContentModule) => {
    if (!confirm(`Delete module "${mod.title}" and all its questions?`)) return;
    await deleteModuleApi(mod.id);
    onRefresh();
  };

  const handleItemSubmit = async () => {
    const { moduleId, item } = itemModal;
    if (!itemModal.open) return;
    const payload = {
      question_text: item?.question_text,
      difficulty: item?.difficulty,
      role_tag: item?.role_tag,
      frequency_tag: item?.frequency_tag,
      is_free_preview: item?.is_free_preview,
      status: item?.status
    };
    if (item) await updateItemApi(moduleId, item.id, payload);
    else await createItemApi(moduleId, payload);
    setItemModal({ moduleId: '', item: null, open: false });
    onRefresh();
    flash(item ? 'Question updated' : 'Question added');
  };

  const handleDeleteItem = async (moduleId: string, itemId: string) => {
    if (!confirm('Delete this question?')) return;
    await deleteItemApi(moduleId, itemId);
    onRefresh();
  };

  const handleDeleteBlock = async (itemId: string, blockId: string) => {
    if (!confirm('Delete this block?')) return;
    await deleteBlockApi(itemId, blockId);
    onRefresh();
  };

  const handleBlockReorder = async (itemId: string, blockIds: string[], idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= blockIds.length) return;
    const ids = [...blockIds];
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    await reorderBlocksApi(itemId, ids as string[]);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold font-mono text-gray-500 uppercase">Target Company:</span>
          <select value={company?.id} onChange={(e) => onSelectCompany(e.target.value)} className={inputCls + ' w-auto font-mono font-bold text-[#1F3A5F]'}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.modules?.length || 0} modules)</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          {savedMsg && <span className="text-xs text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {savedMsg}</span>}
          <button onClick={() => openModuleModal()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors">
            <Plus className="w-4 h-4" /> Create Module
          </button>
        </div>
      </div>

      {/* Module list */}
      {(company?.modules || []).length > 0 ? (
        <div className="space-y-4">
          {(company!.modules || []).map((mod, idx) => {
            const isExpanded = expandedId === mod.id;
            const blocksCount = (mod.items || []).reduce((acc, it) => acc + (it.blocks?.length || 0), 0);
            return (
              <div key={mod.id} className="bg-white border border-gray-200 rounded-3xl shadow-xs overflow-hidden">
                {/* Module header */}
                <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-[#1F3A5F] text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">#{idx + 1}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">{mod.round_type || 'Module'}</span>
                        <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 uppercase">{mod.module_type}</span>
                        {(mod.is_premium || mod.price) ? <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-[#1F3A5F]">₹{mod.price || 249}</span> : <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">FREE</span>}
                      </div>
                      <h3 className="font-bold text-[#1E293B] truncate">{mod.title}</h3>
                      <p className="text-[11px] text-gray-400 font-mono">{mod.items?.length || 0} questions · {blocksCount} blocks {mod.description ? `· ${mod.description}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleReorder(idx, -1)} className="p-1.5 text-gray-400 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg" title="Move up"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => handleReorder(idx, 1)} className="p-1.5 text-gray-400 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg" title="Move down"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={() => onEditModule(mod)} className="px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 ml-1">
                      <Sparkles className="w-3.5 h-3.5" /> Pack Editor
                    </button>
                    <button onClick={() => setPdfManagerModule(mod)} className="px-3 py-1.5 bg-[#1F3A5F] hover:bg-[#16304D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5" title="Manage PDF library">
                      <FileText className="w-3.5 h-3.5" />
                      {mod.pdf ? 'PDF ✓' : 'PDF'}
                    </button>
                    <button onClick={() => openModuleModal(mod)} className="p-1.5 text-gray-500 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg" title="Edit module"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteModule(mod)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete module"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => setExpandedId(isExpanded ? null : mod.id)} className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'text-[#0284C7] bg-sky-50' : 'text-gray-400 hover:bg-gray-100'}`} title="Toggle questions">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                {isExpanded && (
                  <div className="p-4 bg-[#FAFAF9]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold font-mono uppercase text-gray-500">Questions & Blocks ({mod.items?.length || 0})</span>
                      <button onClick={() => setItemModal({ moduleId: mod.id, item: null, open: true })} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg text-xs font-bold">
                        <Plus className="w-3.5 h-3.5" /> Add Question
                      </button>
                    </div>

                    {(mod.items || []).length > 0 ? (
                      <div className="space-y-2">
                        {(mod.items || []).map((item) => (
                          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {item.is_free_preview ? <Eye className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-gray-300" />}
                                <span className="text-sm font-semibold text-[#1E293B] truncate">{item.question_text}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-gray-400">
                                <span className={`capitalize ${item.difficulty === 'hard' ? 'text-red-500' : item.difficulty === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>{item.difficulty}</span>
                                <span>· {item.role_tag}</span>
                                <span>· {item.frequency_tag}</span>
                                <span>· {item.blocks?.length || 0} blocks</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => setBlockTarget({ itemId: item.id, module: mod })} className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#1F3A5F] rounded-lg text-xs font-bold flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5" /> Add Block
                              </button>
                              <button onClick={() => setItemModal({ moduleId: mod.id, item, open: true })} className="p-1.5 text-gray-500 hover:text-[#0284C7] hover:bg-sky-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteItem(mod.id, item.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-gray-400 italic p-3 bg-white border border-gray-200 rounded-xl">No questions yet — add the first one.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-3xl space-y-3">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-sm font-bold text-[#1F3A5F]">No modules for {company?.name} yet.</p>
          <button onClick={() => openModuleModal()} className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl">+ Create First Module</button>
        </div>
      )}

      {/* ====== MODULE CREATE/EDIT MODAL ====== */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="font-bold text-base text-[#1E293B]">{editingModule ? 'Edit Module' : `New Module for ${company?.name}`}</h3>
              <button onClick={() => setShowModuleModal(false)} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Module Title *</label>
                <input className={inputCls} value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} placeholder="Complete 7-Section Preparation Pack" />
              </div>
              <div>
                <label className={labelCls}>Description (shown in admin only)</label>
                <input className={inputCls} value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Module Type</label>
                  <select className={inputCls} value={moduleForm.module_type} onChange={(e) => setModuleForm({ ...moduleForm, module_type: e.target.value })}>
                    {MODULE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Round Type</label>
                  <select className={inputCls} value={moduleForm.round_type} onChange={(e) => setModuleForm({ ...moduleForm, round_type: e.target.value })}>
                    {ROUND_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Price (₹)</label>
                  <input className={inputCls} type="number" min={0} value={moduleForm.price} onChange={(e) => setModuleForm({ ...moduleForm, price: Number(e.target.value) })} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                    <input type="checkbox" checked={moduleForm.is_premium} onChange={(e) => setModuleForm({ ...moduleForm, is_premium: e.target.checked })} className="accent-[#0284C7] w-4 h-4" />
                    Premium (locked)
                  </label>
                </div>
              </div>
            </div>
            <button onClick={handleModuleSubmit} className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all">
              {editingModule ? 'Update Module' : 'Create Module'}
            </button>
          </div>
        </div>
      )}

      {/* ====== ITEM ADD/EDIT MODAL ====== */}
      {itemModal.open && (() => {
        const item = itemModal.item;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <h3 className="font-bold text-base text-[#1E293B]">{item ? 'Edit Question' : 'New Interview Question'}</h3>
                <button onClick={() => setItemModal({ moduleId: '', item: null, open: false })} className="text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Question Text *</label>
                  <textarea rows={2} className={inputCls} value={item?.question_text || ''}
                    onChange={(e) => item && setItemModal({ ...itemModal, item: { ...item, question_text: e.target.value } })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Difficulty</label>
                    <select className={inputCls} value={item?.difficulty || 'medium'}
                      onChange={(e) => item && setItemModal({ ...itemModal, item: { ...item, difficulty: e.target.value as any } })}>
                      <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Role Tag</label>
                    <input className={inputCls} value={item?.role_tag || ''} placeholder="SDE-1"
                      onChange={(e) => item && setItemModal({ ...itemModal, item: { ...item, role_tag: e.target.value } })} />
                  </div>
                  <div>
                    <label className={labelCls}>Frequency</label>
                    <select className={inputCls} value={item?.frequency_tag || 'high'}
                      onChange={(e) => item && setItemModal({ ...itemModal, item: { ...item, frequency_tag: e.target.value as any } })}>
                      <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                      <input type="checkbox" checked={item?.is_free_preview || false}
                        onChange={(e) => item && setItemModal({ ...itemModal, item: { ...item, is_free_preview: e.target.checked } })} className="accent-[#0284C7] w-4 h-4" />
                      Free preview
                    </label>
                  </div>
                </div>
              </div>

              <button onClick={handleItemSubmit} className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all">
                {item ? 'Update Question' : 'Add Question'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ====== BLOCK EDITOR MODAL ====== */}
      {blockTarget && (
        <BlockEditorModal
          isOpen
          onClose={() => setBlockTarget(null)}
          itemId={blockTarget.itemId}
          moduleTitle={blockTarget.module.title}
          companyName={company?.name}
          onSaved={onRefresh}
        />
      )}

      {/* ====== PDF LIBRARY MANAGER MODAL ====== */}
      {pdfManagerModule && (
        <ModulePdfManager
          module={pdfManagerModule}
          companyName={company?.name}
          onClose={() => setPdfManagerModule(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
};