# Erzeugt Neuland.html: das komplette Spiel in einer einzigen Datei.
import re, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
html = open('index.html', encoding='utf-8').read()
css = open('style.css', encoding='utf-8').read()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
html = re.sub(r'<script src="(js/[^"]+)"></script>',
              lambda m: '<script>\n' + open(m.group(1), encoding='utf-8').read().replace('</script', '<\\/script') + '\n</script>', html)
open('Neuland.html', 'w', encoding='utf-8').write(html)
print('Neuland.html geschrieben')
