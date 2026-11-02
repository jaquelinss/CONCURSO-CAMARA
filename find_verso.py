import re

path = 'c:/projetos_dev/CONCURSO CAMARA/mini-app/src/components/FlashcardsView.tsx'
content = open(path, 'rb').read().decode('utf-8')

# Find the VERSO block precisely using regex
pattern = r'\{/\* VERSO \*/\}.*?</div>\r\n               </div>\r\n             </div>\r\n           </div>'
match = re.search(pattern, content, re.DOTALL)
if match:
    print("Found VERSO block at:", match.start(), "-", match.end())
    print(repr(content[match.start():match.start()+100]))
else:
    # Try finding indigo-600
    idx = content.find('bg-indigo-600 text-white')
    print("indigo-600 at:", idx)
    # Find surrounding context
    block_start = content.rfind('{/* VERSO', 0, idx)
    print("VERSO comment at:", block_start)
    # Find the closing of this div - count opening/closing divs
    pos = idx
    depth = 0
    in_block = False
    i = block_start
    # Find opening div
    first_div = content.find('<div', block_start)
    print("First div at:", first_div)
    print(repr(content[block_start:first_div+200]))
