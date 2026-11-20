import pathlib
here = pathlib.Path(__file__).parent
page = (here / 'page.src.html').read_text()
for mark, name in (('/*__CONFIG__*/', 'config.js'), ('/*__EFFECTS__*/', 'effects.js')):
    assert page.count(mark) == 1, mark
    page = page.replace(mark, (here / name).read_text())
(here / 'chamber-detail-mixer.html').write_text(page)
reset = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
for theme in ('light', 'dark'):
    (here / 'dist' / f'test_{theme}.html').write_text(f'<!doctype html><html data-theme="{theme}"><head>{reset}</head><body>{page}</body></html>')
print(len(page))
