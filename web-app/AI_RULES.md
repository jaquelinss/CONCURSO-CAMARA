# Regras e Diretrizes da IA

1. **Proteção da Estrutura e de Funções Existentes:**
   - NUNCA adicione, modifique ou remova estruturas globais (como wrappers no `App.tsx`, regras de `overflow`, `z-index` globais ou divs raiz) que possam comprometer, alterar ou quebrar outras funcionalidades, características ou o design já existente do site, sem ANTES avisar a usuária e explicar os possíveis efeitos colaterais.
   - Qualquer alteração que tenha escopo global ou que afete componentes não diretamente relacionados à solicitação atual deve ser isolada e, preferencialmente, comunicada previamente para aprovação.

2. **Isolamento de Código:**
   - Novas funcionalidades devem ser construídas da forma mais contida possível, utilizando os princípios de encapsulamento, para que uma falha na nova função não gere problemas (como tela branca) no restante do site.
