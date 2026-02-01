import { useState, useCallback, useMemo } from 'react';
import type { LayoutName } from '../types';
import { useAppMode } from '../hooks/useAppMode';
import { useSelection } from '../hooks/useSelection';
import { useTimingAnalysis } from '../hooks/useTimingAnalysis';
import { useAnnotations } from '../hooks/useAnnotations';
import { getUpstream, getDownstream } from '../utils/graphUtils';
import { exportAsPng, exportAsSvg } from '../utils/exportGraph';
import Header from './Header';
import Sidebar from './Sidebar';
import GraphCanvas from './GraphCanvas';
import StatusBar from './StatusBar';

export default function App() {
  const {
    mode,
    jobs,
    ghostNodes,
    isIncremental,
    error,
    loading,
    loadFromFile,
    loadSampleData,
    dbOpen,
    totalJobCount,
    materializedCount,
    ghostCount,
    openDatabase,
    closeDatabase,
    searchAllJobs,
    setStartingNode,
    expandFromNode,
    materializeGhost,
    clearGraph,
  } = useAppMode();

  const { selectedJobId, selectNode, cyRef } = useSelection();
  const {
    timingEnabled,
    toggleTiming,
    timingResult,
    baselineDuration,
    durationOverrides,
    setDurationOverride,
    clearDurationOverride,
    resetAllOverrides,
  } = useTimingAnalysis(jobs);

  const {
    annotations,
    setAnnotation,
    removeAnnotation,
    exportAnnotations,
    importAnnotations,
  } = useAnnotations(jobs);

  const [layout, setLayout] = useState<LayoutName>('dagre');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(1);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  // Check if selected node is a ghost
  const selectedIsGhost = useMemo(() => {
    if (!selectedJobId) return false;
    return ghostNodes.some((g) => g.id === selectedJobId);
  }, [selectedJobId, ghostNodes]);

  // For ghost nodes that are selected, create a minimal Job object for display
  const selectedJobOrGhost = useMemo(() => {
    if (selectedJob) return selectedJob;
    if (!selectedJobId || !selectedIsGhost) return null;
    const ghost = ghostNodes.find((g) => g.id === selectedJobId);
    if (!ghost) return null;
    // Construct a minimal Job from ghost data
    return {
      id: ghost.id,
      name: ghost.name,
      type: ghost.type as 'box' | 'command' | 'file_watcher' | 'condition' | undefined,
      dependencies: [],
    };
  }, [selectedJob, selectedJobId, selectedIsGhost, ghostNodes]);

  const upstreamCount = useMemo(() => {
    if (!selectedJobId || !cyRef.current) return 0;
    return getUpstream(cyRef.current, selectedJobId).length;
  }, [selectedJobId, cyRef]);

  const downstreamCount = useMemo(() => {
    if (!selectedJobId || !cyRef.current) return 0;
    return getDownstream(cyRef.current, selectedJobId).length;
  }, [selectedJobId, cyRef]);

  const handleFilterToggle = useCallback((type: string) => {
    setTypeFilters((prev) => ({ ...prev, [type]: prev[type] !== false ? false : true }));
  }, []);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 40);
  }, [cyRef]);

  const handleExport = useCallback((format: 'png' | 'svg') => {
    if (!cyRef.current) return;
    if (format === 'png') exportAsPng(cyRef.current);
    else exportAsSvg(cyRef.current);
  }, [cyRef]);

  const handleGhostClick = useCallback((ghostId: string) => {
    materializeGhost(ghostId);
  }, [materializeGhost]);

  const handleExportNotes = useCallback(() => {
    const json = exportAnnotations();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportAnnotations]);

  const handleImportNotes = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        importAnnotations(reader.result);
      }
    };
    reader.readAsText(file);
  }, [importAnnotations]);

  const hasData = jobs.length > 0;

  return (
    <div className="h-screen flex flex-col">
      <Header
        onImport={loadFromFile}
        onLoadSample={loadSampleData}
        layout={layout}
        onLayoutChange={setLayout}
        onFit={handleFit}
        hasData={hasData}
        timingEnabled={timingEnabled}
        onTimingToggle={toggleTiming}
        onExport={handleExport}
        mode={mode}
        onImportSqlite={openDatabase}
        onCloseDatabase={closeDatabase}
        annotationCount={annotations.size}
        onExportNotes={handleExportNotes}
        onImportNotes={handleImportNotes}
      />

      {error && (
        <div className="px-4 py-2 bg-red-900/50 border-b border-red-700 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="px-4 py-2 bg-blue-900/50 border-b border-blue-700 text-blue-200 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading database...
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={typeFilters}
          onFilterToggle={handleFilterToggle}
          selectedJob={selectedJobOrGhost}
          timingEnabled={timingEnabled}
          timingResult={timingResult}
          baselineDuration={baselineDuration}
          durationOverrides={durationOverrides}
          onDurationOverride={setDurationOverride}
          onClearOverride={clearDurationOverride}
          onResetAllOverrides={resetAllOverrides}
          mode={mode}
          totalJobCount={totalJobCount}
          materializedCount={materializedCount}
          ghostCount={ghostCount}
          onClearGraph={clearGraph}
          onCloseDatabase={closeDatabase}
          onSearchDatabase={searchAllJobs}
          onSetStartingNode={setStartingNode}
          onExpandFromNode={expandFromNode}
          onMaterializeGhost={materializeGhost}
          selectedIsGhost={selectedIsGhost}
          annotation={selectedJobId ? annotations.get(selectedJobId) : undefined}
          onSetAnnotation={setAnnotation}
          onRemoveAnnotation={removeAnnotation}
        />

        {hasData || (mode === 'explorer' && dbOpen) ? (
          <GraphCanvas
            jobs={jobs}
            layout={layout}
            searchQuery={searchQuery}
            typeFilters={typeFilters}
            onNodeSelect={selectNode}
            onZoomChange={setZoom}
            cyRef={cyRef}
            timingEnabled={timingEnabled}
            timingResult={timingResult}
            durationOverrides={durationOverrides}
            ghostNodes={ghostNodes}
            incrementalMode={isIncremental}
            onGhostClick={handleGhostClick}
            annotations={annotations}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center space-y-4">
              <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <div>
                <p className="text-lg">No data loaded</p>
                <p className="text-sm mt-1">Import a JSON file, open a SQLite database, or load sample data</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <StatusBar
        jobCount={jobs.length}
        selectedJobId={selectedJobId}
        upstreamCount={upstreamCount}
        downstreamCount={downstreamCount}
        zoom={zoom}
        timingEnabled={timingEnabled}
        totalDuration={timingResult?.totalDuration ?? 0}
        criticalPathLength={timingResult?.criticalPath.length ?? 0}
        mode={mode}
        totalDbJobCount={totalJobCount}
        materializedCount={materializedCount}
        ghostCount={ghostCount}
      />
    </div>
  );
}
