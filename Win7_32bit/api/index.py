from flask import Flask, request, send_file, jsonify
import fitz  # PyMuPDF
import io
import zipfile
import os

app = Flask(__name__)

@app.route('/api/convert', methods=['POST'])
def convert():
    try:
        if 'files' not in request.files:
            return jsonify({"success": False, "error": "Nenhum arquivo enviado"}), 400
        
        files = request.files.getlist('files')
        target_format = request.form.get('format', 'png')
        
        output_files = []
        
        for file in files:
            pdf_data = file.read()
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

        if not output_files:
            return jsonify({"success": False, "error": "Nenhuma imagem gerada"}), 400

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
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
