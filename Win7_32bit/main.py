import multiprocessing
import eel
import os
import sys
import tkinter as tk
from tkinter import filedialog
from converter import process_conversion
from database import adicionar_conversao, carregar_historico

# Variável para armazenar a pasta de destino selecionada
output_folder = os.path.join(os.path.expanduser('~'), 'Documents')

@eel.expose
def select_output_folder():
    global output_folder
    root = tk.Tk()
    root.withdraw()
    root.wm_attributes('-topmost', 1)
    folder = filedialog.askdirectory(initialdir=output_folder, title="Selecione a pasta para salvar")
    if folder:
        output_folder = folder
        return folder
    return None

@eel.expose
def select_pdf_file():
    root = tk.Tk()
    root.withdraw()
    root.wm_attributes('-topmost', 1)
    file_paths = filedialog.askopenfilenames(
        title="Selecione os arquivos PDF",
        filetypes=[("Arquivos PDF", "*.pdf")]
    )
    
    files = []
    if file_paths:
        for file_path in file_paths:
            size = os.path.getsize(file_path)
            name = os.path.basename(file_path)
            files.append({"name": name, "size": size, "path": file_path})
    return files

@eel.expose
def get_history():
    return carregar_historico()

@eel.expose
def open_folder(path):
    import subprocess
    folder_path = os.path.dirname(path) if os.path.isfile(path) else path
    
    if sys.platform == 'win32':
        os.startfile(folder_path)
    elif sys.platform == 'darwin':
        subprocess.Popen(['open', folder_path])
    else:
        subprocess.Popen(['xdg-open', folder_path])

@eel.expose
def convert_pdf(file_path, formato, ocr_enabled):
    global output_folder
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": "Arquivo original não encontrado."}
            
        original_name = os.path.basename(file_path)
        out_name, out_path = process_conversion(file_path, output_folder, formato, ocr_enabled)
        size_bytes = os.path.getsize(out_path) if os.path.exists(out_path) else 0
        adicionar_conversao(original_name, out_name, out_path, size_bytes, formato)
        return {"success": True, "output_path": out_path}
    except Exception as e:
        return {"success": False, "error": str(e)}

@eel.expose
def convert_pdf_base64(file_name, base64_data, formato, ocr_enabled):
    global output_folder
    import base64
    import tempfile
    
    try:
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, file_name)
        with open(temp_path, "wb") as f:
            f.write(base64.b64decode(base64_data))
            
        out_name, out_path = process_conversion(temp_path, output_folder, formato, ocr_enabled)
        try: os.remove(temp_path)
        except: pass
            
        size_bytes = os.path.getsize(out_path) if os.path.exists(out_path) else 0
        adicionar_conversao(file_name, out_name, out_path, size_bytes, formato)
        return {"success": True, "output_path": out_path}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == '__main__':
    multiprocessing.freeze_support()
    if getattr(sys, 'frozen', False):
        bundle_dir = sys._MEIPASS
    else:
        bundle_dir = os.path.dirname(os.path.abspath(__file__))
        
    web_dir = os.path.join(bundle_dir, 'web')
    
    eel.init(web_dir)
    # Tenta usar o Chrome por padrão, e fallback pra Edge
    try:
        eel.start('index.html', size=(850, 700), port=0)
    except Exception:
        # Se falhar, tenta iniciar com o Edge
        try:
            eel.start('index.html', size=(850, 700), port=0, mode='edge')
        except Exception:
            # Fallback final no navegador padrão
            eel.start('index.html', size=(850, 700), port=0, mode='default')
