import { useRef, useState, useEffect } from 'react';
import type { LayoutName, AppMode } from '../types';

interface HeaderProps {
  onImport: (file: File) => void;
  onLoadSample: () => void;
  layout: LayoutName;
  onLayoutChange: (layout: LayoutName) => void;
  onFit: () => void;
  hasData: boolean;
  timingEnabled: boolean;
  onTimingToggle: () => void;
  onExport: (format: 'png' | 'svg') => void;
  mode: AppMode;
  onImportSqlite: (file: File) => void;
  onCloseDatabase: () => void;
  annotationCount?: number;
  onExportNotes?: () => void;
  onImportNotes?: (file: File) => void;
}

export default function Header({
  onImport,
  onLoadSample,
  layout,
  onLayoutChange,
  onFit,
  hasData,
  timingEnabled,
  onTimingToggle,
  onExport,
  mode,
  onImportSqlite,
  onCloseDatabase,
  annotationCount = 0,
  onExportNotes,
  onImportNotes,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sqliteInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  const handleSqliteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportSqlite(file);
      e.target.value = '';
    }
  };

  const handleNotesImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportNotes) {
      onImportNotes(file);
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (!exportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  const handleExportClick = (format: 'png' | 'svg') => {
    onExport(format);
    setExportOpen(false);
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="2" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="18" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
            <path d="M12 7v4M8 11l3-3M16 11l-3-3M12 15v2" />
          </svg>
          <h1 className="text-lg font-semibold text-gray-100">
            Autosys Visualizer
          </h1>
        </div>
        {mode === 'explorer' && (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-900/50 text-blue-300 rounded">
            Explorer
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {mode === 'empty' && (
          <button
            onClick={onLoadSample}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            Load Sample
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Import JSON
        </button>

        <input
          ref={sqliteInputRef}
          type="file"
          accept=".sqlite,.db"
          onChange={handleSqliteChange}
          className="hidden"
        />
        {mode !== 'explorer' ? (
          <button
            onClick={() => sqliteInputRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Open Database
          </button>
        ) : (
          <button
            onClick={onCloseDatabase}
            className="px-3 py-1.5 text-sm bg-red-800/60 hover:bg-red-700/60 text-red-200 rounded transition-colors"
          >
            Close DB
          </button>
        )}

        <div ref={exportRef} className="relative">
          <button
            onClick={() => setExportOpen((prev) => !prev)}
            disabled={!hasData}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            Export
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 5l3 3 3-3" />
            </svg>
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-gray-700 border border-gray-600 rounded shadow-lg z-50">
              <button
                onClick={() => handleExportClick('png')}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-600 rounded-t transition-colors"
              >
                Export as PNG
              </button>
              <button
                onClick={() => handleExportClick('svg')}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-600 rounded-b transition-colors"
              >
                Export as SVG
              </button>
            </div>
          )}
        </div>

        <select
          value={layout}
          onChange={(e) => onLayoutChange(e.target.value as LayoutName)}
          className="px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded"
        >
          <option value="dagre">Dagre (Hierarchical)</option>
          <option value="breadthfirst">Breadthfirst</option>
          <option value="concentric">Concentric</option>
        </select>

        <button
          onClick={onTimingToggle}
          disabled={!hasData}
          className={`px-3 py-1.5 text-sm rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 ${
            timingEnabled
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="Toggle timing analysis"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Timing
        </button>

        {hasData && (
          <>
            <input
              ref={notesInputRef}
              type="file"
              accept=".json"
              onChange={handleNotesImport}
              className="hidden"
            />
            {annotationCount > 0 && onExportNotes && (
              <button
                onClick={onExportNotes}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Export Notes
              </button>
            )}
            {onImportNotes && (
              <button
                onClick={() => notesInputRef.current?.click()}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Import Notes
              </button>
            )}
          </>
        )}

        <button
          onClick={onFit}
          disabled={!hasData}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
        >
          Fit
        </button>
      </div>
    </header>
  );
}
