# Regras do Projeto EduGenius


## Regras para Importação de Questões

Sempre que for solicitado a adição de novas questões ao banco de dados do projeto (arquivos JSON em `public/data/questions`), os seguintes parâmetros e regras devem ser estritamente seguidos:

1. **Matéria, Tópico e Subtópico**: As questões devem ser atribuídas à matéria correspondente. Os tópicos e subtópicos devem ser mapeados para a estrutura já existente no projeto (ver `src/lib/constants.ts`), evitando a criação de duplicatas de matérias, tópicos ou subtópicos. Se o tópico ou subtópico já existir, a questão deve ser categorizada sob ele.
2. **Dificuldade**: Toda questão deve ser classificada com uma das dificuldades utilizadas no sistema: `Fácil`, `Médio`, `Difícil` ou `Avançado`.
3. **Feedback/Explicação**: O campo de explicação não deve conter apenas o gabarito. Ele deve fornecer um feedback detalhado com a justificativa de estar correta ou incorreta para cada uma das alternativas (tanto no acerto quanto no erro).
