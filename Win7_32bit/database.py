import json
import os
import datetime

DB_FILE = "history.json"

def carregar_historico():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def salvar_historico(historico):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(historico, f, indent=4, ensure_ascii=False)

def adicionar_conversao(original_name, output_name, output_path, size_bytes, formato):
    historico = carregar_historico()
    
    # Formata tamanho
    if size_bytes > 1024 * 1024:
        size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        size_str = f"{size_bytes / 1024:.1f} KB"
        
    novo_item = {
        "original_name": original_name,
        "output_name": output_name,
        "output_path": output_path,
        "size_bytes": size_bytes,
        "size_str": size_str,
        "format": formato,
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Insere no começo
    historico.insert(0, novo_item)
    
    # Limita a 50 itens
    if len(historico) > 50:
        historico = historico[:50]
        
    salvar_historico(historico)
    return novo_item
