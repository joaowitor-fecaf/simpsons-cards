# Springfield e suas Caras

Uma página web que busca personagens de **Os Simpsons** em tempo real e os exibe em cards interativos, criados inteiramente com JavaScript.

**Site publicado:** [joaowitor-fecaf.github.io/simpsons-cards](https://joaowitor-fecaf.github.io/simpsons-cards/)

**Vídeo de apresentação:** [youtu.be/mrpI9p8qb2I](https://youtu.be/mrpI9p8qb2I)

---

## Sobre o projeto

Este projeto é o trabalho da disciplina **Web Programming For Front End**, do curso de Análise e Desenvolvimento de Sistemas da UniFECAF. O desafio era criar um site que consumisse uma API pública de desenhos que fizeram sucesso nos anos 90 e 2000, usando apenas HTML, CSS e JavaScript, sem nenhum framework.

Escolhi **Os Simpsons** porque a série estreou em 1989, atravessou os anos 90 e 2000 como um dos maiores fenômenos da animação e tem um universo enorme de personagens. A [The Simpsons API](https://thesimpsonsapi.com/) reúne 1.182 deles, com nome, idade, ocupação, status, frases famosas e retrato. É material de sobra para montar cards ricos.

O visual se inspira na abertura da série: céu azul com nuvens passando, amarelo por todo lado e um traço com cara de desenho animado. Os cards entram na tela com animação, se inclinam acompanhando o mouse e giram em 3D quando você clica, revelando os detalhes do personagem no verso.

## Como funciona por dentro

O ponto central do projeto é que **nenhum card está escrito no HTML**. O `index.html` tem apenas um container vazio:

```html
<div id="cards" class="cards"></div>
```

Todo o resto acontece no `js/script.js`:

1. **Requisição:** o `fetch` chama `https://thesimpsonsapi.com/api/characters?page=N`.
2. **Conversão:** a resposta passa por `.json()` e vira um objeto JavaScript com a lista `results` (20 personagens por página) e os dados de paginação (`count`, `pages`, `next`, `prev`).
3. **Criação dos elementos:** para cada personagem, o script monta o card com `document.createElement`, preenche o conteúdo com `textContent` e encaixa as partes com `append`/`appendChild`.
4. **Inserção na página:** cada card pronto é adicionado ao container com `container.appendChild(card)`.

A API devolve só o caminho do retrato (por exemplo, `/character/1.webp`). O código monta a URL completa juntando esse caminho com o endereço da CDN de imagens.

### Filtros com todos os personagens

A API não permite filtrar por status. Por isso, quando você escolhe **Vivos**, **Falecidos** ou **Favoritos**, o site busca as 60 páginas da API (10 de cada vez, mostrando o progresso), junta tudo numa lista e a divide em páginas de 20. Essa busca acontece só na primeira vez; depois, trocar de filtro é instantâneo.

### Tradução com uma segunda API

Os textos da The Simpsons API vêm em inglês. Quando um card é virado, a frase e a ocupação do personagem são enviadas para a [MyMemory Translation API](https://mymemory.translated.net/), que devolve a tradução para o português. Cada tradução fica salva no navegador, para o mesmo texto não ser traduzido duas vezes. Se a API de tradução falhar ou o limite do dia acabar, o texto continua em inglês.

### Quando algo dá errado

Enquanto os dados carregam, aparece um donut girando. Se a API falhar, uma mensagem de erro oferece o botão "Tentar de novo". Se uma imagem não carregar, entra uma imagem padrão no lugar.

## Funcionalidades

- **Cards dinâmicos** com nome, retrato, status e ocupação
- **Card que vira em 3D** ao clicar, mostrando idade, data de nascimento, gênero e uma frase do personagem, sorteada a cada virada
- **Tradução automática** da frase e da ocupação para o português
- **Inclinação 3D** que acompanha o mouse (no computador)
- **Animações de entrada e saída** dos cards ao trocar de página
- **Favoritos** salvos no navegador com `localStorage`
- **Filtros** (Todos, Vivos, Falecidos, Favoritos) considerando todos os personagens da API, e **busca por nome** na página atual
- **Paginação** que se ajusta ao filtro escolhido
- **Seção do autor** com uma cena animada pelo scroll: o personagem do autor se esconde atrás de uma cerca viva, numa homenagem a uma cena clássica da série
- **Layout responsivo** para celular e computador
- Navegação por teclado e respeito à preferência de "reduzir movimento" do sistema

## Tecnologias

- HTML: Estrutura semântica da página (`header`, `section`, `main`, `footer`) e a cena da cerca viva em SVG
- CSS: Grid responsivo, variáveis, animações (`@keyframes`), transformações 3D e `position: sticky`
- JavaScript: Consumo das APIs com `fetch`, manipulação do DOM e interações
- The Simpsons API: Fonte dos dados dos personagens
- MyMemory Translation API: Tradução das frases e ocupações
- Google Fonts: Luckiest Guy (títulos) e Nunito (textos)

## Estrutura de pastas

```
simpsons-cards/
├── index.html            → estrutura da página
├── css/
│   └── style.css         → estilos, animações e responsividade
├── js/
│   └── script.js         → consumo das APIs, criação dos cards e animação da cena
└── img/
    └── joao-simpson.webp → ilustração do autor usada na cena da cerca viva
```

## Como rodar localmente

Não há dependências para instalar.

1. Clone o repositório:
   ```bash
   git clone https://github.com/joaowitor-fecaf/simpsons-cards.git
   ```
2. Abra a pasta no VS Code.
3. Clique com o botão direito no `index.html` e escolha **Open with Live Server**.

É preciso estar conectado à internet, já que os dados, as imagens e as traduções vêm das APIs.

## Sobre as APIs

**The Simpsons API**
- **Endereço base:** `https://thesimpsonsapi.com/api`
- **Autenticação:** nenhuma; a API é aberta e não exige cadastro nem token
- **Paginação:** fixa em 20 itens por página (60 páginas no total)
- **Filtros:** não há filtro por status; ele é feito no próprio site
- **Limite de requisições:** a documentação não informa um limite, mas a API deve ser usada com moderação

**MyMemory Translation API**
- **Endereço:** `https://api.mymemory.translated.net/get?q=TEXTO&langpair=en|pt-BR`
- **Autenticação:** nenhuma; aceita chamadas direto do navegador
- **Limite:** cerca de 5.000 caracteres por dia sem cadastro; por isso as traduções ficam salvas no navegador

## Créditos

- Dados: [The Simpsons API](https://thesimpsonsapi.com/), com conteúdo da The Simpsons Wiki sob licença **CC BY-SA**.
- Traduções: [MyMemory](https://mymemory.translated.net/).
- *Os Simpsons* e seus personagens pertencem aos respectivos detentores dos direitos. Este é um projeto acadêmico, sem fins comerciais.

---

Desenvolvido por **João Witor** · Análise e Desenvolvimento de Sistemas, 4º semestre (EAD) · Web Programming For Front End · UniFECAF
