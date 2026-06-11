// --- State Management ---
const state = {
  bubbles: [],
  selectedBubbleId: null,
  mangaImage: null, // Image element when loaded
  imageFileName: '',
  imageWidth: 0,
  imageHeight: 0,
  theme: 'dark',
  activeAction: null, // 'dragging' | 'resizing' | 'moving-tail'
  activeHandle: null, // 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  dragStart: { x: 0, y: 0 },
  dragStartBubble: { x: 0, y: 0, w: 0, h: 0, tailX: 0, tailY: 0 }
};

// --- DOM Elements ---
const el = {
  themeToggle: document.getElementById('theme-toggle'),
  uploadPlaceholder: document.getElementById('upload-placeholder'),
  mangaUploadInput: document.getElementById('manga-upload-input'),
  mangaBgImage: document.getElementById('manga-bg-image'),
  mangaCanvasContainer: document.getElementById('manga-canvas-container'),
  bubblesOverlay: document.getElementById('bubbles-overlay'),
  
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  tabBtnEditor: document.getElementById('tab-btn-editor'),
  
  // Sidebar - Input Tab
  markdownInput: document.getElementById('markdown-input'),
  layoutSelect: document.getElementById('layout-select'),
  btnParseDistribute: document.getElementById('btn-parse-distribute'),
  imageInfoBox: document.getElementById('image-info-box'),
  exportScale: document.getElementById('export-scale'),
  btnExportImage: document.getElementById('btn-export-image'),
  
  // Sidebar - Editor Tab
  editorNoSelection: document.getElementById('editor-no-selection'),
  editorControls: document.getElementById('editor-controls'),
  btnAddBubble: document.getElementById('btn-add-bubble'),
  bubbleTextInput: document.getElementById('bubble-text-input'),
  fontSizeNum: document.getElementById('font-size-num'),
  fontSizeSlider: document.getElementById('font-size-slider'),
  fontFamilySelect: document.getElementById('font-family-select'),
  alignBtns: document.querySelectorAll('.align-btn'),
  colorText: document.getElementById('color-text'),
  colorBg: document.getElementById('color-bg'),
  colorBorder: document.getElementById('color-border'),
  colorBgWrapper: document.getElementById('color-bg-wrapper'),
  colorBorderWrapper: document.getElementById('color-border-wrapper'),
  borderWidthSlider: document.getElementById('border-width-slider'),
  borderWidthVal: document.getElementById('border-width-val'),
  borderWidthWrapper: document.getElementById('border-width-wrapper'),
  tailToggle: document.getElementById('tail-toggle'),
  tailToggleWrapper: document.getElementById('tail-toggle-wrapper'),
  
  // Actions
  btnBringFront: document.getElementById('btn-bring-front'),
  btnSendBack: document.getElementById('btn-send-back'),
  btnDuplicate: document.getElementById('btn-duplicate'),
  btnDelete: document.getElementById('btn-delete')
};

// --- Theme Init & Toggle ---
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  state.theme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = el.themeToggle.querySelector('i');
  if (state.theme === 'light') {
    icon.className = 'fa-solid fa-sun';
  } else {
    icon.className = 'fa-solid fa-moon';
  }
}

el.themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
  updateThemeIcon();
});

// --- Tab Navigation ---
el.tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    
    el.tabBtns.forEach(b => b.classList.remove('active'));
    el.tabContents.forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(targetTab).classList.add('active');
  });
});

// Switch to Tab helper
function switchToTab(tabId) {
  const btn = Array.from(el.tabBtns).find(b => b.getAttribute('data-tab') === tabId);
  if (btn) btn.click();
}

// --- Image Upload ---
el.mangaUploadInput.addEventListener('change', handleImageUpload);

// Drag & Drop events for container
el.mangaCanvasContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  el.mangaCanvasContainer.classList.add('drag-over');
});

el.mangaCanvasContainer.addEventListener('dragleave', () => {
  el.mangaCanvasContainer.classList.remove('drag-over');
});

el.mangaCanvasContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  el.mangaCanvasContainer.classList.remove('drag-over');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    el.mangaUploadInput.files = e.dataTransfer.files;
    handleImageUpload({ target: el.mangaUploadInput });
  }
});

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  state.imageFileName = file.name;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      state.mangaImage = img;
      state.imageWidth = img.width;
      state.imageHeight = img.height;
      
      // Update backgrounds & styles
      el.mangaBgImage.src = event.target.result;
      el.mangaBgImage.style.display = 'block';
      el.mangaCanvasContainer.classList.remove('empty');
      el.uploadPlaceholder.style.display = 'none';
      
      // Enable export button
      el.btnExportImage.removeAttribute('disabled');
      
      // Update image dimensions info
      const ratioStr = (img.width / img.height).toFixed(2);
      el.imageInfoBox.innerHTML = `
        <div class="image-info-row"><strong>ファイル名:</strong> <span>${file.name}</span></div>
        <div class="image-info-row"><strong>解像度:</strong> <span>${img.width} x ${img.height} px</span></div>
        <div class="image-info-row"><strong>比率 (W/H):</strong> <span>${ratioStr} (推奨: 0.75)</span></div>
      `;
      
      // Force resize container and render bubbles
      resizeCanvasContainer();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// Helper to recursively reconstruct raw tag content inside XML nodes
// (Avoids browser innerHTML serialization/double-escaping issues in text/xml mode)
function getNodeRawXMLContent(node) {
  if (!node) return '';
  let result = '';
  const childNodes = node.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    if (child.nodeType === 3) { // Text Node
      result += child.nodeValue;
    } else if (child.nodeType === 1) { // Element Node (e.g. <red>)
      const tagName = child.tagName.toLowerCase();
      result += `<${tagName}>${getNodeRawXMLContent(child)}</${tagName}>`;
    }
  }
  return result;
}

// --- Markdown Parser ---
function parseMarkdown(text) {
  const sections = [];
  let title = '';
  
  // Extract title tag via RegExp first
  const titleRegex = /<title>([\s\S]*?)<\/title>/i;
  const titleMatch = titleRegex.exec(text);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }
  
  // XML DOMParser parsing (Standard case)
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<root>${text}</root>`, 'text/xml');
    
    // Check if there are any parsing errors
    const parserError = doc.querySelector('parsererror');
    if (!parserError) {
      // Find title node if exists via DOM
      const titleEl = doc.querySelector('title');
      if (titleEl) {
        title = getNodeRawXMLContent(titleEl).trim();
      }
      
      // Find all child tags of root
      const children = doc.documentElement.children;
      for (let i = 0; i < children.length; i++) {
        const sectionNode = children[i];
        if (sectionNode.tagName.toLowerCase() === 'title') continue; // skip title tag
        
        if (sectionNode.tagName.toLowerCase().startsWith('section')) {
          const sectionNum = parseInt(sectionNode.tagName.toLowerCase().replace('section', '')) || (i + 1);
          const rows = [];
          
          const rowNodes = sectionNode.children;
          for (let j = 0; j < rowNodes.length; j++) {
            const rowNode = rowNodes[j];
            if (rowNode.tagName.toLowerCase().startsWith('row')) {
              const rawText = getNodeRawXMLContent(rowNode) || '';
              // Replace '/' with newline (ignoring slashes inside XML closing tags), and trim spacing
              const processedText = rawText.split(/\s*(?<!<)\/(?!\s*>)\s*/).map(t => t.trim()).join('\n');
              rows.push(processedText);
            }
          }
          
          sections.push({
            index: sectionNum,
            rows: rows
          });
        }
      }
    }
  } catch (err) {
    console.warn("DOMParser failed, falling back to Regex parser.", err);
  }
  
  // Fallback: Regular Expression Parsing (if XML tags are slightly malformed)
  if (sections.length === 0) {
    const sectionRegex = /<section(\d+)>([\s\S]*?)<\/section\1>/gi;
    const rowRegex = /<row(\d+)>([\s\S]*?)<\/row\1>/gi;
    
    let sectionMatch;
    while ((sectionMatch = sectionRegex.exec(text)) !== null) {
      const sectionNum = parseInt(sectionMatch[1]);
      const sectionContent = sectionMatch[2];
      const rows = [];
      
      let rowMatch;
      while ((rowMatch = rowRegex.exec(sectionContent)) !== null) {
        const rawText = rowMatch[2];
        const processedText = rawText.split(/\s*(?<!<)\/(?!\s*>)\s*/).map(t => t.trim()).join('\n');
        rows.push(processedText);
      }
      
      sections.push({
        index: sectionNum,
        rows: rows
      });
    }
  }
  
  return { title, sections };
}

// --- Dialog Distribution Logic ---
el.btnParseDistribute.addEventListener('click', () => {
  const text = el.markdownInput.value;
  const layout = el.layoutSelect.value;
  
  const parsed = parseMarkdown(text);
  const parsedSections = parsed.sections;
  const parsedTitle = parsed.title;
  
  if (parsedSections.length === 0 && !parsedTitle) {
    alert("有効なマークダウンタグ(<title>, <section1>, <row1>など)が見つかりませんでした。");
    return;
  }
  
  // Clear existing bubbles
  state.bubbles = [];
  state.selectedBubbleId = null;
  
  // Define panel center points (percentage values 0-100 of the 4:5 canvas)
  // Remember: the 3:4 manga image takes the height (100%), but horizontally
  // it is centered inside the 4:5 space (taking 93.75% width).
  // Left border is at 3.125%, right border is at 96.875%.
  const mangaW = 93.75;
  const leftOffset = 3.125;
  
  let panelCenters = [];
  if (layout === '2x2') {
    // 2x2 Grid inside the centered 3:4 manga area
    panelCenters = [
      { x: leftOffset + mangaW * 0.25, y: 25 }, // Panel 1 (Top-Left)
      { x: leftOffset + mangaW * 0.75, y: 25 }, // Panel 2 (Top-Right)
      { x: leftOffset + mangaW * 0.25, y: 75 }, // Panel 3 (Bottom-Left)
      { x: leftOffset + mangaW * 0.75, y: 75 }  // Panel 4 (Bottom-Right)
    ];
  } else if (layout === '1x4') {
    // 1x4 Vertical panel layout (straight top-to-bottom)
    panelCenters = [
      { x: 50, y: 12.5 }, // Panel 1
      { x: 50, y: 37.5 }, // Panel 2
      { x: 50, y: 62.5 }, // Panel 3
      { x: 50, y: 87.5 }  // Panel 4
    ];
  } else {
    // Center all
    panelCenters = [
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      { x: 50, y: 50 }
    ];
  }
  
  let bubbleIdCounter = 1;
  
  // 1. Distribute Title if exists
  if (parsedTitle) {
    const titleBubble = {
      id: bubbleIdCounter++,
      type: 'none', // Text only shape
      text: parsedTitle.split(/\s*(?<!<)\/(?!\s*>)\s*/).map(t => t.trim()).join('\n'), // split by / for potential line breaks
      x: 20, // Width 60% -> (100 - 60) / 2 = 20%
      y: 2, // Near the top border
      w: 60,
      h: 6,
      tailX: 50,
      tailY: 15,
      hasTail: false,
      fontSize: 26, // Larger title size
      fontFamily: "'Segoe UI', 'Noto Sans JP', sans-serif",
      align: 'center',
      textColor: '#000000',
      bgColor: '#ffffff',
      borderColor: '#000000',
      borderWidth: 0,
      panel: 0 // special panel index for title
    };
    state.bubbles.push(titleBubble);
  }
  
  // 2. Distribute panels dialogue
  parsedSections.forEach(section => {
    // Which panel indices does this section fall into? (1-indexed tag to 0-indexed panelCenters)
    let panelIdx = (section.index - 1) % panelCenters.length;
    let center = panelCenters[panelIdx];
    
    let totalRows = section.rows.length;
    section.rows.forEach((rowText, rowIndex) => {
      // Staggering offsets within the panel so they don't pile up directly on top of each other
      const rowOffset = rowIndex - (totalRows - 1) / 2;
      
      // Calculate stagger displacements
      let dx = 0;
      let dy = 0;
      if (layout === '2x2') {
        dx = rowOffset * 6.0;  // horizontal offset (stagger)
        dy = rowOffset * 8.0;  // vertical offset
      } else {
        dx = rowOffset * 5.0;
        dy = rowOffset * 10.0;
      }
      
      const targetX = center.x + dx;
      const targetY = center.y + dy;
      
      // Create new bubble object
      const bubble = {
        id: bubbleIdCounter++,
        type: 'ellipse',
        text: rowText,
        x: targetX - 10,  // top-left x (default width is 20%)
        y: targetY - 7,   // top-left y (default height is 14%)
        w: 20,
        h: 14,
        tailX: targetX + 5, // default tail pointing downwards and slightly right
        tailY: targetY + 22,
        hasTail: true,
        fontSize: 18,
        fontFamily: "'Segoe UI', 'Noto Sans JP', sans-serif", // default combo for clean Eng/Num & JP
        align: 'center',
        textColor: '#000000',
        bgColor: '#ffffff',
        borderColor: '#000000',
        borderWidth: 2,
        panel: section.index
      };
      
      state.bubbles.push(bubble);
    });
  });
  
  renderBubbles();
  selectBubble(null); // Deselect initial
  switchToTab('tab-editor');
});

// --- Speech Bubble Path & Geometric Generator Helper ---
function getBubblePathData(bubble, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  
  // Calculate tail coordinates relative to bubble element
  const tx = ((bubble.tailX - bubble.x) / bubble.w) * width;
  const ty = ((bubble.tailY - bubble.y) / bubble.h) * height;
  
  const hasTail = bubble.hasTail && bubble.type !== 'none';
  
  let pathD = '';
  let extraCircles = [];
  
  if (bubble.type === 'ellipse') {
    if (hasTail) {
      const theta = Math.atan2(ty - cy, tx - cx);
      const theta1 = theta - 0.22;
      const theta2 = theta + 0.22;
      
      const x1 = cx + rx * Math.cos(theta1);
      const y1 = cy + ry * Math.sin(theta1);
      const x2 = cx + rx * Math.cos(theta2);
      const y2 = cy + ry * Math.sin(theta2);
      
      pathD = `M ${x2} ${y2} L ${tx} ${ty} L ${x1} ${y1} A ${rx},${ry} 0 1,0 ${x2},${y2} Z`;
    } else {
      pathD = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }
  } else if (bubble.type === 'rect') {
    const r = Math.min(width * 0.15, height * 0.15);
    if (hasTail) {
      const cx = width / 2;
      const cy = height / 2;
      const dx = tx - cx;
      const dy = ty - cy;
      
      let edge = 'bottom';
      let baseCenter = cx;
      
      if (dx !== 0 || dy !== 0) {
        const tCandidates = [];
        
        if (dx > 0) {
          tCandidates.push({ t: (width - cx) / dx, edge: 'right' });
        } else if (dx < 0) {
          tCandidates.push({ t: -cx / dx, edge: 'left' });
        }
        
        if (dy > 0) {
          tCandidates.push({ t: (height - cy) / dy, edge: 'bottom' });
        } else if (dy < 0) {
          tCandidates.push({ t: -cy / dy, edge: 'top' });
        }
        
        let minT = Infinity;
        let selectedEdge = 'bottom';
        tCandidates.forEach(cand => {
          if (cand.t > 0 && cand.t < minT) {
            minT = cand.t;
            selectedEdge = cand.edge;
          }
        });
        
        edge = selectedEdge;
        
        if (edge === 'top' || edge === 'bottom') {
          baseCenter = cx + minT * dx;
        } else {
          baseCenter = cy + minT * dy;
        }
      }
      
      const edgeLength = (edge === 'top' || edge === 'bottom') ? width : height;
      const baseW = edgeLength * 0.20;
      
      if (edge === 'top' || edge === 'bottom') {
        baseCenter = Math.max(r + baseW / 2, Math.min(width - r - baseW / 2, baseCenter));
      } else {
        baseCenter = Math.max(r + baseW / 2, Math.min(height - r - baseW / 2, baseCenter));
      }
      
      pathD = `M ${r} 0 `;
      
      // Top Edge
      if (edge === 'top') {
        pathD += `L ${baseCenter - baseW/2} 0 L ${tx} ${ty} L ${baseCenter + baseW/2} 0 L ${width - r} 0 `;
      } else {
        pathD += `L ${width - r} 0 `;
      }
      pathD += `A ${r} ${r} 0 0 1 ${width} ${r} `;
      
      // Right Edge
      if (edge === 'right') {
        pathD += `L ${width} ${baseCenter - baseW/2} L ${tx} ${ty} L ${width} ${baseCenter + baseW/2} L ${width} ${height - r} `;
      } else {
        pathD += `L ${width} ${height - r} `;
      }
      pathD += `A ${r} ${r} 0 0 1 ${width - r} ${height} `;
      
      // Bottom Edge
      if (edge === 'bottom') {
        pathD += `L ${baseCenter + baseW/2} ${height} L ${tx} ${ty} L ${baseCenter - baseW/2} ${height} L ${r} ${height} `;
      } else {
        pathD += `L ${r} ${height} `;
      }
      pathD += `A ${r} ${r} 0 0 1 0 ${height - r} `;
      
      // Left Edge
      if (edge === 'left') {
        pathD += `L 0 ${baseCenter + baseW/2} L ${tx} ${ty} L 0 ${baseCenter - baseW/2} L 0 ${r} `;
      } else {
        pathD += `L 0 ${r} `;
      }
      pathD += `A ${r} ${r} 0 0 1 ${r} 0 Z`;
    } else {
      pathD = `M ${r} 0 L ${width - r} 0 A ${r} ${r} 0 0 1 ${width} ${r} L ${width} ${height - r} A ${r} ${r} 0 0 1 ${width - r} ${height} L ${r} ${height} A ${r} ${r} 0 0 1 0 ${height - r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    }
  } else if (bubble.type === 'cloud') {
    const N = 12;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const theta = (i * 2 * Math.PI) / N;
      pts.push({
        x: cx + rx * Math.cos(theta),
        y: cy + ry * Math.sin(theta)
      });
    }
    
    pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < N; i++) {
      const nextIdx = (i + 1) % N;
      const p1 = pts[i];
      const p2 = pts[nextIdx];
      const distVal = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const arcR = distVal * 0.72;
      pathD += ` A ${arcR},${arcR} 0 0,1 ${p2.x},${p2.y}`;
    }
    pathD += ' Z';
    
    if (hasTail) {
      const dx = tx - cx;
      const dy = ty - cy;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 0) {
        // Calculate the intersection of the tail vector with the ellipse boundary
        const t_border = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
        
        if (t_border < 1) {
          const minDim = Math.min(width, height);
          const L_outside = dist * (1 - t_border);
          // Scale circle sizes dynamically if the tail is very short
          const k = Math.min(1.0, L_outside / (minDim * 0.18));
          
          const r1 = minDim * 0.065 * k;
          const r2 = minDim * 0.04 * k;
          const r3 = minDim * 0.02 * k;
          
          // Place the circles only on the segment outside the bubble border
          const t1 = t_border + r1 / dist;
          const t3 = 1 - r3 / dist;
          const t2 = (t1 + t3) / 2;
          
          extraCircles = [
            { cx: cx + dx * t1, cy: cy + dy * t1, r: r1 },
            { cx: cx + dx * t2, cy: cy + dy * t2, r: r2 },
            { cx: cx + dx * t3, cy: cy + dy * t3, r: r3 }
          ];
        }
      }
    }
  } else if (bubble.type === 'scream') {
    const N = 24;
    const pts = [];
    const angleOffset = Math.atan2(ty - cy, tx - cx);
    
    let closestSpikeIdx = -1;
    let minAngleDiff = Infinity;
    
    for (let i = 0; i < N; i++) {
      const theta = (i * 2 * Math.PI) / N;
      let diff = Math.abs(theta - angleOffset);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      
      if (i % 2 === 0 && diff < minAngleDiff) {
        minAngleDiff = diff;
        closestSpikeIdx = i;
      }
    }
    
    for (let i = 0; i < N; i++) {
      const theta = (i * 2 * Math.PI) / N;
      if (hasTail && i === closestSpikeIdx) {
        pts.push({ x: tx, y: ty });
      } else {
        const isOuter = i % 2 === 0;
        const baseRadMult = isOuter ? 1.0 : 0.75;
        const variation = 0.07 * Math.sin(i * 1.7);
        const radX = rx * (baseRadMult + variation);
        const radY = ry * (baseRadMult + variation);
        
        pts.push({
          x: cx + radX * Math.cos(theta),
          y: cy + radY * Math.sin(theta)
        });
      }
    }
    pathD = `M ${pts[0].x} ${pts[0].y} ` + pts.map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
  }
  
  return { pathD, extraCircles };
}

// --- Speech Bubble SVG Drawing Helper ---
function getBubbleSvgMarkup(bubble, width, height, canvasW, canvasH) {
  if (bubble.type === 'none') {
    return '';
  }
  
  const fill = bubble.bgColor;
  const stroke = bubble.borderColor;
  const strokeW = bubble.borderWidth;
  
  const { pathD, extraCircles } = getBubblePathData(bubble, width, height);
  
  let extraSvg = '';
  if (extraCircles && extraCircles.length > 0) {
    const circlesMarkup = extraCircles.map(c => 
      `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" vector-effect="non-scaling-stroke" />`
    ).join('\n');
    
    // Secondary SVG overlay to keep thought tail circles perfectly circular
    extraSvg = `
      <svg class="bubble-svg" viewBox="0 0 ${width} ${height}" style="position: absolute; top:0; left:0; width:100%; height:100%;" overflow="visible">
        ${circlesMarkup}
      </svg>
    `;
  }
  
  return `
    <svg class="bubble-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="position: absolute; top:0; left:0; width:100%; height:100%;" overflow="visible">
      <path d="${pathD}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    </svg>
    ${extraSvg}
  `;
}
  
  // HTML Formatting for red tags
  function formatBubbleTextToHTML(text) {
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(/&lt;red&gt;([\s\S]*?)&lt;\/red&gt;/gi, '<span style="color: #ef4444; font-weight: inherit;">$1</span>');
  }
  
  // --- Render Bubbles Overlay ---
function renderBubbles() {
  el.bubblesOverlay.innerHTML = '';
  
  const canvasRect = el.bubblesOverlay.getBoundingClientRect();
  const canvasW = canvasRect.width;
  const canvasH = canvasRect.height;
  
  state.bubbles.forEach(bubble => {
    const bubbleW_px = (bubble.w / 100) * canvasW;
    const bubbleH_px = (bubble.h / 100) * canvasH;
    
    // Bubble element wrapper
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `bubble-element ${state.selectedBubbleId === bubble.id ? 'selected' : ''}`;
    bubbleDiv.style.left = `${bubble.x}%`;
    bubbleDiv.style.top = `${bubble.y}%`;
    bubbleDiv.style.width = `${bubble.w}%`;
    bubbleDiv.style.height = `${bubble.h}%`;
    bubbleDiv.style.zIndex = 10 + bubble.id;
    bubbleDiv.dataset.id = bubble.id;
    
    // SVG graphics markup
    bubbleDiv.innerHTML = getBubbleSvgMarkup(bubble, bubbleW_px, bubbleH_px, canvasW, canvasH);
    
    // Text container
    const textContainer = document.createElement('div');
    textContainer.className = `bubble-text-container align-${bubble.align}`;
    
    const textSpan = document.createElement('span');
    textSpan.className = 'bubble-text-content';
    
    // Support red text tags
    textSpan.innerHTML = formatBubbleTextToHTML(bubble.text);
    textSpan.style.color = bubble.textColor;
    textSpan.style.fontFamily = bubble.fontFamily;
    
    // Scale font size dynamically based on editor current size to look identical to export
    // Formula: bubble.fontSize * (currentEditorWidth / 1000)
    const scaledSize = Math.max(8, bubble.fontSize * (canvasW / 1000));
    textSpan.style.fontSize = `${scaledSize}px`;
    
    textContainer.appendChild(textSpan);
    bubbleDiv.appendChild(textContainer);
    
    // Resize Handles (NW, N, NE, E, SE, S, SW, W)
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    handles.forEach(h => {
      const handleDiv = document.createElement('div');
      handleDiv.className = `resize-handle handle-${h}`;
      handleDiv.dataset.handle = h;
      bubbleDiv.appendChild(handleDiv);
    });
    
    // Tail Handle (only visible for tail-supporting forms)
    const supportsTail = ['ellipse', 'rect', 'cloud', 'scream'].includes(bubble.type);
    if (supportsTail) {
      const tailHandle = document.createElement('div');
      // Convert canvas percentage back to bubble relative coordinates
      const tailRelX = ((bubble.tailX - bubble.x) / bubble.w) * 100;
      const tailRelY = ((bubble.tailY - bubble.y) / bubble.h) * 100;
      
      tailHandle.className = `tail-handle ${bubble.hasTail ? 'visible' : ''}`;
      tailHandle.style.left = `${tailRelX}%`;
      tailHandle.style.top = `${tailRelY}%`;
      bubbleDiv.appendChild(tailHandle);
    }
    
    el.bubblesOverlay.appendChild(bubbleDiv);
  });
}

// Recalculate dimensions on window resize to ensure vector SVGs render smoothly
window.addEventListener('resize', resizeCanvasContainer);

// --- Selected Bubble Details Synchronizer ---
function selectBubble(bubbleId) {
  state.selectedBubbleId = bubbleId;
  
  // Re-render to show selected outline & handles
  renderBubbles();
  
  if (bubbleId === null) {
    el.editorNoSelection.style.display = 'flex';
    el.editorControls.style.display = 'none';
    return;
  }
  
  const bubble = state.bubbles.find(b => b.id === bubbleId);
  if (!bubble) return;
  
  // Activate Tab
  el.tabBtnEditor.click();
  el.editorNoSelection.style.display = 'none';
  el.editorControls.style.display = 'block';
  
  // Load bubble details into fields
  el.bubbleTextInput.value = bubble.text;
  el.fontSizeNum.value = bubble.fontSize;
  el.fontSizeSlider.value = bubble.fontSize;
  el.fontFamilySelect.value = bubble.fontFamily;
  el.colorText.value = bubble.textColor;
  el.colorBg.value = bubble.bgColor;
  el.colorBorder.value = bubble.borderColor;
  el.borderWidthSlider.value = bubble.borderWidth;
  el.borderWidthVal.textContent = `${bubble.borderWidth}px`;
  el.tailToggle.checked = bubble.hasTail;
  
  // Set active align button
  el.alignBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-align') === bubble.align);
  });
  
  // Highlight bubble type
  const typeBtns = el.editorControls.querySelectorAll('.type-btn');
  typeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-type') === bubble.type);
  });
  
  // Show/Hide color controls based on bubble type (e.g. text-only has no border/bg)
  const isNone = bubble.type === 'none';
  el.colorBgWrapper.style.display = isNone ? 'none' : 'flex';
  el.colorBorderWrapper.style.display = isNone ? 'none' : 'flex';
  el.borderWidthWrapper.style.display = isNone ? 'none' : 'flex';
  el.tailToggleWrapper.style.display = isNone ? 'none' : 'flex';
}

// Deselect on clicking empty workspace canvas area
el.mangaCanvasContainer.addEventListener('pointerdown', (e) => {
  if (e.target === el.mangaCanvasContainer || e.target === el.mangaBgImage) {
    selectBubble(null);
  }
});

// --- Field Editing Listeners ---
function updateSelectedBubble(props) {
  if (state.selectedBubbleId === null) return;
  const bubble = state.bubbles.find(b => b.id === state.selectedBubbleId);
  if (!bubble) return;
  
  Object.assign(bubble, props);
  renderBubbles();
}

// Text Input
el.bubbleTextInput.addEventListener('input', (e) => {
  updateSelectedBubble({ text: e.target.value });
});

// Font Size
function handleFontSizeChange(size) {
  const numSize = parseInt(size) || 12;
  el.fontSizeNum.value = numSize;
  el.fontSizeSlider.value = numSize;
  updateSelectedBubble({ fontSize: numSize });
}
el.fontSizeNum.addEventListener('input', (e) => handleFontSizeChange(e.target.value));
el.fontSizeSlider.addEventListener('input', (e) => handleFontSizeChange(e.target.value));

// Font Family
el.fontFamilySelect.addEventListener('change', (e) => {
  updateSelectedBubble({ fontFamily: e.target.value });
});

// Alignment
el.alignBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const align = btn.getAttribute('data-align');
    el.alignBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateSelectedBubble({ align: align });
  });
});

// Colors
el.colorText.addEventListener('input', (e) => updateSelectedBubble({ textColor: e.target.value }));
el.colorBg.addEventListener('input', (e) => updateSelectedBubble({ bgColor: e.target.value }));
el.colorBorder.addEventListener('input', (e) => updateSelectedBubble({ borderColor: e.target.value }));

// Border Width
el.borderWidthSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value) || 0;
  el.borderWidthVal.textContent = `${val}px`;
  updateSelectedBubble({ borderWidth: val });
});

// Tail toggle
el.tailToggle.addEventListener('change', (e) => {
  updateSelectedBubble({ hasTail: e.target.checked });
});

// Change Bubble Type Button Trigger
const typeBtns = el.editorControls.querySelectorAll('.type-btn');
typeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.getAttribute('data-type');
    typeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    updateSelectedBubble({ type: type });
    // Refresh inspector visibility
    selectBubble(state.selectedBubbleId);
  });
});

// --- Action Listeners (Duplicate, Order, Delete) ---
el.btnAddBubble.addEventListener('click', () => {
  const id = state.bubbles.length > 0 ? Math.max(...state.bubbles.map(b => b.id)) + 1 : 1;
  const newBubble = {
    id: id,
    type: 'ellipse',
    text: 'セリフを入力',
    x: 40,
    y: 40,
    w: 20,
    h: 14,
    tailX: 45,
    tailY: 55,
    hasTail: true,
    fontSize: 18,
    fontFamily: "'Segoe UI', 'Noto Sans JP', sans-serif",
    align: 'center',
    textColor: '#000000',
    bgColor: '#ffffff',
    borderColor: '#000000',
    borderWidth: 2,
    panel: 1
  };
  state.bubbles.push(newBubble);
  selectBubble(id);
});

el.btnDelete.addEventListener('click', () => {
  if (state.selectedBubbleId === null) return;
  state.bubbles = state.bubbles.filter(b => b.id !== state.selectedBubbleId);
  selectBubble(null);
});

el.btnDuplicate.addEventListener('click', () => {
  if (state.selectedBubbleId === null) return;
  const original = state.bubbles.find(b => b.id === state.selectedBubbleId);
  if (!original) return;
  
  const id = Math.max(...state.bubbles.map(b => b.id)) + 1;
  const copy = {
    ...original,
    id: id,
    x: Math.min(80, original.x + 4), // Shift slightly right/down
    y: Math.min(80, original.y + 4),
    tailX: Math.min(100, original.tailX + 4),
    tailY: Math.min(100, original.tailY + 4)
  };
  
  state.bubbles.push(copy);
  selectBubble(id);
});

el.btnBringFront.addEventListener('click', () => {
  if (state.selectedBubbleId === null) return;
  const index = state.bubbles.findIndex(b => b.id === state.selectedBubbleId);
  if (index === -1) return;
  
  const bubble = state.bubbles.splice(index, 1)[0];
  state.bubbles.push(bubble);
  selectBubble(bubble.id);
});

el.btnSendBack.addEventListener('click', () => {
  if (state.selectedBubbleId === null) return;
  const index = state.bubbles.findIndex(b => b.id === state.selectedBubbleId);
  if (index === -1) return;
  
  const bubble = state.bubbles.splice(index, 1)[0];
  state.bubbles.unshift(bubble);
  selectBubble(bubble.id);
});

// Key bindings
window.addEventListener('keydown', (e) => {
  // If editing text in input fields, do not trigger key shortcuts
  if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') {
    return;
  }
  
  if (e.key === 'Delete' || e.key === 'Backspace') {
    el.btnDelete.click();
  } else if (e.key === 'Escape') {
    selectBubble(null);
  } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    if (state.selectedBubbleId !== null) {
      const bubble = state.bubbles.find(b => b.id === state.selectedBubbleId);
      if (bubble) {
        const step = e.shiftKey ? 5 : 1;
        if (e.key === 'ArrowLeft') {
          if (bubble.panel !== 0) { // Don't nudge title horizontally
            bubble.x = Math.max(0, bubble.x - step);
            bubble.tailX = Math.max(0, bubble.tailX - step);
          }
        } else if (e.key === 'ArrowRight') {
          if (bubble.panel !== 0) { // Don't nudge title horizontally
            bubble.x = Math.min(100 - bubble.w, bubble.x + step);
            bubble.tailX = Math.min(100, bubble.tailX + step);
          }
        } else if (e.key === 'ArrowUp') {
          bubble.y = Math.max(0, bubble.y - step);
          bubble.tailY = Math.max(0, bubble.tailY - step);
        } else if (e.key === 'ArrowDown') {
          bubble.y = Math.min(100 - bubble.h, bubble.y + step);
          bubble.tailY = Math.min(100, bubble.tailY + step);
        }
        renderBubbles();
        e.preventDefault(); // Prevent page scrolling
      }
    }
  }
});

// --- Pointer Interaction Drag & Resize Engine ---
el.bubblesOverlay.addEventListener('pointerdown', (e) => {
  const target = e.target;
  
  // 1. Check if clicking tail handle
  if (target.classList.contains('tail-handle')) {
    e.stopPropagation();
    const bubbleEl = target.closest('.bubble-element');
    const bubbleId = parseInt(bubbleEl.dataset.id);
    const bubble = state.bubbles.find(b => b.id === bubbleId);
    
    state.activeAction = 'moving-tail';
    state.selectedBubbleId = bubbleId;
    document.body.setAttribute('data-action', 'moving-tail');
    
    const rect = el.bubblesOverlay.getBoundingClientRect();
    state.dragStart = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
    state.dragStartBubble = { ...bubble };
    target.setPointerCapture(e.pointerId);
    return;
  }
  
  // 2. Check if clicking resize handle
  if (target.classList.contains('resize-handle')) {
    e.stopPropagation();
    const bubbleEl = target.closest('.bubble-element');
    const bubbleId = parseInt(bubbleEl.dataset.id);
    const bubble = state.bubbles.find(b => b.id === bubbleId);
    
    state.activeAction = 'resizing';
    state.activeHandle = target.dataset.handle;
    state.selectedBubbleId = bubbleId;
    document.body.setAttribute('data-action', `resizing-${target.dataset.handle}`);
    
    const rect = el.bubblesOverlay.getBoundingClientRect();
    state.dragStart = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
    state.dragStartBubble = { ...bubble };
    target.setPointerCapture(e.pointerId);
    return;
  }
  
  // 3. Check if clicking bubble body/text
  const bubbleTextContainer = target.closest('.bubble-text-container');
  if (bubbleTextContainer) {
    e.stopPropagation();
    const bubbleEl = bubbleTextContainer.closest('.bubble-element');
    const bubbleId = parseInt(bubbleEl.dataset.id);
    const bubble = state.bubbles.find(b => b.id === bubbleId);
    
    selectBubble(bubbleId);
    
    state.activeAction = 'dragging';
    document.body.setAttribute('data-action', 'dragging');
    
    const rect = el.bubblesOverlay.getBoundingClientRect();
    state.dragStart = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
    state.dragStartBubble = { ...bubble };
    bubbleTextContainer.setPointerCapture(e.pointerId);
  }
});

el.bubblesOverlay.addEventListener('pointermove', (e) => {
  if (!state.activeAction || state.selectedBubbleId === null) return;
  
  const bubble = state.bubbles.find(b => b.id === state.selectedBubbleId);
  if (!bubble) return;
  
  const rect = el.bubblesOverlay.getBoundingClientRect();
  const curX = ((e.clientX - rect.left) / rect.width) * 100;
  const curY = ((e.clientY - rect.top) / rect.height) * 100;
  
  const dx = curX - state.dragStart.x;
  const dy = curY - state.dragStart.y;
  
  if (state.activeAction === 'dragging') {
    // Clamp bubble inside canvas boundaries
    bubble.x = Math.max(0, Math.min(100 - bubble.w, state.dragStartBubble.x + dx));
    bubble.y = Math.max(0, Math.min(100 - bubble.h, state.dragStartBubble.y + dy));
    
    // If it is the title, keep it centered horizontally!
    if (bubble.panel === 0) {
      bubble.x = (100 - bubble.w) / 2;
    }
    
    // Statically drag the tail along with the bubble displacement!
    bubble.tailX = Math.max(0, Math.min(100, state.dragStartBubble.tailX + dx));
    bubble.tailY = Math.max(0, Math.min(100, state.dragStartBubble.tailY + dy));
  } 
  else if (state.activeAction === 'moving-tail') {
    // Move tail tip independently
    bubble.tailX = Math.max(0, Math.min(100, state.dragStartBubble.tailX + dx));
    bubble.tailY = Math.max(0, Math.min(100, state.dragStartBubble.tailY + dy));
  } 
  else if (state.activeAction === 'resizing') {
    const minSize = 4; // minimum dimensions %
    const handle = state.activeHandle;
    const start = state.dragStartBubble;
    
    // East / West
    if (handle.includes('e')) {
      bubble.w = Math.max(minSize, Math.min(100 - start.x, start.w + dx));
    } else if (handle.includes('w')) {
      const targetW = Math.max(minSize, start.w - dx);
      const targetX = start.x + (start.w - targetW);
      if (targetX >= 0) {
        bubble.x = targetX;
        bubble.w = targetW;
      }
    }
    
    // South / North
    if (handle.includes('s')) {
      bubble.h = Math.max(minSize, Math.min(100 - start.y, start.h + dy));
    } else if (handle.includes('n')) {
      const targetH = Math.max(minSize, start.h - dy);
      const targetY = start.y + (start.h - targetH);
      if (targetY >= 0) {
        bubble.y = targetY;
        bubble.h = targetH;
      }
    }
    
    // If it is the title, enforce horizontal centering!
    if (bubble.panel === 0) {
      bubble.x = (100 - bubble.w) / 2;
    }
  }
  
  renderBubbles();
});

el.bubblesOverlay.addEventListener('pointerup', (e) => {
  if (state.activeAction) {
    e.target.releasePointerCapture(e.pointerId);
    state.activeAction = null;
    state.activeHandle = null;
    document.body.removeAttribute('data-action');
    // Reselect to keep input bindings refreshed
    selectBubble(state.selectedBubbleId);
  }
});

el.bubblesOverlay.addEventListener('pointercancel', (e) => {
  if (state.activeAction) {
    state.activeAction = null;
    state.activeHandle = null;
    document.body.removeAttribute('data-action');
    renderBubbles();
  }
});

// Double click on a bubble to immediately focus text editor in sidebar
el.bubblesOverlay.addEventListener('dblclick', (e) => {
  const textContainer = e.target.closest('.bubble-text-container');
  if (textContainer) {
    const bubbleEl = textContainer.closest('.bubble-element');
    const bubbleId = parseInt(bubbleEl.dataset.id);
    selectBubble(bubbleId);
    
    // Focus sidebar text editor and highlight text
    el.bubbleTextInput.focus();
    el.bubbleTextInput.select();
  }
});

// --- Rich Text Parser for Canvas ---
function parseTextToSegments(text, defaultColor) {
  const segments = [];
  const regex = /<red>([\s\S]*?)<\/red>/gi;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        color: defaultColor
      });
    }
    segments.push({
      text: match[1],
      color: '#ef4444' // red
    });
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      color: defaultColor
    });
  }
  
  if (segments.length === 0) {
    segments.push({ text: text, color: defaultColor });
  }
  
  return segments;
}

// --- Rich Text Wrap Canvas Helper ---
function wrapSegmentsCanvas(ctx, segments, maxW) {
  const lines = [];
  let currentLine = [];
  let currentLineWidth = 0;
  
  const splitSegments = [];
  segments.forEach(seg => {
    const parts = seg.text.split('\n');
    parts.forEach((part, idx) => {
      if (idx > 0) {
        splitSegments.push({ text: '\n', color: seg.color });
      }
      if (part !== '') {
        splitSegments.push({ text: part, color: seg.color });
      }
    });
  });
  
  for (let i = 0; i < splitSegments.length; i++) {
    const seg = splitSegments[i];
    if (seg.text === '\n') {
      lines.push(currentLine);
      currentLine = [];
      currentLineWidth = 0;
      continue;
    }
    
    // Tokenize text: spaces, English/alphanumeric words, or single characters (Japanese/punctuation)
    const tokens = seg.text.match(/\s+|[a-zA-Z0-9'’\-]+|./g) || [];
    
    let activeSegText = '';
    for (let token of tokens) {
      let testWidth = ctx.measureText(token).width;
      
      // If adding this token exceeds maxW
      if (currentLineWidth + testWidth > maxW && currentLineWidth > 0) {
        // Wrap to the next line
        if (activeSegText !== '') {
          currentLine.push({ text: activeSegText, color: seg.color });
          activeSegText = '';
        }
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
        
        // If it's a space at the start of a new line, we can skip it
        if (/^\s+$/.test(token)) {
          continue;
        }
      }
      
      // If the token itself is wider than maxW (e.g. an extremely long English word)
      if (testWidth > maxW) {
        // We must break this token character-by-character to prevent overflow
        const chars = token.split('');
        for (let char of chars) {
          let charW = ctx.measureText(char).width;
          if (currentLineWidth + charW > maxW && currentLineWidth > 0) {
            if (activeSegText !== '') {
              currentLine.push({ text: activeSegText, color: seg.color });
              activeSegText = '';
            }
            lines.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
          }
          activeSegText += char;
          currentLineWidth += charW;
        }
      } else {
        activeSegText += token;
        currentLineWidth += testWidth;
      }
    }
    
    if (activeSegText !== '') {
      currentLine.push({ text: activeSegText, color: seg.color });
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
}

// --- Canvas Bubble Drawing Engine ---
function drawBubbleOnCanvas(ctx, bubble, canvasW, canvasH) {
  const x = (bubble.x / 100) * canvasW;
  const y = (bubble.y / 100) * canvasH;
  const w = (bubble.w / 100) * canvasW;
  const h = (bubble.h / 100) * canvasH;
  
  const fill = bubble.bgColor;
  const stroke = bubble.borderColor;
  const strokeW = bubble.borderWidth;
  
  ctx.save();
  ctx.translate(x, y);
  
  if (bubble.type !== 'none') {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.lineJoin = 'round';
    
    const { pathD, extraCircles } = getBubblePathData(bubble, w, h);
    
    // Draw bubble outline using identical Path2D (preserves vector SVG geometry, e.g. cloud arcs)
    const path2D = new Path2D(pathD);
    ctx.fill(path2D);
    if (strokeW > 0) {
      ctx.stroke(path2D);
    }
    
    // Draw extra circles for cloud bubble
    if (extraCircles && extraCircles.length > 0) {
      extraCircles.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, c.r, 0, 2 * Math.PI);
        ctx.fill();
        if (strokeW > 0) {
          ctx.stroke();
        }
      });
    }
  }
  
  // --- Render Wrapped Text ---
  // Scale font size dynamically relative to export canvas width
  const fontSize = bubble.fontSize * (canvasW / 1000);
  
  // All text inside bubbles is bold
  ctx.font = `bold ${fontSize}px ${bubble.fontFamily}`;
  ctx.textBaseline = 'middle';
  
  // Horizontal margins inside the bubble (using relative 5% padding to match the editor)
  const padX = w * 0.05;
  const maxTextW = w - 2 * padX;
  
  // Parse rich text segments and wrap them
  const segments = parseTextToSegments(bubble.text, bubble.textColor);
  const wrappedLines = wrapSegmentsCanvas(ctx, segments, maxTextW);
  const lineH = fontSize * 1.35;
  const totalTextH = wrappedLines.length * lineH;
  
  const cx = w / 2;
  const cy = h / 2;
  
  // Centered Y start coordinate
  const startY = cy - totalTextH / 2 + lineH / 2;
  
  // Draw left-aligned chunks sequentially for accurate positioning of colored segments
  ctx.textAlign = 'left';
  
  wrappedLines.forEach((line, idx) => {
    // Calculate total width of this line
    let wLine = 0;
    line.forEach(seg => {
      wLine += ctx.measureText(seg.text).width;
    });
    
    // Calculate horizontal start position
    let lineX = cx - wLine / 2; // Center
    if (bubble.align === 'left') lineX = padX;
    if (bubble.align === 'right') lineX = w - padX - wLine;
    
    const lineY = startY + idx * lineH;
    
    // Draw each segment sequentially
    let currentX = lineX;
    line.forEach(seg => {
      ctx.fillStyle = seg.color;
      ctx.fillText(seg.text, currentX, lineY);
      currentX += ctx.measureText(seg.text).width;
    });
  });
  
  ctx.restore();
}

// --- Canvas High Resolution Export ---
el.btnExportImage.addEventListener('click', () => {
  if (!state.mangaImage) return;
  
  const scale = parseFloat(el.exportScale.value) || 2.0;
  
  // Uploaded image aspect ratio is 3:4 portrait
  // Output export image MUST be 4:5 aspect ratio
  // Base dimensions match original height for 100% pixel quality preservation
  const originalH = state.imageHeight;
  const originalW = state.imageWidth;
  
  // 4:5 width calculations based on height: Width = Height * 0.8
  const exportH = originalH * scale;
  const exportW = originalH * 0.8 * scale;
  
  // Centering 3:4 original image inside 4:5 canvas
  // Original width inside 4:5 is Height * 0.75
  const scaledImageW = originalH * 0.75 * scale;
  const scaledImageH = originalH * scale;
  const offsetX = (exportW - scaledImageW) / 2; // margins on both sides
  
  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = exportW;
  canvas.height = exportH;
  
  const ctx = canvas.getContext('2d');
  
  // 1. Fill entire 4:5 canvas with solid white (as padding)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportW, exportH);
  
  // 2. Draw centered 3:4 manga image
  ctx.drawImage(state.mangaImage, offsetX, 0, scaledImageW, scaledImageH);
  
  // 3. Draw all speech bubbles
  // Render them scaling border weights and font sizes to the output resolution
  state.bubbles.forEach(bubble => {
    drawBubbleOnCanvas(ctx, bubble, exportW, exportH);
  });
  
  // Helper to extract a clean filename from title or image file name
  function getExportFilename() {
    const titleBubble = state.bubbles.find(b => b.panel === 0);
    let titleText = '';
    if (titleBubble) {
      titleText = titleBubble.text;
    }
    
    if (!titleText.trim()) {
      return state.imageFileName.substring(0, state.imageFileName.lastIndexOf('.')) || 'manga';
    }
    
    // Clean up title text:
    // 1. Strip XML tags (like <red>...</red>)
    let cleanName = titleText.replace(/<[^>]+>/g, '');
    
    // 2. Replace newlines/slashes with space
    cleanName = cleanName.replace(/[\n\r]+/g, ' ').trim();
    
    // 3. Replace invalid Windows filename characters: \ / : * ? " < > |
    cleanName = cleanName.replace(/[\\/:*?"<>|]/g, '_');
    
    return cleanName;
  }

  // 4. Download file
  const link = document.createElement('a');
  const exportName = getExportFilename();
  link.download = `${exportName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// --- Auto-Resize Canvas Container to fit exactly 4:5 aspect ratio ---
function resizeCanvasContainer() {
  const wrapper = document.querySelector('.canvas-outer-wrapper');
  const container = el.mangaCanvasContainer;
  if (!wrapper || !container) return;
  
  const wrapW = wrapper.clientWidth;
  const wrapH = wrapper.clientHeight;
  if (wrapW === 0 || wrapH === 0) return;
  
  // Fit 4:5 box inside wrapper (4/5 = 0.8)
  const parentRatio = wrapW / wrapH;
  if (parentRatio > 0.8) {
    // Height is limiting factor
    container.style.height = `${wrapH}px`;
    container.style.width = `${wrapH * 0.8}px`;
  } else {
    // Width is limiting factor
    container.style.width = `${wrapW}px`;
    container.style.height = `${wrapW / 0.8}px`;
  }
  
  // Re-render bubbles with new dimensions
  renderBubbles();
}

// --- Initialize App ---
initTheme();
selectBubble(null);
resizeCanvasContainer();
