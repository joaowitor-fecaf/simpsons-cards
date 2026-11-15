/* =========================================================
   Springfield em Cards — consumo da The Simpsons API
   Os cards NÃO existem no HTML: são criados aqui, com
   fetch + createElement + appendChild.
   ========================================================= */

// ---------- Configuração ----------
const API_URL = 'https://thesimpsonsapi.com/api/characters';
const CDN_URL = 'https://cdn.thesimpsonsapi.com/500'; // a API devolve só o caminho da imagem
const CHAVE_FAVORITOS = 'springfield-favoritos';

// Imagem usada quando um retrato não carrega
const IMAGEM_PADRAO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
  '<circle cx="100" cy="100" r="80" fill="#FED90F" stroke="#1A1A1A" stroke-width="6"/>' +
  '<text x="100" y="128" font-size="84" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#1A1A1A">?</text>' +
  '</svg>'
);

// ---------- Elementos da página ----------
const container = document.getElementById('cards');
const campoBusca = document.getElementById('busca');
const botoesFiltro = document.querySelectorAll('.filtro');
const botaoAnterior = document.getElementById('anterior');
const botaoProxima = document.getElementById('proxima');
const indicadorPagina = document.getElementById('pagina');
const mensagemVazio = document.getElementById('vazio');
const totalPersonagens = document.getElementById('total');

// ---------- Estado ----------
let paginaAtual = 1;
let totalPaginas = 1;
let filtroAtual = 'todos';
let favoritos = lerFavoritos();

// Inclinação 3D só em computadores com mouse e sem "reduzir movimento"
const podeInclinar =
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TRADUCOES = {
  Alive: 'Vivo',
  Deceased: 'Falecido',
  Male: 'Masculino',
  Female: 'Feminino'
};

/* =========================================================
   1. CONSUMO DA API (fetch)
   ========================================================= */
function carregarPersonagens(pagina) {
  mostrarCarregando();

  fetch(`${API_URL}?page=${pagina}`)
    .then(resposta => {
      if (!resposta.ok) {
        throw new Error(`Erro HTTP ${resposta.status}`);
      }
      return resposta.json(); // converte a resposta em objeto JavaScript
    })
    .then(dados => {
      console.log(`Página ${pagina} recebida da API:`, dados);

      paginaAtual = pagina;
      totalPaginas = dados.pages;
      totalPersonagens.textContent = dados.count.toLocaleString('pt-BR');

      renderizarCards(dados.results);
      atualizarPaginacao(dados);
    })
    .catch(erro => {
      console.error('Falha ao consumir a API:', erro);
      mostrarErro();
    });
}

/* =========================================================
   2. CRIAÇÃO DINÂMICA DOS CARDS (DOM)
   ========================================================= */
function renderizarCards(personagens) {
  container.classList.remove('saindo');
  container.innerHTML = '';

  personagens.forEach((personagem, indice) => {
    const card = criarCard(personagem);
    card.style.setProperty('--i', indice); // atraso da animação de entrada
    container.appendChild(card);
  });

  aplicarFiltros();
}

// Atalho: cria um elemento com classe e texto
function novoElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function criarCard(p) {
  // Estrutura: article.card > div.card-interno > (div.card-frente + div.card-verso)
  const card = novoElemento('article', 'card');
  card.dataset.id = p.id;
  card.dataset.nome = p.name.toLowerCase();
  card.dataset.status = p.status;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${p.name}. Clique para ver detalhes.`);

  const interno = novoElemento('div', 'card-interno');

  // ----- FRENTE -----
  const frente = novoElemento('div', 'card-frente');

  const topo = novoElemento('div', 'card-topo');
  const nome = novoElemento('h3', 'nome', p.name);

  const fav = novoElemento('button', 'fav');
  fav.type = 'button';
  fav.setAttribute('aria-label', `Favoritar ${p.name}`);
  marcarFavorito(fav, favoritos.includes(p.id));
  fav.addEventListener('click', evento => {
    evento.stopPropagation(); // não deixa o clique virar o card
    alternarFavorito(p.id, fav);
  });

  topo.append(nome, fav);

  const foto = novoElemento('div', 'card-foto');
  const imagem = document.createElement('img');
  imagem.src = p.portrait_path ? CDN_URL + p.portrait_path : IMAGEM_PADRAO;
  imagem.alt = `Retrato de ${p.name}`;
  imagem.loading = 'lazy';
  imagem.addEventListener('error', () => { imagem.src = IMAGEM_PADRAO; }, { once: true });
  foto.appendChild(imagem);

  const status = novoElemento('span', 'status', traduzir(p.status));
  if (p.status !== 'Alive') status.classList.add('morto');

  const ocupacao = novoElemento('p', 'ocupacao', p.occupation || 'Ocupação desconhecida');
  const dicaFrente = novoElemento('span', 'dica', 'Clique para virar ↻');

  frente.append(topo, foto, status, ocupacao, dicaFrente);

  // ----- VERSO -----
  const verso = novoElemento('div', 'card-verso');
  const nomeVerso = novoElemento('h3', 'nome-verso', p.name);

  const detalhes = novoElemento('ul', 'detalhes');
  const informacoes = [
    ['Idade', p.age ?? '?'],
    ['Nascimento', formatarData(p.birthdate)],
    ['Gênero', traduzir(p.gender)]
  ];
  informacoes.forEach(([rotulo, valor]) => {
    const item = document.createElement('li');
    item.append(novoElemento('strong', '', rotulo), novoElemento('span', '', String(valor)));
    detalhes.appendChild(item);
  });

  const balao = novoElemento('blockquote', 'balao', fraseAleatoria(p.phrases));
  const dicaVerso = novoElemento('span', 'dica', 'Clique para voltar ↺');

  verso.append(nomeVerso, detalhes, balao, dicaVerso);

  // ----- Montagem -----
  interno.append(frente, verso);
  card.appendChild(interno);

  // ----- Interações -----
  card.addEventListener('click', () => {
    if (!card.classList.contains('virado')) {
      balao.textContent = fraseAleatoria(p.phrases); // frase nova a cada virada
    }
    virarCard(card);
  });

  card.addEventListener('keydown', evento => {
    if (evento.target !== card) return;
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      card.click();
    }
  });

  adicionarInclinacao(card, interno);

  return card;
}

/* =========================================================
   3. INTERAÇÕES
   ========================================================= */
function virarCard(card) {
  card.classList.toggle('virado');
  card.classList.remove('inclinando');
  card.dataset.virando = 'sim';
  setTimeout(() => delete card.dataset.virando, 700);
}

// Card inclina em 3D seguindo o mouse
function adicionarInclinacao(card, interno) {
  if (!podeInclinar) return;

  card.addEventListener('mousemove', evento => {
    if (card.dataset.virando) return;
    const area = card.getBoundingClientRect();
    const x = (evento.clientX - area.left) / area.width - 0.5;
    const y = (evento.clientY - area.top) / area.height - 0.5;
    card.classList.add('inclinando');
    interno.style.setProperty('--ry', `${x * 16}deg`);
    interno.style.setProperty('--rx', `${-y * 16}deg`);
  });

  card.addEventListener('mouseleave', () => {
    card.classList.remove('inclinando');
    interno.style.setProperty('--rx', '0deg');
    interno.style.setProperty('--ry', '0deg');
  });
}

function alternarFavorito(id, botao) {
  if (favoritos.includes(id)) {
    favoritos = favoritos.filter(item => item !== id);
  } else {
    favoritos.push(id);
  }
  marcarFavorito(botao, favoritos.includes(id));
  salvarFavoritos();
  if (filtroAtual === 'favoritos') aplicarFiltros();
}

function marcarFavorito(botao, ativo) {
  botao.textContent = ativo ? '♥' : '♡';
  botao.classList.toggle('ativo', ativo);
}

// Busca por nome + filtro de status/favoritos (na página atual)
function aplicarFiltros() {
  const termo = campoBusca.value.trim().toLowerCase();
  const cards = container.querySelectorAll('.card');
  let visiveis = 0;

  cards.forEach(card => {
    const status = card.dataset.status;
    const id = Number(card.dataset.id);

    let passaFiltro = true;
    if (filtroAtual === 'vivos') passaFiltro = status === 'Alive';
    if (filtroAtual === 'falecidos') passaFiltro = status !== 'Alive';
    if (filtroAtual === 'favoritos') passaFiltro = favoritos.includes(id);

    const mostrar = passaFiltro && card.dataset.nome.includes(termo);
    card.hidden = !mostrar;
    if (mostrar) visiveis++;
  });

  mensagemVazio.hidden = cards.length === 0 || visiveis > 0;
}

/* =========================================================
   4. PAGINAÇÃO (com transição de saída dos cards)
   ========================================================= */
function atualizarPaginacao(dados) {
  indicadorPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
  botaoAnterior.disabled = dados.prev === null;
  botaoProxima.disabled = dados.next === null;
}

function trocarPagina(novaPagina) {
  if (novaPagina < 1 || novaPagina > totalPaginas) return;

  botaoAnterior.disabled = true;
  botaoProxima.disabled = true;
  document.getElementById('personagens').scrollIntoView({ behavior: 'smooth' });

  container.classList.add('saindo'); // dispara a animação de saída
  setTimeout(() => carregarPersonagens(novaPagina), 400);
}

/* =========================================================
   5. ESTADOS DE CARREGAMENTO E ERRO
   ========================================================= */
function mostrarCarregando() {
  container.classList.remove('saindo');
  container.innerHTML = '';
  mensagemVazio.hidden = true;

  const carregando = novoElemento('div', 'carregando');
  carregando.append(novoElemento('div', 'donut'), novoElemento('p', '', 'Carregando personagens...'));
  container.appendChild(carregando);
}

function mostrarErro() {
  container.innerHTML = '';

  const erro = novoElemento('div', 'erro');
  const tentar = novoElemento('button', '', 'Tentar de novo');
  tentar.type = 'button';
  tentar.addEventListener('click', () => carregarPersonagens(paginaAtual));

  erro.append(novoElemento('p', '', "D'oh! Não foi possível carregar os personagens."), tentar);
  container.appendChild(erro);
}

/* =========================================================
   6. FUNÇÕES AUXILIARES
   ========================================================= */
function traduzir(valor) {
  return TRADUCOES[valor] || valor || 'Desconhecido';
}

function formatarData(data) {
  if (!data) return 'Desconhecida';
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR');
}

function fraseAleatoria(frases) {
  if (!frases || frases.length === 0) return '...';
  return `"${frases[Math.floor(Math.random() * frases.length)]}"`;
}

function lerFavoritos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_FAVORITOS)) || [];
  } catch {
    return [];
  }
}

function salvarFavoritos() {
  try {
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos));
  } catch {
    /* navegador sem armazenamento: favoritos valem só nesta visita */
  }
}

/* =========================================================
   7. EVENTOS E INÍCIO
   ========================================================= */
campoBusca.addEventListener('input', aplicarFiltros);

botoesFiltro.forEach(botao => {
  botao.addEventListener('click', () => {
    botoesFiltro.forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');
    filtroAtual = botao.dataset.filtro;
    aplicarFiltros();
  });
});

botaoAnterior.addEventListener('click', () => trocarPagina(paginaAtual - 1));
botaoProxima.addEventListener('click', () => trocarPagina(paginaAtual + 1));

carregarPersonagens(paginaAtual);
