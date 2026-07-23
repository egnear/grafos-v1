const dataSource = {
  nodes: 'nos.csv',
  edges: 'arestas.csv'
};

const groupStyles = {
  pessoa: {
    color: { background: '#3b82f6', border: '#60a5fa' },
    shape: 'dot',
    font: { color: '#f8fafc', size: 16, face: 'Inter' },
    size: 30
  },
  dispositivo: {
    color: { background: '#22c55e', border: '#86efac' },
    shape: 'dot',
    font: { color: '#f8fafc', size: 14, face: 'Inter' },
    size: 24
  },
  ip: {
    color: { background: '#f59e0b', border: '#fde68a' },
    shape: 'dot',
    font: { color: '#0f172a', size: 14, face: 'Inter' },
    size: 22
  },
  cartao: {
    color: { background: '#ef4444', border: '#fca5a5' },
    shape: 'dot',
    font: { color: '#f8fafc', size: 14, face: 'Inter' },
    size: 26
  }
};

let network;
let allNodes = [];
let allEdges = [];
let nodeDataSet;
let edgeDataSet;
const filterState = { groups: {}, regions: {} };

function formatNodes(rows) {
  return rows.map(row => ({
    id: row.id,
    label: row.label,
    group: row.grupo,
    regiao: row.regiao || 'N/A',
    title: `${row.label} (${row.grupo})\nRegião: ${row.regiao || 'N/A'}`,
    ...groupStyles[row.grupo],
    shadow: {
      enabled: true,
      color: 'rgba(255, 255, 255, 0.12)',
      size: 24,
      x: 0,
      y: 10
    },
    value: groupStyles[row.grupo]?.size || 18,
    borderWidth: 2
  }));
}

function formatEdges(rows) {
  return rows.map(row => ({
    from: row.origem,
    to: row.destino,
    label: row.relacao,
    arrows: {
      to: { enabled: false }
    },
    smooth: {
      enabled: true,
      type: 'curvedCCW',
      roundness: 0.25
    },
    color: {
      color: '#7c93b3',
      highlight: '#dbeafe',
      hover: '#f8fafc',
      opacity: 0.6
    },
    width: 1.8,
    font: {
      color: '#cbd5e1',
      size: 11,
      background: 'rgba(7, 12, 23, 0.8)',
      strokeWidth: 0
    }
  }));
}

async function loadCSV(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  return parseCSV(text);
}

function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(header => header.trim());
  return lines.map(line => {
    const values = line.split(',').map(value => value.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function createFilterUI(nodes) {
  const groups = Array.from(new Set(nodes.map(node => node.group)));
  const regions = Array.from(new Set(nodes.map(node => node.regiao || 'N/A')));

  groups.forEach(group => {
    filterState.groups[group] = true;
  });
  regions.forEach(region => {
    filterState.regions[region] = true;
  });

  const groupContainer = document.getElementById('filter-groups');
  const regionContainer = document.getElementById('filter-regions');

  groupContainer.innerHTML = groups
    .map(group => `
      <label><input type="checkbox" data-filter-type="group" data-filter-value="${group}" checked /> ${capitalize(group)}</label>
    `)
    .join('');

  regionContainer.innerHTML = regions
    .map(region => `
      <label><input type="checkbox" data-filter-type="region" data-filter-value="${region}" checked /> ${region}</label>
    `)
    .join('');

  document.querySelectorAll('.controls input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', event => {
      const type = event.target.dataset.filterType;
      const value = event.target.dataset.filterValue;
      filterState[type === 'group' ? 'groups' : 'regions'][value] = event.target.checked;
      applyFilters();
    });
  });

  document.getElementById('resetFilters').addEventListener('click', () => {
    Object.keys(filterState.groups).forEach(group => { filterState.groups[group] = true; });
    Object.keys(filterState.regions).forEach(region => { filterState.regions[region] = true; });
    document.querySelectorAll('.controls input[type="checkbox"]').forEach(input => {
      input.checked = true;
    });
    applyFilters();
  });
}

function applyFilters() {
  const visibleNodes = allNodes.filter(node => {
    const groupVisible = filterState.groups[node.group];
    const regionVisible = filterState.regions[node.regiao || 'N/A'];
    return groupVisible && regionVisible;
  });

  const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
  const visibleEdges = allEdges.filter(edge => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to));

  nodeDataSet.clear();
  nodeDataSet.add(visibleNodes);
  edgeDataSet.clear();
  edgeDataSet.add(visibleEdges);
}

async function initializeGraph() {
  try {
    const [rawNodes, rawEdges] = await Promise.all([
      loadCSV(dataSource.nodes),
      loadCSV(dataSource.edges)
    ]);

    allNodes = formatNodes(rawNodes);
    allEdges = formatEdges(rawEdges);

    nodeDataSet = new vis.DataSet(allNodes);
    edgeDataSet = new vis.DataSet(allEdges);

    createFilterUI(allNodes);

    const container = document.getElementById('network');
    const options = {
      autoResize: true,
      height: '100%',
      width: '100%',
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 5,
        chosen: {
          node: node => ({
            shadow: { enabled: true, color: 'rgba(96, 165, 250, 0.45)', size: 42, x: 0, y: 0 }
          })
        },
        scaling: {
          min: 16,
          max: 40
        }
      },
      edges: {
        width: 1.8,
        color: {
          color: '#7c93b3',
          highlight: '#dbeafe',
          hover: '#f8fafc',
          opacity: 0.68
        },
        smooth: {
          enabled: true,
          type: 'dynamic'
        },
        selectionWidth: 4
      },
      physics: {
        enabled: true,
        solver: 'barnesHut',
        barnesHut: {
          gravitationalConstant: -3200,
          centralGravity: 0.24,
          springLength: 170,
          springConstant: 0.018,
          damping: 0.18,
          avoidOverlap: 1.25
        },
        stabilization: {
          enabled: true,
          iterations: 320,
          updateInterval: 20,
          onlyDynamicEdges: false
        }
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        hover: true,
        zoomView: true,
        multiselect: false,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: {
          enabled: true,
          speed: { x: 5, y: 5, zoom: 0.02 },
          bindToWindow: false
        }
      },
      layout: {
        improvedLayout: true
      },
      manipulation: false,
      groups: groupStyles,
      physicsLayout: true
    };

    network = new vis.Network(container, { nodes: nodeDataSet, edges: edgeDataSet }, options);

    network.on('selectNode', params => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const neighbors = network.getConnectedNodes(nodeId);
        const connectedEdges = network.getConnectedEdges(nodeId);
        network.setSelection({ nodes: [nodeId, ...neighbors], edges: connectedEdges }, { unselectAll: true });
      }
    });

    network.on('deselectNode', () => {
      network.setSelection({ nodes: [], edges: [] });
    });

    window.addEventListener('resize', () => {
      network.redraw();
    });
  } catch (error) {
    console.error('Erro ao carregar os dados do grafo:', error);
    const message = error?.message ? error.message : JSON.stringify(error);
    const container = document.getElementById('network');
    container.innerHTML = `
      <div style="color:#f8fafc; padding: 2rem; font-size:1rem; line-height:1.6;">
        <strong>Falha ao carregar os CSVs.</strong><br>
        Verifique se os arquivos existem e se o Live Server está servindo-os corretamente.<br>
        <strong>Detalhes:</strong> ${message}
      </div>
    `;
  }
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

initializeGraph();
