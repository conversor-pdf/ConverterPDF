// Tab Navigation
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const historyCount = document.getElementById('history-count');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.style.display = 'none');
        
        // Add active class to clicked
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).style.display = 'block';

        if (tabId === 'history-tab') {
            historyCount.style.display = 'inline';
            loadHistory();
        } else {
            historyCount.style.display = 'none';
        }
    });
});

// Format Selection
const formatCards = document.querySelectorAll('.format-card');
let selectedFormat = 'docx';

formatCards.forEach(card => {
    card.addEventListener('click', () => {
        formatCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedFormat = card.getAttribute('data-format');
    });
});

// File Upload
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const selectedFileDiv = document.getElementById('selected-file');
const removeFileBtn = document.getElementById('remove-file-btn');
const fileNameEl = document.getElementById('file-name');
const fileMetaEl = document.getElementById('file-meta');
const convertBtn = document.getElementById('convert-btn');

let currentFile = null;

// Drag and drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

fileInput.addEventListener('change', function() {
    handleFiles(this.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.pdf')) {
            // Need to pass file path to python. In web browsers, file.path is sometimes available (in Electron).
            // But Eel uses Chrome, so file.path might not be directly accessible due to security.
            // Let's actually ask Python to open a file dialog, OR read file as base64 and send to python, OR rely on Eel's specific features.
            // Actually, we can read the file using FileReader to get base64 if needed, but it's inefficient for large PDFs.
            // Eel exposes a way to call python. Let's use Python's file dialog for simplicity, or we can use the HTML file input and send it via JS.
            // Wait, we can just send the path if it's available, otherwise we use Python dialog.
            let filePath = file.path; // Available in Electron/NW.js and sometimes local chrome apps
            if (!filePath) {
                // Read as array buffer and pass to Python, OR let Python open the dialog.
                readAndSetFile(file);
            } else {
                setFileUi(file.name, file.size, filePath);
            }
        } else {
            alert('Por favor, selecione um arquivo PDF.');
        }
    }
}

function readAndSetFile(file) {
    currentFile = {
        name: file.name,
        size: file.size,
        fileObj: file
    };
    setFileUi(file.name, file.size, null);
}

function setFileUi(name, size, path) {
    currentFile = { name, size, path };
    fileNameEl.textContent = name;
    
    // Format size
    let sizeStr = '';
    if (size > 1024 * 1024) {
        sizeStr = (size / (1024 * 1024)).toFixed(1) + ' MB';
    } else {
        sizeStr = (size / 1024).toFixed(1) + ' KB';
    }
    
    fileMetaEl.textContent = sizeStr; // We will get page count later via Python if possible
    
    dropZone.style.display = 'none';
    selectedFileDiv.style.display = 'flex';
    convertBtn.disabled = false;
}

removeFileBtn.addEventListener('click', () => {
    currentFile = null;
    fileInput.value = '';
    dropZone.style.display = 'block';
    selectedFileDiv.style.display = 'none';
    convertBtn.disabled = true;
});

// Setting Button
document.querySelector('.settings-btn').addEventListener('click', async () => {
    // Call python to select destination folder
    const folder = await window.pywebview.api.select_output_folder();
    if (folder) {
        showStatus(`Pasta de destino definida para: ${folder}`, 'Pronto', false);
    }
});

// Convert Button
convertBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    
    const ocrEnabled = document.getElementById('ocr-checkbox').checked;
    
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Convertendo...';
    showStatus('Processando arquivo...', 'Convertendo...', true);
    
    try {
        let result;
        if (currentFile.path) {
            // Send path directly
            result = await window.pywebview.api.convert_pdf(currentFile.path, selectedFormat, ocrEnabled);
        } else {
            // We need to read the file and send as base64
            const reader = new FileReader();
            reader.onload = async function(e) {
                const base64Data = e.target.result.split(',')[1]; // Remove data URL part
                result = await window.pywebview.api.convert_pdf_base64(currentFile.name, base64Data, selectedFormat, ocrEnabled);
                handleConvertResult(result);
            };
            reader.readAsDataURL(currentFile.fileObj);
            return; // Exit here, handled in onload
        }
        handleConvertResult(result);
    } catch (e) {
        console.error(e);
        handleConvertResult({ success: false, error: String(e) });
    }
});

function handleConvertResult(result) {
    if (result.success) {
        showStatus('Conversão concluída com sucesso', 'Pronto', false);
        // Switch to history tab
        document.querySelector('[data-tab="history-tab"]').click();
    } else {
        showStatus(`Erro: ${result.error}`, 'Erro', false, true);
        alert(`Erro na conversão: ${result.error}`);
    }
    
    convertBtn.disabled = false;
    convertBtn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Converter agora';
}

function showStatus(logMsg, statusMsg, isProcessing, isError = false) {
    console.log(logMsg);
    const textEl = document.getElementById('status-text');
    const dotEl = document.querySelector('.status-dot');
    
    textEl.textContent = statusMsg;
    dotEl.className = 'status-dot';
    if (isProcessing) {
        dotEl.classList.add('processing');
    } else if (isError) {
        dotEl.classList.add('error');
    }
}

// History
async function loadHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Carregando...</div>';
    
    try {
        const history = await window.pywebview.api.get_history();
        historyCount.textContent = `${history.length} itens`;
        
        if (history.length === 0) {
            historyList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhum arquivo convertido ainda.</div>';
            return;
        }
        
        historyList.innerHTML = '';
        history.forEach(item => {
            const ext = item.format;
            let iconClass = `${ext}-icon`;
            let badgeClass = `${ext}-badge`;
            let iconElement = '';
            
            switch(ext) {
                case 'docx': iconElement = '<i class="ph-fill ph-file-doc"></i>'; break;
                case 'xlsx': iconElement = '<i class="ph-fill ph-file-xls"></i>'; break;
                case 'pptx': iconElement = '<i class="ph-fill ph-file-ppt"></i>'; break;
                case 'png': iconElement = '<i class="ph-fill ph-image"></i>'; break;
                case 'txt': iconElement = '<i class="ph-fill ph-file-text"></i>'; break;
                case 'html': iconElement = '<i class="ph-fill ph-file-code"></i>'; break;
                case 'epub': iconElement = '<i class="ph-fill ph-book-open"></i>'; break;
                default: iconElement = '<i class="ph-fill ph-file"></i>';
            }
            
            // Format time
            const date = new Date(item.timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            
            let timeStr = '';
            if (diffMins < 1) timeStr = 'Agora há pouco';
            else if (diffMins < 60) timeStr = `${diffMins} minutos atrás`;
            else if (diffHours < 24) timeStr = `${diffHours} horas atrás`;
            else timeStr = date.toLocaleDateString();

            const html = `
                <div class="history-item">
                    <div class="history-icon ${iconClass}">${iconElement}</div>
                    <div class="history-details">
                        <h3>${item.output_name}</h3>
                        <p>Convertido de ${item.original_name}</p>
                    </div>
                    <div class="history-meta">
                        <span class="badge ${badgeClass}">${ext.toUpperCase()}</span>
                        <span class="history-size-time">${item.size_str}<br>${timeStr}</span>
                    </div>
                    <div class="history-actions">
                        <button class="icon-btn" onclick="window.pywebview.api.open_folder('${item.output_path.replace(/\\/g, '\\\\')}')" title="Abrir pasta"><i class="ph ph-folder-open"></i></button>
                    </div>
                </div>
            `;
            historyList.insertAdjacentHTML('beforeend', html);
        });
    } catch (e) {
        historyList.innerHTML = '<div style="text-align: center; padding: 20px; color: #EF4444;">Erro ao carregar histórico.</div>';
    }
}

// Check if Python file dialog should be used instead of HTML file input
document.querySelector('.select-file-btn').addEventListener('click', async (e) => {
    // If we want to use native Python dialog:
    e.preventDefault();
    e.stopPropagation();
    
    const fileInfo = await window.pywebview.api.select_pdf_file();
    if (fileInfo && fileInfo.path) {
        setFileUi(fileInfo.name, fileInfo.size, fileInfo.path);
    }
});
