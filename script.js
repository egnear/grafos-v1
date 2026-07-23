const dataSource = {
  nodes: 'nos.csv',
  edges: 'arestas.csv'
};

const groupStyles = {
  pessoa: {
    color: { background: '#3b82f6', border: '#60a5fa' },
    shape: 'dot',
    font: { color: '#f8fafc', size: 16, face: 'Inter' },
    size: 26
  },
  dispositivo: {
    color: { background: '#22c55e', border: '#86efac' },
    shape: 'dot',
    font: { color: '#f8fafc', size: 14, face: 'Inter' },
    size: 20
  },
  ip: {
    color: { background: '#f59e0b', border: '#facc15' },
    shape: 'dot',
    font: { color: '#0f172a', size: 14, face: 'Inter' },
    size: 18
  },
  cartao: {
    color: { background: '#ef4444', border: '#fda4af' },
    shape: 'dot',
    font: { color: '#f8fafc', size: 14, face: 'Inter' },
    size: 22
  }
};

function formatNodes(rows) {
  return rows.map(row => ({
    id: row.id,
    label: row.label,
    group: row.grupo,
    ...groupStyles[row.grupo],
    shadow: {
      enabled: true,
      color: 'rgba(30, 41, 59, 0.45)',
      size: 18,
      x: 0,
      y: 4
    },
    value: groupStyles[row.grupo]?.size || 18
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
      type: 'curvedCW',
      roundness: 0.22
    },
    color: {
      color: '#7c93b3',
      highlight: '#dbeafe',
      hover: '#dbeafe',
      opacity: 0.64
    },
    font: {
      color: '#cbd5e1',
      size: 12,
      background: 'rgba(10, 18, 35, 0.8)',
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

async function initializeGraph() {
  try {
    const [rawNodes, rawEdges] = await Promise.all([
      loadCSV(dataSource.nodes),
      loadCSV(dataSource.edges)
    ]);

    const nodes = new vis.DataSet(formatNodes(rawNodes));
    const edges = new vis.DataSet(formatEdges(rawEdges));

    const container = document.getElementById('network');
    const options = {
      autoResize: true,
      height: '100%',
      width: '100%',
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 4,
        chosen: {
          node: node => ({
            shadow: { enabled: true, color: 'rgba(37, 99, 235, 0.35)', size: 34, x: 0, y: 0 }
          })
        },
        scaling: {
          min: 14,
          max: 34
        }
      },
      edges: {
        width: 1.8,
        smooth: {
          enabled: true,
          type: 'dynamic'
        },
        selfReferenceSize: 30
      },
      physics: {
        enabled: true,
        solver: 'barnesHut',
        barnesHut: {
          gravitationalConstant: -2600,
          centralGravity: 0.22,
          springLength: 170,
          springConstant: 0.025,
          damping: 0.16,
          avoidOverlap: 1.0
        },
        stabilization: {
          enabled: true,
          iterations: 300,
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
        navigationButtons: true
      },
      layout: {
        improvedLayout: true
      },
      manipulation: false,
      groups: groupStyles,
      physicsLayout: true
    };

    const network = new vis.Network(container, { nodes, edges }, options);

    network.on('selectNode', params => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
        const details = `ID: ${node.id}\nTipo: ${node.group}\nRótulo: ${node.label}`;
        alert(details);
      }
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

initializeGraph();
