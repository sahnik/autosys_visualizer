import type { Core } from 'cytoscape';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsPng(cy: Core, filename = 'autosys-graph') {
  const blob = cy.png({ output: 'blob', full: true, scale: 2, bg: '#111827' });
  triggerDownload(blob as Blob, `${filename}.png`);
}

export function exportAsSvg(cy: Core, filename = 'autosys-graph') {
  // cy.svg() exists at runtime in Cytoscape 3.x but is missing from the type definitions
  const svgString = (cy as unknown as { svg(opts: object): string }).svg({
    full: true,
    scale: 1,
    bg: '#111827',
  });
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  triggerDownload(blob, `${filename}.svg`);
}
