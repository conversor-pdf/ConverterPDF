// Tab Navigation
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const historyCount = document.getElementById('history-count');
let currentSessionImages = []; // Stores blobs of converted images

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).style.display = 'block';
        
        if (tabId === 'history-tab') {
            historyCount.style.display = 'inline';
            loadHistory();
        } else if (tabId === 'gabarito-tab') {
            historyCount.style.display = 'none';
            // Optional: Auto-load something here
        } else {
            historyCount.style.display = 'none';
        }
    });
});

// Format Selection
const formatCards = document.querySelectorAll('.format-card');
let selectedFormat = 'png';
formatCards.forEach(card => {
    card.addEventListener('click', () => {
        formatCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedFormat = card.getAttribute('data-format');
    });
});

// File Management
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const convertBtn = document.getElementById('convert-btn');
let currentFiles = [];

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
});
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});
dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files), false);
fileInput.addEventListener('change', function() { handleFiles(this.files); });

function handleFiles(files) {
    if (files.length > 0) {
        let hasPdfs = false;
        for(let i=0; i<files.length; i++) {
            const file = files[i];
            if (file.name.toLowerCase().endsWith('.pdf')) {
                hasPdfs = true;
                currentFiles.push({
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: file.size,
                    fileObj: file
                });
            }
        }
        if (hasPdfs) updateFileUi();
        else alert('Por favor, selecione apenas arquivos PDF.');
    }
}

window.removeFile = function(id) {
    currentFiles = currentFiles.filter(f => f.id !== id);
    if (currentFiles.length === 0) {
        fileInput.value = '';
        dropZone.style.display = 'block';
        document.getElementById('selected-files-container').style.display = 'none';
        convertBtn.disabled = true;
    } else {
        updateFileUi();
    }
}

document.getElementById('remove-all-btn').addEventListener('click', () => {
    currentFiles = [];
    fileInput.value = '';
    dropZone.style.display = 'block';
    document.getElementById('selected-files-container').style.display = 'none';
    convertBtn.disabled = true;
});

function updateFileUi() {
    const container = document.getElementById('selected-files-container');
    const list = document.getElementById('selected-files-list');
    const countEl = document.getElementById('file-count');
    countEl.textContent = currentFiles.length;
    list.innerHTML = '';
    currentFiles.forEach(file => {
        const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
        list.insertAdjacentHTML('beforeend', `
            <div class="selected-file">
                <div class="file-info">
                    <div class="file-icon red-pdf"><i class="ph-fill ph-file-pdf"></i></div>
                    <div class="file-details"><h3>${file.name}</h3><p>${sizeStr}</p></div>
                </div>
                <button class="remove-file-btn" onclick="removeFile('${file.id}')"><i class="ph ph-x"></i></button>
            </div>
        `);
    });
    dropZone.style.display = 'none';
    container.style.display = 'block';
    convertBtn.disabled = false;
}

// Convert Button (Web Version)
convertBtn.addEventListener('click', async () => {
    if (currentFiles.length === 0) return;
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
    showStatus('Enviando arquivos para o servidor...', 'Processando...', true);

    const formData = new FormData();
    currentFiles.forEach(file => {
        formData.append('files', file.fileObj);
    });
    formData.append('format', selectedFormat);

    try {
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFiles.length > 1 ? 'conversoes_wtech.zip' : currentFiles[0].name.replace('.pdf', `.${selectedFormat}`);
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            showStatus('Conversão concluída com sucesso!', 'Pronto', false);
            addToHistory(currentFiles, selectedFormat);
            
            // Adicionar ao array da sessão para o Gabarito
            const blobUrl = URL.createObjectURL(blob);
            currentSessionImages.push({
                url: blobUrl,
                blob: blob,
                name: currentFiles[0].name
            });
            
            // Limpar lista após sucesso
            currentFiles = [];
            document.getElementById('file-input').value = '';
            dropZone.style.display = 'block';
            document.getElementById('selected-files-container').style.display = 'none';
            convertBtn.disabled = true;
            
            document.querySelector('[data-tab="history-tab"]').click();
        } else {
            let errorMsg = 'Erro na conversão';
            try {
                const error = await response.json();
                errorMsg = error.error || errorMsg;
            } catch (jsonErr) {
                errorMsg = `Erro do servidor (${response.status}): O servidor não retornou uma resposta válida.`;
            }
            throw new Error(errorMsg);
        }
    } catch (e) {
        showStatus('Erro: ' + e.message, 'Erro', false, true);
        alert('Erro: ' + e.message);
    } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Converter agora';
    }
});

function showStatus(logMsg, statusMsg, isProcessing, isError = false) {
    console.log(logMsg);
    document.getElementById('status-text').textContent = statusMsg;
    const dot = document.querySelector('.status-dot');
    dot.className = 'status-dot' + (isProcessing ? ' processing' : (isError ? ' error' : ''));
}

// History (LocalStorage based for Web)
function addToHistory(files, format) {
    const history = JSON.parse(localStorage.getItem('wtech_history') || '[]');
    files.forEach(f => {
        history.unshift({
            name: f.name.replace('.pdf', `.${format}`),
            original: f.name,
            format: format,
            date: new Date().toISOString()
        });
    });
    localStorage.setItem('wtech_history', JSON.stringify(history.slice(0, 20))); // Keep last 20
}

function loadHistory() {
    const list = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('wtech_history') || '[]');
    document.getElementById('history-count').textContent = history.length + ' itens';
    
    if (history.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhum arquivo convertido nesta sessão.</div>';
        return;
    }

    list.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-icon png-icon" style="background: rgba(239, 68, 68, 0.1); color: #EF4444; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 16px;"><i class="ph-fill ph-image"></i></div>
            <div class="history-details" style="flex: 1;">
                <h3 style="font-size: 14px; font-weight: 500; margin-bottom: 4px;">${item.name}</h3>
                <p style="font-size: 12px; color: var(--text-muted);">Convertido de ${item.original}</p>
            </div>
            <div class="history-meta" style="display: flex; align-items: center; gap: 16px; margin-right: 24px;">
                <span class="badge png-badge" style="background: #EF4444; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${item.format.toUpperCase()}</span>
                <span class="history-size-time" style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Web Session<br>${new Date(item.date).toLocaleTimeString()}</span>
            </div>
        </div>
    `).join('');
}

// Clear History Logic
document.getElementById('clear-history-btn').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja excluir todo o histórico de conversões?')) {
        localStorage.removeItem('wtech_history');
        loadHistory();
    }
});

// Gabarito Logic
const allocateBtn = document.getElementById('allocate-btn');
const clearGridBtn = document.getElementById('clear-grid-btn');
const importImgsBtn = document.getElementById('import-imgs-btn');
const gabaritoFileInput = document.getElementById('gabarito-file-input');
const gridCells = document.querySelectorAll('.grid-cell');
const exportBtns = document.querySelectorAll('.export-btn');

importImgsBtn.addEventListener('click', () => gabaritoFileInput.click());

gabaritoFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
        const blobUrl = URL.createObjectURL(file);
        currentSessionImages.push({
            url: blobUrl,
            blob: file,
            name: file.name
        });
    });

    showStatus(`${files.length} imagens importadas!`, 'Pronto', false);
    // Opcional: auto-alocar se a grade estiver vazia?
    if (Array.from(gridCells).every(c => c.innerHTML === '')) {
        allocateBtn.click();
    }
});

allocateBtn.addEventListener('click', () => {
    if (currentSessionImages.length === 0) {
        alert('Nenhuma imagem convertida nesta sessão para alocar.');
        return;
    }

    // Limpar grade antes
    gridCells.forEach(cell => cell.innerHTML = '');

    // Alocar até 15 imagens
    currentSessionImages.slice(0, 15).forEach((imgData, index) => {
        if (index < gridCells.length) {
            const img = document.createElement('img');
            img.src = imgData.url;
            gridCells[index].appendChild(img);
        }
    });
    
    showStatus('Imagens alocadas no gabarito!', 'Pronto', false);
});

clearGridBtn.addEventListener('click', () => {
    gridCells.forEach(cell => cell.innerHTML = '');
    showStatus('Grade limpa', 'Pronto', false);
});

exportBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        const format = btn.getAttribute('data-format');
        const imagesInGrid = [];
        
        // Coletar apenas as imagens que estão na grade
        gridCells.forEach(cell => {
            const img = cell.querySelector('img');
            if (img) {
                // Encontrar o blob original correspondente
                const imgData = currentSessionImages.find(d => d.url === img.src);
                if (imgData) imagesInGrid.push(imgData.blob);
            }
        });

        if (imagesInGrid.length === 0) {
            alert('A grade está vazia. Aloque imagens antes de exportar.');
            return;
        }

        showStatus(`Exportando para ${format.toUpperCase()}...`, 'Processando...', true);

        const formData = new FormData();
        formData.append('format', format);
        imagesInGrid.forEach((blob, i) => {
            formData.append('images', blob, `image_${i}.png`);
        });

        try {
            const response = await fetch('/api/export-grid', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const resultBlob = await response.blob();
                const url = window.URL.createObjectURL(resultBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gabarito_wtech.${format}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                showStatus('Exportação concluída!', 'Pronto', false);
            } else {
                throw new Error('Falha no servidor ao exportar');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao exportar gabarito: ' + err.message);
            showStatus('Erro na exportação', 'Pronto', true);
        }
    });
});
