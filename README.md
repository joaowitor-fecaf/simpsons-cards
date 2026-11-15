# 🍩 Springfield e suas Caras

Uma página web que busca personagens de **Os Simpsons** em tempo real e os exibe em cards interativos, criados inteiramente com JavaScript.

🔗 **Site publicado:** [joaowitor-fecaf.github.io/simpsons-cards](https://joaowitor-fecaf.github.io/simpsons-cards/)
🎬 **Vídeo de apresentação:** [link do YouTube](#)

---

## Sobre o projeto

Este projeto nasceu como trabalho da disciplina de **Web Development Front-End** da UniFECAF. O desafio era criar um site que consumisse uma API pública de desenhos que fizeram sucesso nos anos 90 e 2000, usando apenas HTML, CSS e JavaScript, sem nenhum framework.

Escolhi **Os Simpsons** porque a série estreou em 1989, atravessou os anos 90 e 2000 como um dos maiores fenômenos da animação e tem um universo enorme de personagens. A [The Simpsons API](https://thesimpsonsapi.com/) reúne mais de mil deles, com nome, idade, ocupação, status, frases famosas e retrato. É material de sobra para montar cards ricos.

A ideia foi fugir do card estático tradicional. O visual se inspira na abertura da série: céu azul com nuvens passando, amarelo por todo lado e um traço com cara de desenho animado. Os cards entram na tela com animação, se inclinam acompanhando o mouse e giram em 3D quando você clica, revelando os detalhes do personagem no verso.

## Como funciona por dentro

O ponto central do projeto é que **nenhum card está escrito no HTML**. O `index.html` tem apenas um container vazio:

```html
<div id="cards" class="cards"></div>
```

Todo o resto acontece no `script.js`:

1. **Requisição:** o `fetch` chama `https://thesimpsonsapi.com/api/characters?page=N`.
2. **Conversão:** a resposta passa por `.json()` e vira um objeto JavaScript com a lista `results` (20 personagens por página) e os dados de paginação (`count`, `pages`, `next`, `prev`).
3. **Criação dos elementos:** para cada personagem, o script monta o card com `document.createElement`, preenche o conteúdo com `textContent` e encaixa as partes com `append`/`appendChild`.
4. **Inserção na página:** cada card pronto é adicionado ao container com `container.appendChild(card)`.

A API devolve só o caminho do retrato (por exemplo, `/character/1.webp`). O código monta a URL completa juntando esse caminho com o endereço da CDN de imagens.

Também tratei os casos em que algo dá errado: enquanto os dados carregam, aparece um donut girando. Se a API falhar, uma mensagem de erro oferece o botão "Tentar de novo". Se uma imagem não carregar, entra uma imagem padrão no lugar.

## Funcionalidades

- 🃏 **Cards dinâmicos** com nome, retrato, status (vivo/falecido) e ocupação
- 🔄 **Card que vira em 3D** ao clicar, mostrando idade, data de nascimento, gênero e uma frase do personagem, sorteada a cada virada
- 🖱️ **Inclinação 3D** que acompanha o mouse (no computador)
- ✨ **Animações de entrada e saída** dos cards ao trocar de página
- ♥ **Favoritos** salvos no navegador com `localStorage`
- 🔍 **Busca por nome** e **filtros** (Todos, Vivos, Falecidos, Favoritos) na página atual
- 📄 **Paginação** pelas 60 páginas da API
- 📱 **Layout responsivo** para celular e computador
- ♿ Navegação por teclado e respeito à preferência de "reduzir movimento" do sistema

## Tecnologias

| Tecnologia | Uso |
|---|---|
| **HTML5** | Estrutura semântica da página (`header`, `section`, `main`, `footer`) |
| **CSS3** | Grid responsivo, variáveis, animações (`@keyframes`) e transformações 3D |
| **JavaScript (ES6+)** | Consumo da API com `fetch`, manipulação do DOM e interações |
| **The Simpsons API** | Fonte dos dados dos personagens |
| **Google Fonts** | Luckiest Guy (títulos) e Nunito (textos) |

## Estrutura de pastas

```
simpsons-cards/
├── index.html      → estrutura da página
├── css/
│   └── style.css   → estilos, animações e responsividade
└── js/
    └── script.js   → consumo da API e criação dos cards
```

## Como rodar localmente

Não há dependências para instalar.

1. Clone o repositório:
   ```bash
   git clone https://github.com/joaowitor-fecaf/simpsons-cards.git
   ```
2. Abra a pasta no VS Code.
3. Clique com o botão direito no `index.html` e escolha **Open with Live Server**.

É preciso estar conectado à internet, já que os dados e as imagens vêm da API.

## Sobre a API

- **Endereço base:** `https://thesimpsonsapi.com/api`
- **Autenticação:** nenhuma, a API é aberta e não exige cadastro nem token
- **Paginação:** fixa em 20 itens por página
- **Limite de requisições:** a documentação não informa um limite, mas a API deve ser usada com moderação

## Créditos

- Dados: [The Simpsons API](https://thesimpsonsapi.com/), com conteúdo da The Simpsons Wiki sob licença **CC BY-SA**.
- *Os Simpsons* e seus personagens pertencem aos respectivos detentores dos direitos. Este é um projeto acadêmico, sem fins comerciais.

---

Desenvolvido por **João** · Web Development Front-End · UniFECAF
