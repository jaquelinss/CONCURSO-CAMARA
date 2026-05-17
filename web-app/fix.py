import re

with open('src/lib/constants.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'bg-([a-z]+)-50(?!0)', r'bg-\1-50 dark:bg-\1-900/20', content)
content = re.sub(r'text-([a-z]+)-900', r'text-\1-900 dark:text-\1-100', content)
content = re.sub(r'text-([a-z]+)-600', r'text-\1-600 dark:text-\1-400', content)
content = re.sub(r'border-([a-z]+)-300', r'border-\1-300 dark:border-\1-700/50', content)
content = re.sub(r'ring-([a-z]+)-400', r'ring-\1-400 dark:ring-\1-500/50', content)
content = re.sub(r'bg-([a-z]+)-500 hover:bg-([a-z]+)-600 text-white', r'bg-\1-500 hover:bg-\1-600 dark:bg-\1-600 dark:hover:bg-\1-700 text-white', content)
content = re.sub(r'bg-white hover:bg-([a-z]+)-100', r'bg-white dark:bg-gray-800 hover:bg-\1-100 dark:hover:bg-\1-900/40', content)
content = re.sub(r"cardFront: 'bg-([a-z]+)-100'", r"cardFront: 'bg-\1-100 dark:bg-\1-900/40'", content)
content = re.sub(r"cardBack: 'bg-([a-z]+)-200'", r"cardBack: 'bg-\1-200 dark:bg-\1-800/40'", content)

with open('src/lib/constants.ts', 'w', encoding='utf-8') as f:
    f.write(content)
