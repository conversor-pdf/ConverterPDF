with open('web/style.css', 'r', encoding='utf-8') as f:
    css = f.read()
with open('web/script.js', 'r', encoding='utf-8') as f:
    js = f.read()
with open('web/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>\n{css}\n</style>')
html = html.replace('<script src="script.js"></script>', f'<script>\n{js}\n</script>')

with open('web/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
