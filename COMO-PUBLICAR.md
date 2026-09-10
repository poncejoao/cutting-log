# Como publicar — tudo pelo navegador, sem instalar nada no PC

Você não precisa do Node instalado nesse computador. O GitHub aceita subir
arquivos direto pelo site, e a Vercel builda o projeto na nuvem dela.

## 1. Criar o repositório no GitHub

1. Entra em [github.com](https://github.com) e cria uma conta grátis (se ainda
   não tiver).
2. Clica em **New repository**.
3. Nome: `cutting-log` (ou o que preferir). Pode deixar público ou privado —
   tanto faz pra Vercel funcionar.
4. Clica em **Create repository**, sem marcar nenhuma opção extra.

## 2. Subir os arquivos

1. Na página do repositório recém-criado, clica em **Add file → Upload files**.
2. Abre a pasta `cutting-log` que você descompactou e **arrasta todo o
   conteúdo de dentro dela** (não a pasta em si, o que está dentro: `src/`,
   `public/`, `package.json`, `vite.config.js`, `index.html`, `.gitignore`)
   pra dentro da área de upload do GitHub.
   - Se o navegador não deixar arrastar a pasta `src` inteira, arrasta os
     arquivos de dentro dela um por um pra dentro de uma pasta `src` que você
     cria digitando `src/App.jsx` no campo de nome do arquivo ao subir.
3. Escreve uma mensagem de commit tipo "primeira versão" e clica em
   **Commit changes**.

## 3. Ícones (opcional, mas recomendado)

O manifest espera dois arquivos em `public/`: `icon-192.png` e
`icon-512.png` (ícone quadrado do app). Sem eles o app funciona normal, só
não tem um ícone próprio na tela de início do iPhone — usa um genérico.
Pra gerar rápido: qualquer gerador de ícone de app online, exporta nos dois
tamanhos e sobe pra pasta `public/` do jeito que subiu os outros arquivos.

## 4. Conectar na Vercel

1. Entra em [vercel.com](https://vercel.com) e cria conta — pode logar direto
   com a conta do GitHub, fica mais simples.
2. Clica em **Add New → Project**.
3. Escolhe o repositório `cutting-log` que você acabou de criar.
4. A Vercel detecta sozinha que é um projeto Vite. Não precisa mexer em nada,
   só clicar em **Deploy**.
5. Espera cerca de 1 minuto. No final ela te dá uma URL tipo
   `cutting-log-joao.vercel.app`.

## 5. Instalar no iPhone

1. Abre a URL da Vercel no **Safari** (tem que ser Safari, não outro app).
2. Toca no ícone de compartilhar (quadrado com seta pra cima).
3. **Adicionar à Tela de Início**.
4. Pronto — abre em tela cheia, funciona offline (o service worker cacheia
   tudo), e os dados ficam salvos no `localStorage` do navegador, direto no
   seu iPhone.

## Se quiser atualizar o app depois

Sempre que eu (Claude) fizer um ajuste no código, é só repetir o passo 2
(subir os arquivos novos por cima dos antigos no mesmo repositório GitHub —
o GitHub pergunta se quer substituir). A Vercel redeploya sozinha assim que
detecta a mudança no repositório, sem você precisar fazer nada na Vercel.

## Importante sobre os dados

Como agora é `localStorage` do navegador (não mais o storage do Claude), os
dados ficam **só nesse iPhone, nesse Safari**. Se trocar de celular ou limpar
os dados do Safari, o histórico some. Não tem problema pro uso do dia a dia,
mas vale saber.
