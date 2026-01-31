import { useState, useCallback, useMemo } from 'react';
import type { LayoutName } from '../types';
import { useGraphData } from '../hooks/useGraphData';
import { useSelection } from '../hooks/useSelection';
import { getUpstream, getDownstream } from '../utils/graphUtils';
import Header from './Header';
import Sidebar from './Sidebar';
import GraphCanvas from './GraphCanvas';
import StatusBar from './StatusBar';

export default function App() {
  const { jobs, error, loadFromFile, loadSampleData } = useGraphData();
  const { selectedJobId, selectNode, cyRef } = useSelection();

  const [layout, setLayout] = useState<LayoutName>('dagre');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(1);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

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

  return (
    <div className="h-screen flex flex-col">
      <Header
        onImport={loadFromFile}
        onLoadSample={loadSampleData}
        layout={layout}
        onLayoutChange={setLayout}
        onFit={handleFit}
        hasData={jobs.length > 0}
      />

      {error && (
        <div className="px-4 py-2 bg-red-900/50 border-b border-red-700 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={typeFilters}
          onFilterToggle={handleFilterToggle}
          selectedJob={selectedJob}
        />

        {jobs.length > 0 ? (
          <GraphCanvas
            jobs={jobs}
            layout={layout}
            searchQuery={searchQuery}
            typeFilters={typeFilters}
            onNodeSelect={selectNode}
            onZoomChange={setZoom}
            cyRef={cyRef}
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
                <p className="text-sm mt-1">Import a JSON file or load sample data to get started</p>
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
      />
    </div>
  );
}
