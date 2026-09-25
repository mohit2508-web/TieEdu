import React, { useState } from 'react';
import { ContentBlock, BlockType } from '@/types';
import { ContentBlockRenderer } from '@/components/blocks/ContentBlockRenderer';
import { addBlockApi } from '@/lib/api';
import {
  X, Plus, Save, Code, FileText, Image as ImageIcon, MessageSquare, Layers,
  Play, Eye, Table2, Music, Video, Sparkles
} from 'lucide-react';

interface BlockEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  moduleTitle: string;
  companyName: string;
  onSaved?: () => void;
}

const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl bg-[#FAFAF9] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]";

const BLOCK_TYPES: { type: BlockType; label: string; icon: any }[] = [
  { type: 'markdown', label: 'Markdown', icon: <FileText className="w-4 h-4" /> },
  { type: 'code', label: 'Code', icon: <Code className="w-4 h-4" /> },
  { type: 'diagram', label: 'Mermaid', icon: <Layers className="w-4 h-4" /> },
  { type: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
  { type: 'callout', label: 'Callout', icon: <MessageSquare className="w-4 h-4" /> },
  { type: 'table', label: 'Table', icon: <Table2 className="w-4 h-4" /> },
  { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { type: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
];

export const BlockEditorModal: React.FC<BlockEditorModalProps> = ({
  isOpen,
  onClose,
  itemId,
  moduleTitle,
  companyName,
  onSaved
}) => {
  const [blockType, setBlockType] = useState<BlockType>('markdown');
  const [blockText, setBlockText] = useState('');
  const [codeLang, setCodeLang] = useState('cpp');
  const [codeFilename, setCodeFilename] = useState('');
  const [calloutStyle, setCalloutStyle] = useState<'tip' | 'warning' | 'info'>('tip');
  const [calloutTitle, setCalloutTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState<'youtube' | 'mp4'>('youtube');
  const [tableHeaders, setTableHeaders] = useState('Topic, Complexity');
  const [tableRows, setTableRows] = useState('Insert, O(log N)\nSearch, O(log N)');
  const [audioUrl, setAudioUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const buildPayload = () => {
    switch (blockType) {
      case 'code':
        return { code: blockText || '// Write solution', language: codeLang, filename: codeFilename || 'Solution' };
      case 'diagram':
        return { source: blockText || 'flowchart LR\n  A --> B', title: 'Architecture Diagram', caption: imageCaption };
      case 'image':
        return { url: imageUrl || '', caption: imageCaption, alt: imageCaption };
      case 'callout':
        return { title: calloutTitle || 'Interviewer Pro-Tip', text: blockText || 'Golden tip...', style: calloutStyle };
      case 'table':
        return {
          title: 'Reference Table',
          headers: tableHeaders.split(',').map((h) => h.trim()).filter(Boolean),
          rows: tableRows.split('\n').map((line) => line.split(',').map((c) => c.trim())).filter((r) => r.length > 0)
        };
      case 'video':
        return { video_url: videoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', video_type: videoType, title: imageCaption || 'Video Walkthrough' };
      case 'audio':
        return { url: audioUrl || 'https://example.com/audio.mp3', title: imageCaption || 'Audio Guide', duration_seconds: 120 };
      default:
        return { text: blockText || '### New Markdown Content\nWrite your content here...' };
    }
  };

  // Construct live preview block object
  const previewBlock: ContentBlock = {
    id: 'preview-1',
    block_type: blockType,
    block_order: 1,
    payload: buildPayload()
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await addBlockApi(itemId, { block_type: blockType, payload: buildPayload() });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
        if (onSaved) onSaved();
      }, 1200);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 relative max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4 shrink-0">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3 text-[#E8A33D]" /> Live CMS Block Builder
            </span>
            <h3 className="text-xl font-bold text-[#1E293B] pt-1">Add Content Block</h3>
            <p className="text-xs text-gray-500">{moduleTitle} · {companyName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saved ? (
          <div className="py-12 text-center text-sm text-emerald-600 font-bold space-y-2">
            <p className="text-lg">✓ Block saved & published!</p>
            <p className="text-xs text-gray-500 font-mono">Student views updated live.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 flex-1 overflow-y-auto pr-1">

            {/* LEFT: Form Controls */}
            <div className="space-y-4 text-xs order-2 lg:order-1">

              {/* Block Type Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase font-mono">Block Payload Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOCK_TYPES.map((b) => (
                    <button
                      type="button"
                      key={b.type}
                      onClick={() => setBlockType(b.type)}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 font-bold transition-all ${
                        blockType === b.type
                          ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sm'
                          : 'bg-[#FAFAF9] text-gray-500 border-gray-200 hover:bg-white'
                      }`}
                    >
                      {b.icon}
                      <span className="text-[10px] font-mono">{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {blockType === 'code' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-500 mb-1 font-mono">Language</label>
                    <select value={codeLang} onChange={(e) => setCodeLang(e.target.value)} className={inputCls + ' font-mono'}>
                      {['cpp', 'java', 'python', 'javascript', 'typescript', 'go', 'sql'].map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-500 mb-1 font-mono">Filename</label>
                    <input className={inputCls} value={codeFilename} onChange={(e) => setCodeFilename(e.target.value)} placeholder="lru_cache.cpp" />
                  </div>
                </div>
              )}

              {blockType === 'callout' && (
                <div>
                  <label className="block font-bold text-gray-500 mb-1 font-mono">Callout Style</label>
                  <select value={calloutStyle} onChange={(e) => setCalloutStyle(e.target.value as any)} className={inputCls}>
                    <option value="tip">💡 Golden Pro-Tip (Amber)</option>
                    <option value="warning">⚠️ Interviewer Trap Warning (Red)</option>
                    <option value="info">ℹ️ Real Candidate Note (Blue)</option>
                  </select>
                  <input className={inputCls + ' mt-2'} placeholder="Callout title" value={calloutTitle} onChange={(e) => setCalloutTitle(e.target.value)} />
                </div>
              )}

              {(blockType === 'image' || blockType === 'video' || blockType === 'audio' || blockType === 'diagram') && (
                <div className="space-y-2">
                  {blockType === 'image' && (
                    <>
                      <div>
                        <label className="block font-bold text-gray-500 mb-1 font-mono">Image URL</label>
                        <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-500 mb-1 font-mono">Caption</label>
                        <input type="text" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} className={inputCls} />
                      </div>
                    </>
                  )}
                  {blockType === 'video' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-gray-500 mb-1 font-mono">Video URL</label>
                        <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputCls} placeholder="https://youtube.com/watch?v=..." />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-500 mb-1 font-mono">Type</label>
                        <select value={videoType} onChange={(e) => setVideoType(e.target.value as any)} className={inputCls}>
                          <option value="youtube">YouTube</option>
                          <option value="mp4">MP4 Direct</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {blockType === 'audio' && (
                    <div>
                      <label className="block font-bold text-gray-500 mb-1 font-mono">Audio URL (mp3)</label>
                      <input type="text" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} className={inputCls} placeholder="https://..." />
                    </div>
                  )}
                  {blockType === 'diagram' && (
                    <div>
                      <label className="block font-bold text-gray-500 mb-1 font-mono">Caption</label>
                      <input type="text" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} className={inputCls} placeholder="Architecture Diagram" />
                    </div>
                  )}
                </div>
              )}

              {blockType === 'table' && (
                <div className="space-y-2">
                  <div>
                    <label className="block font-bold text-gray-500 mb-1 font-mono">Headers (comma separated)</label>
                    <input className={inputCls} value={tableHeaders} onChange={(e) => setTableHeaders(e.target.value)} placeholder="Topic, Complexity" />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-500 mb-1 font-mono">Rows (one per line, comma separated)</label>
                    <textarea rows={4} className={inputCls + ' font-mono'} value={tableRows} onChange={(e) => setTableRows(e.target.value)}
                      placeholder={'Insert, O(log N)\nSearch, O(log N)'} />
                  </div>
                </div>
              )}

              {/* Payload text area */}
              <div>
                <label className="block font-bold text-gray-500 mb-1.5 font-mono">
                  {blockType === 'diagram' ? 'Mermaid.js Code' : blockType === 'code' ? 'Code Snippet' : blockType === 'table' ? '—' : 'Text / Markdown Payload'}
                </label>
                {blockType !== 'table' && blockType !== 'image' && blockType !== 'video' && blockType !== 'audio' && (
                  <textarea
                    rows={blockType === 'code' ? 10 : 7}
                    value={blockText}
                    onChange={(e) => setBlockText(e.target.value)}
                    placeholder={
                      blockType === 'diagram'
                        ? 'flowchart LR\n  Step1[OA Round] --> Step2[Tech Interview R1]'
                        : blockType === 'code'
                        ? 'int main() { return 0; }'
                        : '# Heading\n\nMarkdown content, bullets, lists...'
                    }
                    className={'w-full p-3 font-mono text-xs border rounded-xl bg-[#FAFAF9] focus:bg-white focus:ring-2 focus:ring-[#0284C7] focus:outline-none'}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Publishing...' : 'Save & Publish Block'}</span>
              </button>

            </div>

            {/* RIGHT: Live Student Preview */}
            <div className="bg-[#FAFAF9] p-4 rounded-2xl border border-gray-200 flex flex-col order-1 lg:order-2">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-xs font-mono font-bold text-[#1F3A5F]">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#0284C7]" /> Live Student Preview
                </span>
                <span className="text-[10px] text-gray-400">Calibre · 18px prose</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-white p-5 rounded-xl border border-gray-200 mt-3 max-h-[45vh]">
                <ContentBlockRenderer block={previewBlock} isLocked={false} companyName={companyName} />
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};