/*
  Springfield e suas Caras
  Busca os personagens na The Simpsons API e monta os cards na hora,
  com fetch + createElement + appendChild. Nada de card escrito no HTML.
*/

// ===== Configuração =====

const API_URL = 'https://thesimpsonsapi.com/api/characters';
const CDN_URL = 'https://cdn.thesimpsonsapi.com/500'; // a API manda só o caminho da imagem
const TRADUCAO_URL = 'https://api.mymemory.translated.net/get';

const POR_PAGINA = 20;
const LOTE_DE_PAGINAS = 10;

const CHAVE_FAVORITOS = 'springfield-favoritos';
const CHAVE_TRADUCOES = 'springfield-traducoes';

// Aparece no lugar do retrato quando a imagem não carrega
const IMAGEM_PADRAO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
  '<circle cx="100" cy="100" r="80" fill="#FED90F" stroke="#1A1A1A" stroke-width="6"/>' +
  '<text x="100" y="128" font-size="84" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#1A1A1A">?</text>' +
  '</svg>'
);

// A API tem outros status além de vivo e falecido (desconhecido, fictício...)
const STATUS_FALECIDO = ['Deceased', 'Noncanon Deceased'];

const TRADUCOES = {
  Alive: 'Vivo',
  Deceased: 'Falecido',
  'Noncanon Deceased': 'Falecido (não canônico)',
  Unknown: 'Desconhecido',
  Fictional: 'Fictício',
  Noncanon: 'Não canônico',
  'Destroyed Icon': 'Ícone destruído',
  Male: 'Masculino',
  Female: 'Feminino'
};

const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const podeInclinar = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduzirMovimento;

// ===== Elementos da página =====

const container = document.getElementById('cards');
const campoBusca = document.getElementById('busca');
const botoesFiltro = document.querySelectorAll('.filtro');
const botaoAnterior = document.getElementById('anterior');
const botaoProxima = document.getElementById('proxima');
const indicadorPagina = document.getElementById('pagina');
const mensagemVazio = document.getElementById('vazio');
const totalPersonagens = document.getElementById('total');

// ===== Estado =====

let paginaAtual = 1;
let totalPaginas = 1;
let filtroAtual = 'todos';
let favoritos = lerDoNavegador(CHAVE_FAVORITOS, []);
let traducoesSalvas = lerDoNavegador(CHAVE_TRADUCOES, {});

// No filtro "Todos" cada página vem pronta da API (modo 'api').
// Nos outros filtros eu monto a lista aqui e divido em páginas (modo 'lista').
let modo = 'api';
let paginaApi = 1;
let listaFiltrada = [];
let todosPersonagens = null;
let pedidoAtual = 0;
let tentarDeNovo = () => carregarPersonagens(1);


// ===== 1. Consumo da API =====

function carregarPersonagens(pagina) {
  const pedido = ++pedidoAtual;
  modo = 'api';
  tentarDeNovo = () => carregarPersonagens(pagina);
  mostrarCarregando('Carregando personagens...');

  fetch(`${API_URL}?page=${pagina}`)
    .then(resposta => {
      if (!resposta.ok) {
        throw new Error(`Erro HTTP ${resposta.status}`);
      }
      return resposta.json();
    })
    .then(dados => {
      console.log(`Página ${pagina} recebida da API:`, dados);

      // Se o usuário já clicou em outra coisa, essa resposta chegou tarde
      if (pedido !== pedidoAtual) return;

      paginaAtual = pagina;
      paginaApi = pagina;
      totalPaginas = dados.pages;
      totalPersonagens.textContent = dados.count.toLocaleString('pt-BR');

      renderizarCards(dados.results);
      atualizarPaginacao();
    })
    .catch(erro => {
      console.error('Falha ao consumir a API:', erro);
      if (pedido === pedidoAtual) mostrarErro();
    });
}

function buscarJSON(url) {
  return fetch(url).then(resposta => {
    if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`);
    return resposta.json();
  });
}

// A API não tem filtro por status, então para listar todos os vivos ou
// falecidos eu busco as 60 páginas (10 de cada vez) e junto tudo.
// Isso só acontece uma vez; depois fica guardado.
function carregarTodosOsPersonagens() {
  if (todosPersonagens) return todosPersonagens;

  todosPersonagens = buscarJSON(`${API_URL}?page=1`)
    .then(primeira => {
      const total = primeira.pages;
      const resultados = [primeira.results];
      let concluidas = 1;
      atualizarProgresso(concluidas, total);

      const restantes = [];
      for (let n = 2; n <= total; n++) restantes.push(n);

      let fila = Promise.resolve();
      for (let i = 0; i < restantes.length; i += LOTE_DE_PAGINAS) {
        const lote = restantes.slice(i, i + LOTE_DE_PAGINAS);
        fila = fila
          .then(() => Promise.all(lote.map(n =>
            buscarJSON(`${API_URL}?page=${n}`).then(dados => {
              atualizarProgresso(++concluidas, total);
              return dados.results;
            })
          )))
          .then(listas => resultados.push(...listas));
      }

      return fila.then(() => {
        const todos = resultados.flat().sort((a, b) => a.id - b.id);
        console.log(`Todos os ${todos.length} personagens recebidos da API`);
        return todos;
      });
    })
    .catch(erro => {
      todosPersonagens = null; // deixa tentar de novo
      throw erro;
    });

  return todosPersonagens;
}

function carregarFiltro() {
  const pedido = ++pedidoAtual;
  modo = 'lista';
  tentarDeNovo = carregarFiltro;
  mostrarCarregando('Buscando personagens em todas as páginas da API...');

  carregarTodosOsPersonagens()
    .then(todos => {
      if (pedido !== pedidoAtual) return;
      montarListaFiltrada(todos);
      mostrarPaginaDaLista(1);
    })
    .catch(erro => {
      console.error('Falha ao consumir a API:', erro);
      if (pedido === pedidoAtual) mostrarErro();
    });
}

function montarListaFiltrada(todos) {
  listaFiltrada = todos.filter(p => {
    if (filtroAtual === 'vivos') return p.status === 'Alive';
    if (filtroAtual === 'falecidos') return estaFalecido(p);
    if (filtroAtual === 'favoritos') return favoritos.includes(p.id);
    return true;
  });
  totalPaginas = contarPaginas(listaFiltrada);
}

function mostrarPaginaDaLista(pagina) {
  paginaAtual = Math.min(Math.max(pagina, 1), totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  renderizarCards(listaFiltrada.slice(inicio, inicio + POR_PAGINA));
  atualizarPaginacao();
}


// ===== 2. Montagem dos cards =====

function renderizarCards(personagens) {
  container.classList.remove('saindo');
  container.innerHTML = '';

  personagens.forEach((personagem, indice) => {
    const card = criarCard(personagem);
    card.style.setProperty('--i', indice); // usado no atraso da animação de entrada
    container.appendChild(card);
  });

  aplicarBusca();
}

function novoElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

// Estrutura: article.card > div.card-interno > div.card-frente + div.card-verso
function criarCard(p) {
  const card = novoElemento('article', 'card');
  card.dataset.id = p.id;
  card.dataset.nome = p.name.toLowerCase();
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${p.name}. Clique para ver detalhes.`);

  const interno = novoElemento('div', 'card-interno');

  // Frente
  const frente = novoElemento('div', 'card-frente');

  const topo = novoElemento('div', 'card-topo');
  const nome = novoElemento('h3', 'nome', p.name);

  const fav = novoElemento('button', 'fav');
  fav.type = 'button';
  fav.setAttribute('aria-label', `Favoritar ${p.name}`);
  marcarFavorito(fav, favoritos.includes(p.id));
  fav.addEventListener('click', evento => {
    evento.stopPropagation(); // senão o clique no coração também vira o card
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
  if (estaFalecido(p)) status.classList.add('morto');
  else if (p.status !== 'Alive') status.classList.add('outro');

  const ocupacao = novoElemento('p', 'ocupacao', p.occupation || 'Ocupação desconhecida');
  const dicaFrente = novoElemento('span', 'dica', 'Clique para virar ↻');

  frente.append(topo, foto, status, ocupacao, dicaFrente);

  // Verso
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

  const balao = novoElemento('blockquote', 'balao', '...');
  const dicaVerso = novoElemento('span', 'dica', 'Clique para voltar ↺');

  verso.append(nomeVerso, detalhes, balao, dicaVerso);

  interno.append(frente, verso);
  card.appendChild(interno);

  // A cada virada sai uma frase diferente, e é aqui que a tradução acontece
  card.addEventListener('click', () => {
    if (!card.classList.contains('virado')) {
      mostrarFraseTraduzida(balao, sortearFrase(p.phrases));
      traduzirOcupacao(ocupacao, p.occupation);
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


// ===== 3. Interações =====

function virarCard(card) {
  card.classList.toggle('virado');
  card.classList.remove('inclinando');
  card.dataset.virando = 'sim';
  setTimeout(() => delete card.dataset.virando, 700);
}

// Inclina o card em 3D acompanhando o mouse
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
  salvarNoNavegador(CHAVE_FAVORITOS, favoritos);

  // Dentro do filtro Favoritos, quem perde o coração sai da lista na hora
  if (modo === 'lista' && filtroAtual === 'favoritos' && !favoritos.includes(id)) {
    listaFiltrada = listaFiltrada.filter(p => p.id !== id);
    totalPaginas = contarPaginas(listaFiltrada);
    botao.closest('.card').remove();
    atualizarPaginacao();
    aplicarBusca();
  }
}

function marcarFavorito(botao, ativo) {
  botao.textContent = ativo ? '♥' : '♡';
  botao.classList.toggle('ativo', ativo);
}

// Procura pelo nome entre os cards que estão na página
function aplicarBusca() {
  const termo = campoBusca.value.trim().toLowerCase();
  const cards = container.querySelectorAll('.card');
  let visiveis = 0;

  cards.forEach(card => {
    const mostrar = card.dataset.nome.includes(termo);
    card.hidden = !mostrar;
    if (mostrar) visiveis++;
  });

  mensagemVazio.hidden = visiveis > 0;
}


// ===== 4. Paginação =====

function atualizarPaginacao() {
  let texto = `Página ${paginaAtual} de ${totalPaginas}`;
  if (modo === 'lista') texto += ` · ${listaFiltrada.length} ${filtroAtual}`;

  indicadorPagina.textContent = texto;
  botaoAnterior.disabled = paginaAtual <= 1;
  botaoProxima.disabled = paginaAtual >= totalPaginas;
}

function trocarPagina(novaPagina) {
  if (novaPagina < 1 || novaPagina > totalPaginas) return;

  botaoAnterior.disabled = true;
  botaoProxima.disabled = true;
  document.getElementById('personagens').scrollIntoView({ behavior: 'smooth' });

  // Espera a animação de saída terminar antes de trocar os cards
  container.classList.add('saindo');
  setTimeout(() => {
    if (modo === 'api') carregarPersonagens(novaPagina);
    else mostrarPaginaDaLista(novaPagina);
  }, 400);
}


// ===== 5. Carregando e erro =====

function mostrarCarregando(mensagem) {
  container.classList.remove('saindo');
  container.innerHTML = '';
  mensagemVazio.hidden = true;
  botaoAnterior.disabled = true;
  botaoProxima.disabled = true;

  const carregando = novoElemento('div', 'carregando');
  const progresso = novoElemento('p', 'progresso');
  progresso.id = 'progresso';
  carregando.append(novoElemento('div', 'donut'), novoElemento('p', '', mensagem), progresso);
  container.appendChild(carregando);
}

function atualizarProgresso(concluidas, total) {
  const progresso = document.getElementById('progresso');
  if (progresso) progresso.textContent = `${concluidas} de ${total} páginas`;
}

function mostrarErro() {
  container.innerHTML = '';

  const erro = novoElemento('div', 'erro');
  const tentar = novoElemento('button', '', 'Tentar de novo');
  tentar.type = 'button';
  tentar.addEventListener('click', () => tentarDeNovo());

  erro.append(novoElemento('p', '', "D'oh! Não foi possível carregar os personagens."), tentar);
  container.appendChild(erro);
}


// ===== 6. Tradução (MyMemory API) =====
// A The Simpsons API só tem textos em inglês. Quando o card vira, a frase e
// a ocupação vão para a MyMemory. Cada tradução fica salva no navegador e,
// se a API falhar ou o limite do dia acabar, o texto continua em inglês.

function traduzirTexto(texto) {
  if (traducoesSalvas[texto]) return Promise.resolve(traducoesSalvas[texto]);

  const parametros = new URLSearchParams({ q: texto, langpair: 'en|pt-BR' });

  return buscarJSON(`${TRADUCAO_URL}?${parametros}`).then(dados => {
    console.log('Tradução recebida da MyMemory API:', dados);

    if (Number(dados.responseStatus) !== 200 || dados.quotaFinished) {
      throw new Error(dados.responseDetails || 'Limite de traduções atingido');
    }

    const traducao = ajustarMaiusculas(texto, decodificarEntidades(dados.responseData.translatedText));
    traducoesSalvas[texto] = traducao;
    salvarNoNavegador(CHAVE_TRADUCOES, traducoesSalvas);
    return traducao;
  });
}

// Às vezes a MyMemory devolve tudo em MAIÚSCULAS. Quando o original não
// era assim, passo para minúsculas e só a primeira letra de cada frase fica maiúscula.
function ajustarMaiusculas(original, traducao) {
  const temLetras = /\p{L}/u.test(traducao);
  const tudoMaiusculo = traducao === traducao.toLocaleUpperCase('pt-BR');
  const originalTudoMaiusculo = original === original.toUpperCase();
  if (!temLetras || !tudoMaiusculo || originalTudoMaiusculo) return traducao;

  return traducao
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[.!?]\s+)(\p{L})/gu, (_, antes, letra) => antes + letra.toLocaleUpperCase('pt-BR'));
}

// Transforma códigos como &#39; de volta no caractere (')
function decodificarEntidades(texto) {
  return new DOMParser().parseFromString(texto, 'text/html').documentElement.textContent;
}

function mostrarFraseTraduzida(balao, frase) {
  if (!frase) {
    balao.textContent = '...';
    return;
  }

  // O inglês aparece primeiro e é trocado quando a tradução chega
  balao.textContent = `"${frase}"`;
  balao.dataset.original = frase;
  balao.classList.add('traduzindo');

  traduzirTexto(frase)
    .then(traducao => {
      // Confere se o card não foi virado de novo (com outra frase) nesse meio-tempo
      if (balao.dataset.original === frase) balao.textContent = `"${traducao}"`;
    })
    .catch(erro => console.warn('Tradução indisponível, mantendo o inglês:', erro.message))
    .finally(() => {
      if (balao.dataset.original === frase) balao.classList.remove('traduzindo');
    });
}

function traduzirOcupacao(elemento, ocupacao) {
  if (!ocupacao || elemento.dataset.traduzida) return;
  elemento.dataset.traduzida = 'sim';

  traduzirTexto(ocupacao)
    .then(traducao => {
      elemento.textContent = traducao;
      elemento.title = `Original: ${ocupacao}`;
    })
    .catch(erro => {
      delete elemento.dataset.traduzida; // tenta de novo na próxima virada
      console.warn('Tradução indisponível, mantendo o inglês:', erro.message);
    });
}


// ===== 7. Cena do autor (cerca viva) =====
// O scroll vira um número de 0 a 1: em 0 o personagem está na frente do muro,
// em 1 já está escondido atrás da folhagem da direita. Subindo a página, ele volta.
// As medidas abaixo estão nas coordenadas do SVG (600 x 540).

const secaoAutor = document.getElementById('autor');
const palco = document.querySelector('.autor-palco');
const cena = document.getElementById('cena');
const personagem = document.getElementById('personagem');
const cercaFrente = document.getElementById('cerca-frente');
const folhasFrente = document.getElementById('cerca-frente-folhas');
const bordaFrente = document.getElementById('cerca-frente-borda');

const BORDA_X = 300;                             // onde começa a folhagem da frente
const CORPO = { esquerda: 225, direita: 420 };   // largura do corpo na imagem
const DESLOCAMENTO = { inicio: -165, fim: 115 }; // de onde até onde o personagem anda
const ALTURA_ABRACO = 270;                       // altura em que as folhas mais "abraçam" o corpo

let progressoAtual = 0;
let progressoAlvo = 0;
let animando = false;

// Os tufos da borda são sorteados uma vez só, senão a borda tremeria a cada quadro
const TUFOS = [];
for (let y = 78; y < 550; ) {
  const altura = 10 + Math.random() * 12;
  TUFOS.push({ y, altura, saliencia: 0.6 + Math.random() * 0.8 });
  y += altura;
}

function calcularProgresso() {
  const alturaTela = window.innerHeight;

  // Telas grandes: o palco fica preso (sticky) e a seção é mais alta que a tela.
  // A animação começa quando a seção chega na metade da tela e termina em 55%
  // desse trecho extra; o resto é uma pausa com o personagem já escondido.
  if (getComputedStyle(palco).position === 'sticky') {
    const pista = secaoAutor.offsetHeight - alturaTela;
    const rolado = -secaoAutor.getBoundingClientRect().top;
    const inicio = -alturaTela * 0.5;
    const fim = pista * 0.55;
    return limitar((rolado - inicio) / (fim - inicio));
  }

  // Celular: a cena rola junto com a página. Começa quando metade dela aparece
  // e termina 30% de tela depois (ou antes, se a página acabar).
  const caixa = cena.getBoundingClientRect();
  const centroCena = caixa.top + caixa.height / 2;
  const inicio = alturaTela;
  const scrollMaximo = document.documentElement.scrollHeight - alturaTela;
  const centroNoFimDaPagina = centroCena + window.scrollY - scrollMaximo;
  const fim = Math.min(inicio - 80, Math.max(inicio - alturaTela * 0.3, centroNoFimDaPagina + 20));
  return limitar((inicio - centroCena) / (inicio - fim));
}

// Desenha a borda esquerda da folhagem da frente como uma fileira de tufos.
// "contato" vai de 0 a 1: quanto mais o personagem encosta, maiores os tufos.
function bordaDaFolhagem(contato) {
  let caminho = `M${BORDA_X} ${TUFOS[0].y}`;

  TUFOS.forEach(({ y, altura, saliencia }) => {
    const distancia = (y - ALTURA_ABRACO) / 220;
    const abraco = Math.exp(-distancia * distancia) * contato;
    const base = BORDA_X - 8 * abraco;
    const tufo = (5 + 9 * abraco) * saliencia;
    caminho += ` L${base.toFixed(1)} ${y.toFixed(1)}` +
               ` Q${(base - tufo * 2).toFixed(1)} ${(y + altura / 2).toFixed(1)}` +
               ` ${base.toFixed(1)} ${(y + altura).toFixed(1)}`;
  });
  return caminho;
}

function desenharCena(p) {
  const suave = p * p * (3 - 2 * p); // começa e termina devagar
  const deslocamento = DESLOCAMENTO.inicio + (DESLOCAMENTO.fim - DESLOCAMENTO.inicio) * suave;

  // Quanto do corpo já passou para trás da folhagem (0 a 1)
  const larguraCorpo = CORPO.direita - CORPO.esquerda;
  const passou = limitar((CORPO.direita + deslocamento - BORDA_X) / larguraCorpo);
  const contato = Math.sin(passou * Math.PI);

  const borda = bordaDaFolhagem(contato);
  folhasFrente.setAttribute('d', `${borda} L${BORDA_X} 550 L610 550 L610 0 L${BORDA_X} 0 Z`);
  bordaFrente.setAttribute('d', borda);

  // O contorno só aparece durante o contato; fora disso o muro parece uma peça só
  bordaFrente.setAttribute('stroke-opacity', limitar(contato * 4).toFixed(2));

  const balanco = p > 0 && p < 1 ? Math.sin(p * Math.PI * 6) * 1.2 : 0;
  personagem.setAttribute('transform',
    `translate(${deslocamento.toFixed(1)} 0) rotate(${balanco.toFixed(2)} 320 540)`);
}

function farfalhar() {
  cercaFrente.classList.remove('farfalhar');
  void cercaFrente.getBoundingClientRect(); // força o navegador a reiniciar a animação
  cercaFrente.classList.add('farfalhar');
}

// Em vez de pular direto para a posição do scroll, a cena chega lá aos poucos.
// Assim o movimento fica macio mesmo com a rodinha do mouse.
function animarCena() {
  const anterior = progressoAtual;
  progressoAtual += (progressoAlvo - progressoAtual) * 0.2;
  if (Math.abs(progressoAlvo - progressoAtual) < 0.001) progressoAtual = progressoAlvo;

  // A folhagem balança quando o personagem some ou reaparece
  if ((anterior < 0.97) !== (progressoAtual < 0.97)) farfalhar();

  desenharCena(progressoAtual);

  if (progressoAtual !== progressoAlvo) {
    requestAnimationFrame(animarCena);
  } else {
    animando = false;
  }
}

function aoRolar() {
  progressoAlvo = calcularProgresso();
  if (!animando) {
    animando = true;
    requestAnimationFrame(animarCena);
  }
}


// ===== 8. Funções auxiliares =====

function traduzir(valor) {
  return TRADUCOES[valor] || valor || 'Desconhecido';
}

function estaFalecido(p) {
  return STATUS_FALECIDO.includes(p.status);
}

function contarPaginas(lista) {
  return Math.max(1, Math.ceil(lista.length / POR_PAGINA));
}

function limitar(valor) {
  return Math.min(Math.max(valor, 0), 1);
}

function formatarData(data) {
  if (!data) return 'Desconhecida';
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR');
}

function sortearFrase(frases) {
  if (!frases || frases.length === 0) return '';
  return frases[Math.floor(Math.random() * frases.length)];
}

// O localStorage pode estar bloqueado (aba anônima, por exemplo).
// Nesse caso o site funciona igual, só não lembra de nada na próxima visita.
function lerDoNavegador(chave, padrao) {
  try {
    return JSON.parse(localStorage.getItem(chave)) || padrao;
  } catch {
    return padrao;
  }
}

function salvarNoNavegador(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem armazenamento disponível
  }
}


// ===== Início =====

campoBusca.addEventListener('input', aplicarBusca);

botoesFiltro.forEach(botao => {
  botao.addEventListener('click', () => {
    if (botao.dataset.filtro === filtroAtual) return;

    botoesFiltro.forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');
    filtroAtual = botao.dataset.filtro;

    if (filtroAtual === 'todos') carregarPersonagens(paginaApi);
    else carregarFiltro();
  });
});

botaoAnterior.addEventListener('click', () => trocarPagina(paginaAtual - 1));
botaoProxima.addEventListener('click', () => trocarPagina(paginaAtual + 1));

carregarPersonagens(1);

if (cena) {
  desenharCena(0);
  if (!reduzirMovimento) {
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar);
    aoRolar();
  }
}
