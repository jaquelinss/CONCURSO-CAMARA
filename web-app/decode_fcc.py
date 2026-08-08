import fitz

mapping = {
    # Numbers
    '=': '1', '7': '2', '<': '3', ';': '4', '6': '5',
    ':': '6', '3': '7', '5': '8', '4': '9', '8': '0',
    # Lowercase
    'm': 'a', 'g': 'b', 'l': 'c', 'k': 'd', 'f': 'e',
    'j': 'f', 'c': 'g', 'e': 'h', 'd': 'i', 'b': 'j',
    'h': 'k', 'n': 'l', 'i': 'm', '`': 'n', 'o': 'o', 
    'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 't': 't', 
    'u': 'u', 'v': 'v', 'w': 'x', 'y': 'y', 'z': 'z',
    # Uppercase
    'M': 'A', 'G': 'B', 'L': 'C', 'K': 'D', 'F': 'E',
    'J': 'F', 'C': 'G', 'E': 'H', 'D': 'I', 'B': 'J',
    'H': 'K', 'N': 'L', 'I': 'M', '@': 'N', 'O': 'O', 
    'X': 'P', ']': 'Q', 'W': 'R', '\\': 'S', '[': 'T', 
    'V': 'U', 'Z': 'V', 'Y': 'Y',
    # Accents & specials
    'ã': 'ç', 'ì': 'ã', 'é': 'í', 'ò': 'ú', 'ö': 'õ',
    'â': 'ê', 'í': 'á', 'ç': 'â', 'ü': 'ó', 'ä': 'é',
    'û': 'ô', 'Ö': 'Õ', 'Í': 'Á', 'É': 'Í', 'Ò': 'Ú',
    '²': 'º', '“': '"', '”': '"', '’': "'", '‘': "'"
}

def decode_text(text):
    res = ""
    for char in text:
        if char in mapping:
            res += mapping[char]
        else:
            res += char
    return res

doc = fitz.open(r"C:\LIVROS SCRIB\453_Quest_es_de_Direito_Administrativo_FCC___PDF___Poder_Policial__Lei_Constitucional_dos_Estados_Un.pdf")
full_text = ""
for i in range(len(doc)):
    page_text = doc[i].get_text()
    full_text += decode_text(page_text) + "\n"

with open("decoded_fcc.txt", "w", encoding="utf-8") as f:
    f.write(full_text)

print("Decoded snippet:")
print(full_text[:1000])
