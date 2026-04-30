from flask import Flask, request, send_file, jsonify
import fitz  # PyMuPDF
import io
import zipfile
import os
import sys

app = Flask(__name__)

@app.route('/api/convert', methods=['POST'])
@app.route('/', methods=['POST'])
def convert():
    print("Iniciando conversão...", file=sys.stderr)
    try:
        if 'files' not in request.files:
            print("Erro: Nenhum arquivo na requisição", file=sys.stderr)
            return jsonify({"success": False, "error": "Nenhum arquivo enviado"}), 400
        
        files = request.files.getlist('files')
        target_format = request.form.get('format', 'png')
        print(f"Arquivos recebidos: {len(files)}, Formato: {target_format}", file=sys.stderr)
        
        output_files = []
        
        for file in files:
            if not file.filename:
                continue
            
            print(f"Processando arquivo: {file.filename}", file=sys.stderr)
            pdf_data = file.read()
            
            if not pdf_data:
                print(f"Aviso: Arquivo {file.filename} está vazio", file=sys.stderr)
                continue
                
            try:
                doc = fitz.open(stream=pdf_data, filetype="pdf")
                
                for i in range(len(doc)):
                    page = doc.load_page(i)
                    pix = page.get_pixmap()
                    img_data = pix.tobytes(target_format)
                    output_files.append({
                        "name": f"{os.path.splitext(file.filename)[0]}_pag_{i+1}.{target_format}",
                        "data": img_data
                    })
                doc.close()
            except Exception as pdf_err:
                print(f"Erro ao abrir PDF {file.filename}: {str(pdf_err)}", file=sys.stderr)
                return jsonify({"success": False, "error": f"Erro no arquivo {file.filename}: {str(pdf_err)}"}), 400

        if not output_files:
            print("Erro: Nenhuma imagem gerada", file=sys.stderr)
            return jsonify({"success": False, "error": "Nenhuma imagem gerada. Verifique se os arquivos são PDFs válidos."}), 400

        print(f"Sucesso! Geradas {len(output_files)} imagens", file=sys.stderr)
        if len(output_files) == 1:
            return send_file(
                io.BytesIO(output_files[0]["data"]),
                mimetype=f'image/{target_format}',
                as_attachment=True,
                download_name=output_files[0]["name"]
            )
        
        # Criar ZIP para múltiplos arquivos/páginas
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w') as zf:
            for f in output_files:
                zf.writestr(f["name"], f["data"])
        
        memory_file.seek(0)
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name='conversoes_wtech.zip'
        )
    except Exception as e:
        print(f"Erro fatal: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
