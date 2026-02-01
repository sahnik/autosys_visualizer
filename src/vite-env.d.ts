/// <reference types="vite/client" />

declare module 'cytoscape-dagre' {
  import type cytoscape from 'cytoscape';
  const ext: cytoscape.Ext;
  export default ext;
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const url: string;
  export default url;
}
