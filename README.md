### README.md

# Web Page Validator

Este projeto valida páginas web verificando a existência de tags `<h1>`, imagens OG (Open Graph) e opcionalmente captura screenshots das páginas.

## Pré-requisitos

- Node.js (versão 12 ou superior)
- npm ou yarn (para gerenciar pacotes)
- Puppeteer (instalado via dependências do projeto)

## Instalação

1. Clone o repositório:

```
git clone https://github.com/seu-usuario/web-page-validator.git
```

2. Navegue até o diretório do projeto:

```
cd web-page-validator
```

3. Instale as dependências:

```
yarn install
```

ou

```
npm install
```

## Uso

Para executar o script de validação, utilize o seguinte comando:

```
node dist/index.js [FLAGS]
```

### Flags Disponíveis

- `--validate-og-images`: Valida as imagens OG (Open Graph) nas páginas.
- `--validate-h1-tags`: Verifica se as páginas possuem a tag `<h1>` e registra o conteúdo de texto.
- `--take-screenshots`: Captura screenshots das páginas durante a validação.

### Exemplos de Uso

#### Validar imagens OG e capturar screenshots

```
node dist/index.js --validate-og-images --take-screenshots
```

#### Verificar a existência de tags `<h1>` sem capturar screenshots

```
node dist/index.js --validate-h1-tags
```

#### Executar todas as validações (imagens OG, tags `<h1>` e capturar screenshots)

```
node dist/index.js --validate-og-images --validate-h1-tags --take-screenshots
```

## Estrutura do Projeto

- `src/index.ts`: Arquivo principal que orquestra o fluxo de validação das páginas.
- `src/utils.ts`: Funções utilitárias para manipulação de diretórios e logs.
- `src/pageUtils.ts`: Funções para interagir com as páginas, como aceitar cookies e rolar até o final da página.
- `src/ogImageValidator.ts`: Função para validar imagens OG nas páginas.

## Logs e Resultados

Os resultados da execução serão armazenados em um diretório `logs` criado na raiz do projeto. O diretório será nomeado com um timestamp da execução.

### Diretórios de Log

- `logs/<timestamp>/screenshots`: Armazena as screenshots capturadas (se a flag `--take-screenshots` estiver ativa).
- `logs/<timestamp>/og_images`: Armazena os logs da validação de imagens OG.
- `logs/<timestamp>/tags`: Armazena os logs da verificação de tags `<h1>`.
- `logs/<timestamp>/access`: Armazena os logs de acessibilidade das páginas.

## Contribuição

Se desejar contribuir com o projeto, sinta-se à vontade para abrir issues e enviar pull requests.

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

```
Este README.md fornece instruções detalhadas sobre como configurar, executar e entender o projeto, incluindo as flags disponíveis para a execução do script. Se precisar de mais alguma alteração ou tiver alguma dúvida, estou à disposição!
```
