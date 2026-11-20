#!/usr/bin/env python3
"""Assembles a mixer page into one file to publish, and two test pages.

  python3 harness/assemble.py <folder> [<name>]

<folder>/page.src.html is the page as an Artifact wants it: content only, with
no <!doctype>, <html>, <head> or <body> of its own. Each comment of the form
/*__INCLUDE file.js__*/ in it is replaced by that file of the same folder, so
the drawing code can live in plain .js files that a test page can also load on
their own. Written to build/:

  <name>.html               the page to publish, beside build/engine.js
  <name>_test_light.html    the same inside the skeleton an Artifact adds, light
  <name>_test_dark.html     and dark, to open or screenshot locally

<name> is the folder's name unless given. Publish with the Artifact tool:
file_path build/<name>.html and files {"engine.js": "build/engine.js"}.
"""

import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
MIXER = HERE.parent
folder = MIXER / sys.argv[1]
name = sys.argv[2] if len(sys.argv) > 2 else folder.name
page = (folder / 'page.src.html').read_text()


def include(match):
    return (folder / match.group(1)).read_text()


page, count = re.subn(r'/\*__INCLUDE ([\w./-]+)__\*/', include, page)
build = MIXER / 'build'
build.mkdir(exist_ok=True)
(build / f'{name}.html').write_text(page)

# What the Artifact's own skeleton adds round a page, near enough to test with
reset = ('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
         '<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>')

for theme in ('light', 'dark'):
    (build / f'{name}_test_{theme}.html').write_text(f'<!doctype html><html data-theme="{theme}"><head>{reset}</head><body>{page}</body></html>')

print(f'{name}.html: {len(page)} bytes, {count} files included')
