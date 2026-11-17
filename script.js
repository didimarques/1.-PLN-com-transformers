/**
 * TRANSFORMER EXPLAINER INTERATIVO - MOTOR DE JORNADA ANIMADA & MULTI-HEAD QKV
 * Visualização e Raciocínio baseado no Transformer Explainer (Polo Club, Georgia Tech)
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==================== ESPECIALIZAÇÃO LINGUÍSTICA DAS 12 CABEÇAS ====================
  const HEAD_SPECIALIZATIONS = [
    "Cabeça 1: Contexto Imediato (Adjacência n-grama)",
    "Cabeça 2: Sintaxe & Concordância de Gênero/Número",
    "Cabeça 3: Dependências de Longo Alcance (Sujeito Raiz)",
    "Cabeça 4: Resolução de Anáforas e Pronomes",
    "Cabeça 5: Pausas e Pontuação Estrutural",
    "Cabeça 6: Atributos Qualificadores e Adjetivos",
    "Cabeça 7: Núcleo Verbal e Transitividade",
    "Cabeça 8: Conectivos Lógicos e Oposições",
    "Cabeça 9: Papéis Temáticos (Agente, Paciente)",
    "Cabeça 10: Relações Semânticas Co-referenciais",
    "Cabeça 11: Identificação de Entidades e Domínio",
    "Cabeça 12: Síntese Abstrata e Contexto Global"
  ];

  // ==================== ESTADO GLOBAL DA APLICAÇÃO ====================
  const state = {
    prompt: "Data visualization empowers users to",
    tokens: [],
    temperature: 0.70,
    selectedBlock: 1,
    totalBlocks: 12,
    selectedHead: 1,
    totalHeads: 12,
    theme: 'light',
    currentStep: 0,
    isPlaying: false,
    timer: null,
    stepSpeed: 4500,
    isHeadAnimating: false,
    isBlocksAnimating: false,
    showConcatBadge: false,
    currentPredictions: [],
    revealedCandidatesCount: 0,
    isRevealingPredictions: false,
    revelationTimer: null,
    activeMoeCategories: []
  };

  // ==================== DEFINIÇÃO DAS 7 ETAPAS DA JORNADA ANIMADA ====================
  const JOURNEY_STEPS = [
    {
      index: 0,
      title: "Etapa 1: Entrada, Tokenização & Embeddings",
      badge: "Passo 1 / 7",
      concept: "Espaço Vetorial Contínuo & Posição",
      explanation: "Cada palavra do prompt é decomposta em tokens e convertida em um vetor contínuo no espaço $\\mathbb{R}^{d_{model}}$ ($d_{model} = 768$). Para compensar a ausência de recorrência temporal, somamos uma Codificação Posicional: $\\mathbf{x}_t = \\mathbf{e}_t + \\mathbf{p}_t$. A linha cinza superior é a Conexão Residual primária.",
      highlightGroup: "stage-embedding",
      block: 1,
      head: 1,
      headDesc: "Cabeça 1: Contexto Imediato"
    },
    {
      index: 1,
      title: "Etapa 2: Projeção Linear em Query, Key e Value (QKV)",
      badge: "Passo 2 / 7",
      concept: "Banco de Dados Associativo Vetorial",
      explanation: "O vetor de cada token é multiplicado por 3 matrizes aprendidas: <strong>Query ($Q$ - Azul)</strong> (o que o token busca saber), <strong>Key ($K$ - Vermelho)</strong> (as pistas oferecidas) e <strong>Value ($V$ - Verde)</strong> (o conteúdo semântico transportado). As 3 vias alimentam o mecanismo de atenção.",
      highlightGroup: "stage-qkv",
      block: 1,
      head: 1,
      headDesc: "Separação Linear em 3 Subespaços"
    },
    {
      index: 2,
      title: "Etapa 3: Auto-Atenção Multi-Head (12 Cabeças em Paralelo)",
      badge: "Passo 3 / 7",
      concept: "Scaled Dot-Product: Softmax(Q·Kᵀ / √d + M)",
      explanation: "O produto escalar avalia a afinidade entre cada Query e todas as Keys. A divisão por $\\sqrt{d_k}$ estabiliza o Softmax. A Máscara Causal impede que tokens vejam o futuro (atribuindo $-\\infty$). Observe a passagem alternando entre as 12 cabeças independentes!",
      highlightGroup: "stage-attention",
      block: 1,
      head: 2,
      headDesc: "Cabeça 2: Sintaxe & Concordância"
    },
    {
      index: 3,
      title: "Etapa 4: Saída da Atenção ('Out') & Conexão Residual 1",
      badge: "Passo 4 / 7",
      concept: "Soma Ponderada e Mecanismo de Atalho (Add & Norm)",
      explanation: "Os pesos de atenção multiplicam a matriz de Values ($A \\times V$), consolidando o contexto relevante na saída 'Out'. Essa saída é somada diretamente ao fluxo residual original: $\\mathbf{x}_1 = \\mathbf{x}_0 + \\text{Attn}(\\mathbf{x}_0)$, preservando gradientes sem perda de informação.",
      highlightGroup: "stage-residual1",
      block: 1,
      head: 1,
      headDesc: "Recombinação Residual 1"
    },
    {
      index: 4,
      title: "Etapa 5: Mixture of Experts (MoE) & Conexão Residual 2",
      badge: "Passo 5 / 7",
      concept: "Roteamento Esparso Top-K + Shared Expert",
      explanation: "No lugar do MLP denso, cada token passa por um bloco <strong>Mixture of Experts (MoE)</strong>: um <strong>Router</strong> seleciona os $K$ especialistas roteados mais relevantes ($y = \\sum_{i \\in \\text{TopK}(x)} g_i(x) E_i(x)$) e os soma ($\oplus$) ao <strong>Shared Expert</strong> sempre ativo.",
      highlightGroup: "stage-mlp",
      block: 1,
      head: 1,
      headDesc: "MoE: Router + Top-K Experts"
    },
    {
      index: 5,
      title: "Etapa 6: Propagação Através dos 12 Blocos Transformer",
      badge: "Passo 6 / 7",
      concept: "Profundidade Hierárquica da Rede",
      explanation: "O tensor atravessa sequencialmente os 11 blocos decodificadores restantes. Camadas iniciais refinam sintaxe local; camadas intermediárias capturam relações gramaticais longas; camadas profundas sintetizam abstrações conceituais e a intenção global do texto.",
      highlightGroup: "stage-11blocks",
      block: 6,
      head: 3,
      headDesc: "Bloco 6 de 12: Semântica Abstrata"
    },
    {
      index: 6,
      title: "Etapa 7: Unembedding, Temperatura & Probabilidades Finais",
      badge: "Passo 7 / 7",
      concept: "Projeção de Vocabulário & Softmax Final",
      explanation: "O vetor acumulado do <strong>ÚLTIMO TOKEN</strong> é multiplicado pela matriz de vocabulário $W_U$ gerando logits brutos. O Softmax com temperatura ($T$) converte os logits na distribuição final de probabilidades das próximas palavras possíveis. A palavra com maior probabilidade completa a sequência!",
      highlightGroup: "stage-probabilities",
      block: 12,
      head: 1,
      headDesc: "Previsão do Próximo Token"
    }
  ];

  // ==================== BASE DE CONHECIMENTO CONTEXTUAL ====================
  const PRESET_KNOWLEDGE = [
    {
      matches: ["data visualization empowers users to", "empowers users to", "users to"],
      predictions: [
        { word: "visualize", prob: 0.5467, logit: 8.2, note: "Ação direta e primária associada a ferramentas de visualização." },
        { word: "create", prob: 0.2087, logit: 6.8, note: "Criação de relatórios e dashboards interativos." },
        { word: "see", prob: 0.1209, logit: 5.9, note: "Percepção visual imediata de padrões nos dados." },
        { word: "make", prob: 0.0626, logit: 4.8, note: "Tomada de decisão baseada em evidências (make decisions)." },
        { word: "easily", prob: 0.0611, logit: 4.6, note: "Advérbio de facilidade de uso." },
        { word: "quickly", prob: 0.0001, logit: 2.1, note: "Rapidez na análise." },
        { word: "explore", prob: 0.0001, logit: 1.9, note: "Exploração exploratória de dados (EDA)." },
        { word: "find", prob: 0.0001, logit: 1.7, note: "Identificação de insights e anomalias." },
        { word: "understand", prob: 0.0001, logit: 1.5, note: "Compreensão de tendências complexas." },
        { word: "build", prob: 0.0001, logit: 1.3, note: "Construção de narrativas com dados." }
      ]
    },
    {
      matches: ["a inteligência artificial irá transformar o", "transformar o", "transformará o"],
      predictions: [
        { word: "mundo", prob: 0.442, logit: 7.8, note: "Impacto global e transformador da IA." },
        { word: "futuro", prob: 0.261, logit: 6.9, note: "Associação temporal direta com disrupção tecnológica." },
        { word: "mercado", prob: 0.145, logit: 5.8, note: "Revolução no mercado corporativo e de trabalho." },
        { word: "trabalho", prob: 0.089, logit: 4.9, note: "Transformação nas profissões e produtividade." },
        { word: "conhecimento", prob: 0.063, logit: 4.2, note: "Nova forma de sintetizar informações humanas." }
      ]
    },
    {
      matches: ["o modelo de linguagem prevê a próxima", "prevê a próxima"],
      predictions: [
        { word: "palavra", prob: 0.528, logit: 8.1, note: "Definição formal de modelos de linguagem autoregressivos." },
        { word: "sequência", prob: 0.224, logit: 6.5, note: "Termo técnico frequente em probabilidade e PLN." },
        { word: "frase", prob: 0.131, logit: 5.4, note: "Unidade sintática de fala e escrita." },
        { word: "resposta", prob: 0.072, logit: 4.4, note: "Comum em modelos de diálogo e instrução." },
        { word: "etapa", prob: 0.045, logit: 3.8, note: "Sequenciamento algorítmico." }
      ]
    },
    {
      matches: ["atenção é tudo o que você", "atencao e tudo o que voce", "attention is all you"],
      predictions: [
        { word: "precisa", prob: 0.745, logit: 9.1, note: "Tradução literal do artigo seminal de Vaswani et al. (2017)." },
        { word: "necessita", prob: 0.128, logit: 6.2, note: "Sinônimo formal em língua portuguesa." },
        { word: "deseja", prob: 0.068, logit: 5.1, note: "Variação estilística alternativa." },
        { word: "busca", prob: 0.035, logit: 4.1, note: "Foco em pesquisa e aprendizado." },
        { word: "espera", prob: 0.024, logit: 3.5, note: "Sentido de expectativa." }
      ]
    },
    {
      matches: ["no processamento de linguagem natural usamos redes", "usamos redes"],
      predictions: [
        { word: "neurais", prob: 0.612, logit: 8.4, note: "Termo canônico para arquiteturas de Deep Learning em PLN." },
        { word: "recorrentes", prob: 0.215, logit: 6.7, note: "RNNs e LSTMs, assunto central do curso." },
        { word: "profundas", prob: 0.094, logit: 5.3, note: "Redes com dezenas de camadas empilhadas." },
        { word: "densas", prob: 0.048, logit: 4.2, note: "Camadas totalmente conectadas." },
        { word: "convolucionais", prob: 0.031, logit: 3.6, note: "CNNs aplicadas a n-gramas." }
      ]
    }
  ];

  // ==================== ELEMENTOS DO DOM ====================
  const promptInput = document.getElementById('promptInput');
  const clearPromptBtn = document.getElementById('clearPromptBtn');
  const charCount = document.getElementById('charCount');
  const tokenCount = document.getElementById('tokenCount');
  const temperatureSlider = document.getElementById('temperatureSlider');
  const temperatureValue = document.getElementById('temperatureValue');
  const presetButtons = document.getElementById('presetButtons');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  // Player de Vídeo
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const playBtnText = document.getElementById('playBtnText');
  const prevStepBtn = document.getElementById('prevStepBtn');
  const nextStepBtn = document.getElementById('nextStepBtn');
  const replayBtn = document.getElementById('replayBtn');
  const videoSpeed = document.getElementById('videoSpeed');
  const timelineFill = document.getElementById('timelineFill');
  const timelineMilestones = document.getElementById('timelineMilestones');
  const currentStepTitle = document.getElementById('currentStepTitle');
  const hudStepBadge = document.getElementById('hudStepBadge');
  const hudConcept = document.getElementById('hudConcept');
  const hudExplanation = document.getElementById('hudExplanation');
  const hudHeadIndicator = document.getElementById('hudHeadIndicator');
  const hudHeadPill = document.getElementById('hudHeadPill');

  // Navegação de Blocos e Cabeças
  const prevBlockBtn = document.getElementById('prevBlockBtn');
  const nextBlockBtn = document.getElementById('nextBlockBtn');
  const blockNumberLabel = document.getElementById('blockNumberLabel');
  const btnAnimate12Blocks = document.getElementById('btnAnimate12Blocks');
  const prevHeadBtn = document.getElementById('prevHeadBtn');
  const nextHeadBtn = document.getElementById('nextHeadBtn');
  const headNumberLabel = document.getElementById('headNumberLabel');
  const btnAnimate12Heads = document.getElementById('btnAnimate12Heads');

  // SVG e Inspetor
  const transformerSvg = document.getElementById('transformerSvg');
  const inspectorTitle = document.getElementById('inspectorTitle');
  const inspectorDescription = document.getElementById('inspectorDescription');

  // Estágios Isolados
  const isolatedTokenChips = document.getElementById('isolatedTokenChips');
  const isolatedEmbeddingCards = document.getElementById('isolatedEmbeddingCards');
  const isolatedHeadTabs = document.getElementById('isolatedHeadTabs');
  const isolatedHeatmapGrid = document.getElementById('isolatedHeatmapGrid');
  const isolatedInspectorBody = document.getElementById('isolatedInspectorBody');
  const isolatedProbList = document.getElementById('isolatedProbList');
  const heroWord = document.getElementById('heroWord');
  const heroProb = document.getElementById('heroProb');
  const heroNote = document.getElementById('heroNote');
  const isolatedAppendBtn = document.getElementById('isolatedAppendBtn');

  // Modal de Detalhamento Matemático
  const mathModalOverlay = document.getElementById('mathModalOverlay');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalOkBtn = document.getElementById('modalOkBtn');
  const modalTag = document.getElementById('modalTag');
  const modalDimsPill = document.getElementById('modalDimsPill');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  // ==================== INICIALIZAÇÃO ====================
  function init() {
    promptInput.value = state.prompt;
    updatePromptStats();
    setupEventListeners();
    applyStep(0, false);
    renderAllViews();
    initKaTeX();
  }

  // ==================== LISTENERS & EVENTOS ====================
  function setupEventListeners() {
    // Prompt
    promptInput.addEventListener('input', () => {
      state.prompt = promptInput.value;
      resetJourneyForNewInput();
      markActivePreset();
    });

    clearPromptBtn.addEventListener('click', () => {
      promptInput.value = "";
      state.prompt = "";
      resetJourneyForNewInput();
      promptInput.focus();
    });

    // Temperatura
    temperatureSlider.addEventListener('input', (e) => {
      state.temperature = parseFloat(e.target.value);
      temperatureValue.textContent = state.temperature.toFixed(2);
      if (state.currentStep === 6) {
        startCandidatesRevelation();
      } else {
        renderAllViews();
      }
    });

    // Presets
    presetButtons.addEventListener('click', (e) => {
      const chip = e.target.closest('.preset-chip');
      if (!chip) return;
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      promptInput.value = chip.dataset.text;
      state.prompt = chip.dataset.text;
      resetJourneyForNewInput();
    });

    // Player de Vídeo da Jornada
    playPauseBtn.addEventListener('click', togglePlayJourney);
    prevStepBtn.addEventListener('click', () => {
      pauseJourney();
      if (state.currentStep > 0) applyStep(state.currentStep - 1, true);
    });
    nextStepBtn.addEventListener('click', () => {
      pauseJourney();
      if (state.currentStep < JOURNEY_STEPS.length - 1) applyStep(state.currentStep + 1, true);
    });
    replayBtn.addEventListener('click', () => {
      applyStep(0, true);
      startJourney();
    });
    videoSpeed.addEventListener('change', (e) => {
      state.stepSpeed = parseInt(e.target.value, 10);
      if (state.isPlaying) {
        clearInterval(state.timer);
        state.timer = setInterval(tickJourney, state.stepSpeed);
      }
    });

    // Marcos da Linha do Tempo
    timelineMilestones.addEventListener('click', (e) => {
      const m = e.target.closest('.milestone');
      if (!m) return;
      pauseJourney();
      const stepIdx = parseInt(m.dataset.step, 10);
      applyStep(stepIdx, true);
    });

    // Steppers de Bloco e Cabeça
    prevBlockBtn.addEventListener('click', () => {
      if (state.selectedBlock > 1) {
        state.selectedBlock--;
        blockNumberLabel.textContent = `Bloco ${state.selectedBlock} de ${state.totalBlocks}`;
        renderFlowchart();
      }
    });
    nextBlockBtn.addEventListener('click', () => {
      if (state.selectedBlock < state.totalBlocks) {
        state.selectedBlock++;
        blockNumberLabel.textContent = `Bloco ${state.selectedBlock} de ${state.totalBlocks}`;
        renderFlowchart();
      }
    });
    if (btnAnimate12Blocks) {
      btnAnimate12Blocks.addEventListener('click', () => {
        animateBlocksSweep();
      });
    }

    prevHeadBtn.addEventListener('click', () => {
      if (state.selectedHead > 1) {
        state.selectedHead--;
        updateHeadUI();
        renderFlowchart();
        renderIsolatedHeatmap();
      }
    });
    nextHeadBtn.addEventListener('click', () => {
      if (state.selectedHead < state.totalHeads) {
        state.selectedHead++;
        updateHeadUI();
        renderFlowchart();
        renderIsolatedHeatmap();
      }
    });
    if (btnAnimate12Heads) {
      btnAnimate12Heads.addEventListener('click', () => {
        animateMultiHeadSweep();
      });
    }

    // Abas de Cabeça na Seção Isolada
    isolatedHeadTabs.addEventListener('click', (e) => {
      const pill = e.target.closest('.head-pill');
      if (!pill) return;
      state.selectedHead = parseInt(pill.dataset.head, 10);
      updateHeadUI();
      renderFlowchart();
      renderIsolatedHeatmap();
    });

    // Botão Adicionar Palavra Top Candidate na seção isolada
    isolatedAppendBtn.addEventListener('click', () => {
      if (state.currentStep === 6 && !state.isRevealingPredictions && state.revealedCandidatesCount > 0) {
        commitSingleWord(state.currentPredictions[0].word);
      }
    });

    // Botões de Zoom nas Seções Isoladas
    document.querySelectorAll('.btn-zoom-stage').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalType = btn.dataset.modal;
        openMathModal(modalType);
      });
    });

    // Modal de Detalhamento Matemático
    modalCloseBtn.addEventListener('click', closeMathModal);
    modalOkBtn.addEventListener('click', closeMathModal);
    mathModalOverlay.addEventListener('click', (e) => {
      if (e.target === mathModalOverlay) closeMathModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mathModalOverlay.classList.contains('active')) {
        closeMathModal();
      }
    });

    // Alternar Tema
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  function updateHeadUI() {
    headNumberLabel.textContent = `Cabeça ${state.selectedHead} de ${state.totalHeads}`;
    document.querySelectorAll('.head-pill').forEach(p => {
      if (parseInt(p.dataset.head, 10) === state.selectedHead) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  function markActivePreset() {
    document.querySelectorAll('.preset-chip').forEach(c => {
      if (c.dataset.text.trim() === promptInput.value.trim()) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  }

  function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    state.theme = newTheme;

    const iconSun = document.querySelector('.icon-sun');
    const iconMoon = document.querySelector('.icon-moon');
    if (newTheme === 'dark') {
      iconSun.style.display = 'inline';
      iconMoon.style.display = 'none';
    } else {
      iconSun.style.display = 'none';
      iconMoon.style.display = 'inline';
    }
    renderAllViews();
  }

  function updatePromptStats() {
    const text = promptInput.value;
    charCount.textContent = `${text.length} caracteres`;
    const tokens = extractTokens(text);
    tokenCount.textContent = `${tokens.length} tokens`;
  }

  // Tokenização com suporte a acentos (Unicode): "irá", "atenção", "é" ficam inteiros.
  const TOKEN_REGEX = /[\p{L}\p{N}_-]+|[^\s\p{L}\p{N}_-]/gu;

  function extractTokens(text) {
    if (!text || text.trim() === "") return ["<inicio>"];
    const words = text.match(TOKEN_REGEX) || [text];
    return words.slice(-7);
  }

  function lastInputToken() {
    const toks = (state.prompt || "").match(TOKEN_REGEX);
    return toks && toks.length ? toks[toks.length - 1] : "<inicio>";
  }

  // Qualquer mudança no texto de entrada invalida a previsão anterior:
  // para a jornada, limpa as candidatas e volta para a Etapa 1.
  function resetJourneyForNewInput() {
    pauseJourney();
    if (state.revelationTimer) {
      clearInterval(state.revelationTimer);
      state.revelationTimer = null;
    }
    state.isRevealingPredictions = false;
    state.revealedCandidatesCount = 0;
    state.currentPredictions = [];
    updatePromptStats();
    applyStep(0, true);
    renderIsolatedStages();
    inspectorTitle.textContent = "🔄 Nova entrada recebida";
    inspectorDescription.innerHTML = `As previsões anteriores foram descartadas. Clique em <strong>Reproduzir Jornada</strong> para o Transformer processar <em>"${escapeXml(state.prompt)}"</em> e descobrir a palavra seguinte a <strong>"${escapeXml(lastInputToken())}"</strong>.`;
  }

  function computeDeterministicTokenId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 48000) + 1000;
  }

  // ==================== CONTROLE DO PLAYER DE VÍDEO (JORNADA) ====================
  function togglePlayJourney() {
    if (state.isPlaying) {
      pauseJourney();
    } else {
      startJourney();
    }
  }

  function startJourney() {
    state.isPlaying = true;
    playIcon.style.display = "none";
    pauseIcon.style.display = "inline";
    playBtnText.textContent = "Pausar Jornada";

    if (state.currentStep >= JOURNEY_STEPS.length - 1) {
      applyStep(0, true);
    }

    state.timer = setInterval(tickJourney, state.stepSpeed);
  }

  function pauseJourney() {
    state.isPlaying = false;
    clearInterval(state.timer);
    playIcon.style.display = "inline";
    pauseIcon.style.display = "none";
    playBtnText.textContent = "Reproduzir Jornada";
  }

  function tickJourney() {
    if (state.currentStep < JOURNEY_STEPS.length - 1) {
      const nextStep = state.currentStep + 1;
      
      if (nextStep === 2) {
        // Pausa temporária no timer para rodar a animação das 12 cabeças Multi-Head
        clearInterval(state.timer);
        applyStep(2, true);
        animateMultiHeadSweep(() => {
          if (state.isPlaying) {
            state.timer = setInterval(tickJourney, state.stepSpeed);
          }
        });
      } else if (nextStep === 5) {
        // Pausa temporária no timer para rodar a animação dos 12 blocos Transformer
        clearInterval(state.timer);
        applyStep(5, true);
        animateBlocksSweep(() => {
          if (state.isPlaying) {
            state.timer = setInterval(tickJourney, state.stepSpeed);
          }
        });
      } else {
        applyStep(nextStep, true);
      }
    } else {
      pauseJourney();
    }
  }

  function applyStep(index, reRender = true) {
    state.currentStep = index;
    const step = JOURNEY_STEPS[index];
    const ctx = analyzePromptContext(state.prompt);

    currentStepTitle.textContent = step.title;
    hudStepBadge.textContent = step.badge;
    hudConcept.textContent = step.concept;
    hudExplanation.innerHTML = buildDynamicStepExplanation(index, ctx);

    // Se estiver na etapa multi-head, exibe e atualiza a cabeça ativa
    if (index === 2) {
      hudHeadIndicator.style.display = "inline-flex";
      hudHeadPill.textContent = HEAD_SPECIALIZATIONS[state.selectedHead - 1];
    } else {
      hudHeadIndicator.style.display = "none";
    }

    state.selectedBlock = step.block;
    state.selectedHead = step.head;
    blockNumberLabel.textContent = `Bloco ${state.selectedBlock} de ${state.totalBlocks}`;
    updateHeadUI();

    const progressPercent = ((index + 1) / JOURNEY_STEPS.length) * 100;
    timelineFill.style.width = `${progressPercent}%`;

    document.querySelectorAll('.milestone').forEach((m, idx) => {
      if (idx === index) {
        m.classList.add('active');
      } else {
        m.classList.remove('active');
      }
    });

    updateLiveTraceHUD(ctx);

    if (index === 6) {
      // ETAPA FINAL (7): DISPARA A DESCOBERTA E MEDIÇÃO ANIMADA DAS PALAVRAS CANDIDATAS
      startCandidatesRevelation();
    } else {
      // ETAPAS 1 A 6: LIMPA TIMERS E MANTÉM PROBABILIDADES EM MODO DE PROCESSAMENTO
      if (state.revelationTimer) {
        clearInterval(state.revelationTimer);
        state.revelationTimer = null;
      }
      state.isRevealingPredictions = false;
      state.revealedCandidatesCount = 0;

      const hudConfidencePill = document.getElementById('hudConfidencePill');
      if (hudConfidencePill) {
        hudConfidencePill.textContent = `Raciocinando: Etapa ${index + 1}/7 (${ctx.domainLabel})`;
        hudConfidencePill.style.background = "rgba(99, 102, 241, 0.12)";
        hudConfidencePill.style.color = "var(--accent-primary)";
        hudConfidencePill.style.borderColor = "rgba(99, 102, 241, 0.3)";
      }
      const traceEmergingWords = document.getElementById('traceEmergingWords');
      if (traceEmergingWords) {
        traceEmergingWords.textContent = getStepIntermediateHypothesis(index, ctx);
        traceEmergingWords.style.color = "var(--accent-primary)";
      }

      if (reRender) {
        renderFlowchart();
        renderIsolatedProbabilities();
        highlightActiveStage(step.highlightGroup);
      }
    }

    initKaTeX();
  }

  // Animação das 12 Cabeças Multi-Head
  function animateMultiHeadSweep(callback) {
    if (state.isHeadAnimating) return;
    state.isHeadAnimating = true;
    if (btnAnimate12Heads) btnAnimate12Heads.classList.add('is-animating');

    // Ativa fluxo QKV pulsante
    document.querySelectorAll('.svg-stream-q, .svg-stream-k, .svg-stream-v').forEach(el => {
      el.classList.add('animating-flow');
    });

    hudHeadIndicator.style.display = "inline-flex";
    const ctx = analyzePromptContext(state.prompt);

    let currentH = 1;
    const intervalTime = Math.max(140, Math.min(260, state.stepSpeed / 13));

    const headInterval = setInterval(() => {
      state.selectedHead = currentH;
      updateHeadUI();
      hudHeadPill.textContent = HEAD_SPECIALIZATIONS[currentH - 1];

      const traceEmergingWords = document.getElementById('traceEmergingWords');
      if (traceEmergingWords) {
        const lastIdx = Math.max(0, state.tokens.length - 1);
        let bestCol = 0;
        let bestW = -1;
        for (let c = 0; c <= lastIdx; c++) {
          const w = getHeadWeight(currentH, lastIdx, c);
          if (w > bestW) { bestW = w; bestCol = c; }
        }
        const qTok = state.tokens[lastIdx] || ctx.lastWord;
        const kTok = state.tokens[bestCol] || qTok;
        traceEmergingWords.textContent = `H${currentH}: "${qTok}" → "${kTok}" (${(bestW * 100).toFixed(0)}%)`;
        traceEmergingWords.style.color = "var(--accent-purple)";
      }

      renderFlowchart();
      renderIsolatedHeatmap();

      currentH++;
      if (currentH > 12) {
        clearInterval(headInterval);
        state.isHeadAnimating = false;
        if (btnAnimate12Heads) btnAnimate12Heads.classList.remove('is-animating');
        document.querySelectorAll('.svg-stream-q, .svg-stream-k, .svg-stream-v').forEach(el => {
          el.classList.remove('animating-flow');
        });

        // Efeito de concatenação final
        state.showConcatBadge = true;
        renderFlowchart();
        setTimeout(() => {
          state.showConcatBadge = false;
          renderFlowchart();
          if (callback) callback();
        }, 900);
      }
    }, intervalTime);
  }

  // Animação dos 12 Blocos Transformer
  function animateBlocksSweep(callback) {
    if (state.isBlocksAnimating) return;
    state.isBlocksAnimating = true;
    if (btnAnimate12Blocks) btnAnimate12Blocks.classList.add('is-animating');

    const ctx = analyzePromptContext(state.prompt);
    let currentB = 1;
    const intervalTime = Math.max(130, Math.min(220, state.stepSpeed / 13));

    const blockInterval = setInterval(() => {
      state.selectedBlock = currentB;
      blockNumberLabel.textContent = `Bloco ${currentB} de ${state.totalBlocks}`;

      const traceEmergingWords = document.getElementById('traceEmergingWords');
      if (currentB <= 3) {
        hudConcept.textContent = `Bloco ${currentB}/12: Camadas Iniciais (Morfologia de "${ctx.lastWord}")`;
        if (traceEmergingWords) traceEmergingWords.textContent = `Bloco ${currentB}: Classificando "${ctx.lastWord}" (${ctx.lastPosLabel})`;
      } else if (currentB <= 8) {
        hudConcept.textContent = `Bloco ${currentB}/12: Camadas Médias (Vínculo Sintático: ${ctx.slotLabel})`;
        if (traceEmergingWords) traceEmergingWords.textContent = `Bloco ${currentB}: Vinculando sujeito "${ctx.subjectWord || 'implícito'}" e verbo "${ctx.verbWord || 'implícito'}"`;
      } else {
        hudConcept.textContent = `Bloco ${currentB}/12: Camadas Altas (Semântica: ${ctx.domainLabel})`;
        if (traceEmergingWords) traceEmergingWords.textContent = `Bloco ${currentB}: Convergindo vetor para [${ctx.slotLabel} + ${ctx.domainLabel}]`;
      }

      renderFlowchart();

      currentB++;
      if (currentB > 12) {
        clearInterval(blockInterval);
        state.isBlocksAnimating = false;
        if (btnAnimate12Blocks) btnAnimate12Blocks.classList.remove('is-animating');
        if (callback) callback();
      }
    }, intervalTime);
  }

  // Pesos de Atenção Linguísticos Reais para as 12 Cabeças sobre os tokens do usuário
  function getHeadWeight(head, r, c) {
    if (c > r) return 0;
    const toks = state.tokens && state.tokens.length ? state.tokens : extractTokens(state.prompt);
    const qWord = (toks[r] || "").toLowerCase();
    const kWord = (toks[c] || "").toLowerCase();
    const qTag = classifyTokenLinguistics(qWord);
    const kTag = classifyTokenLinguistics(kWord);
    const dist = r - c;
    let w = 0.18;

    switch (head) {
      case 1: // Cabeça 1: Adjacência Imediata (n-grama)
        if (dist === 1) w = 0.88;
        else if (dist === 0) w = 0.42;
        else if (dist === 2) w = 0.28;
        else w = 0.12;
        break;
      case 2: // Cabeça 2: Sintaxe & Concordância Gênero/Número
        if (dist === 1 && (kTag.pos.startsWith("ART") || kTag.pos.startsWith("PREP"))) w = 0.90;
        else if (qTag.gender !== "N" && qTag.gender === kTag.gender && dist > 0) w = 0.82;
        else if (qTag.number === kTag.number && dist === 1) w = 0.72;
        else if (r === c) w = 0.35;
        else w = 0.18;
        break;
      case 3: // Cabeça 3: Dependência Sujeito Raiz
        if (kTag.isSubjectCandidate || c === 0 || (c === 1 && classifyTokenLinguistics((toks[0]||"").toLowerCase()).pos.startsWith("ART"))) w = 0.89;
        else if (r === c) w = 0.32;
        else w = 0.14;
        break;
      case 4: // Cabeça 4: Resolução de Anáforas e Pronomes
        if (kTag.pos.startsWith("PRON") || kTag.pos.startsWith("NOUN")) w = dist >= 1 ? 0.84 : 0.48;
        else w = 0.18;
        break;
      case 5: // Cabeça 5: Estrutura Posicional
        if (c === 0 || c === r) w = 0.76;
        else if (dist === 1) w = 0.55;
        else w = 0.22;
        break;
      case 6: // Cabeça 6: Qualificadores e Modificadores
        if (kTag.pos.startsWith("ADJ") || kTag.pos === "ADV" || dist === 1) w = 0.81;
        else w = 0.20;
        break;
      case 7: // Cabeça 7: Núcleo Verbal e Transitividade
        if (kTag.isVerb) w = 0.92;
        else if (dist === 1) w = 0.58;
        else w = 0.18;
        break;
      case 8: // Cabeça 8: Conectivos e Preposições
        if (kTag.pos.startsWith("PREP") || kTag.pos === "CONJ") w = 0.86;
        else if (dist === 1) w = 0.52;
        else w = 0.16;
        break;
      case 9: // Cabeça 9: Papéis Temáticos (Agente -> Ação -> Alvo)
        if (kTag.isVerb || kTag.isSubjectCandidate) w = 0.85;
        else w = 0.25 + (1 / (dist + 2)) * 0.35;
        break;
      case 10: // Cabeça 10: Co-referência Semântica
        if (kTag.domains.length > 0 && qTag.domains.some(d => kTag.domains.includes(d))) w = 0.88;
        else if (kTag.domains.length > 0) w = 0.68;
        else w = 0.22;
        break;
      case 11: // Cabeça 11: Identificação de Domínio e Entidades
        if (kTag.domains.length > 0) w = 0.90;
        else if (c <= 1) w = 0.65;
        else w = 0.20;
        break;
      case 12: // Cabeça 12: Síntese Global no Último Token
        if (kTag.isVerb || kTag.domains.length > 0 || dist <= 1) w = 0.55 + (1.0 / (dist + 1)) * 0.38;
        else w = 0.32;
        break;
      default:
        w = 0.45;
    }
    return Math.min(0.96, Math.max(0.08, w));
  }

  function highlightActiveStage(group) {
    document.querySelectorAll('.svg-stream-path, .svg-stream-q, .svg-stream-k, .svg-stream-v, .svg-attn-circle, .svg-candidate-word').forEach(el => {
      el.style.filter = '';
    });

    if (group === 'stage-embedding') {
      document.querySelectorAll('.svg-token-label').forEach(el => el.style.filter = 'drop-shadow(0 0 6px #6366f1)');
    } else if (group === 'stage-qkv') {
      document.querySelectorAll('.svg-stream-q, .svg-stream-k, .svg-stream-v').forEach(el => el.style.filter = 'drop-shadow(0 0 6px #818cf8)');
    } else if (group === 'stage-attention') {
      document.querySelectorAll('.svg-attn-circle').forEach(el => el.style.filter = 'drop-shadow(0 0 6px #7c3aed)');
    } else if (group === 'stage-probabilities') {
      document.querySelectorAll('.svg-candidate-word').forEach(el => el.style.filter = 'drop-shadow(0 0 6px #10b981)');
    }
  }

  // ==================== MOTOR DE RACIOCÍNIO CONTEXTUAL, SINTÁTICO & SEMÂNTICO ====================
  const SEMANTIC_DOMAINS = {
    nlp_ai: {
      label: "IA, PLN & Redes Neurais",
      regex: /^(rede|redes|neural|neurais|recorrente|recorrentes|rnn|lstm|gru|transformer|transformers|pln|nlp|atenção|atencao|attention|token|tokens|embedding|embeddings|camada|camadas|peso|pesos|gradiente|gradientes|modelo|modelos|linguagem|artificial|ia|deep|learning|prever|prevê|preve|próxima|proxima|palavra|palavras|decoder|encoder|softmax|logit|logits|vetor|vetores|tensor|tensores|treinamento|treinar|corpus|vocabulário|vocabulario|parâmetro|parametros|gpt|bert|llm|llms)$/i
    },
    tech_code: {
      label: "Computação, Dados & Software",
      regex: /^(computador|computadores|código|codigo|sistema|sistemas|programa|programador|programar|software|hardware|algoritmo|algoritmos|dados|banco|servidor|internet|rede|site|aplicativo|app|arquivo|arquivos|memória|memoria|processador|gpu|cpu|nuvem|digital|tecnologia|tecnologias|usuário|usuarios|usuários|tela|interface|gráfico|grafico|visualização|visualizacao|análise|analise|plataforma|erro|bug|python|javascript|api)$/i
    },
    science_edu: {
      label: "Educação, Mestrado & Ciência",
      regex: /^(aula|aulas|professor|professora|professores|aluno|aluna|alunos|estudante|estudantes|mestrado|doutorado|universidade|faculdade|escola|curso|disciplina|estudo|estudos|estudar|estudando|estudam|aprender|aprendendo|ensinar|explicou|explicar|pesquisa|pesquisas|pesquisador|ciência|ciencia|científico|cientifico|artigo|paper|tese|dissertação|dissertacao|livro|livros|ler|leitura|prova|exame|matéria|materia|teoria|fórmula|formula|conhecimento|biblioteca|laboratório|laboratorio)$/i
    },
    animals: {
      label: "Animais & Comportamento",
      regex: /^(gato|gata|gatos|cachorro|cão|cao|cães|caes|cadela|pássaro|passaro|passarinho|ave|aves|peixe|peixes|cavalo|cavalos|leão|leao|tigre|urso|elefante|macaco|coelho|rato|ratos|cobra|animal|animais|bicho|pet|latir|latiu|miar|miou|voar|voou|rabo|pata|patas|pelo|ninho|aquário|aquario|floresta|selva|fazenda)$/i
    },
    food_drink: {
      label: "Alimentação & Gastronomia",
      regex: /^(comer|comeu|comendo|comida|alimento|alimentos|beber|bebeu|bebendo|tomar|tomou|tomando|café|cafe|água|agua|suco|chá|cha|leite|vinho|cerveja|refrigerante|pão|pao|bolo|pizza|arroz|feijão|feijao|carne|frango|peixe|fruta|frutas|maçã|maca|banana|chocolate|doce|salgado|almoço|almoco|almoçar|jantar|lanche|fome|sede|restaurante|cozinha|cozinhar|prato|mesa|copo|xícara|xicara|faca|garfo|colher|delicioso|quente|gelado|fresco)$/i
    },
    home_objects: {
      label: "Casa, Ambiente & Cotidiano",
      regex: /^(casa|apartamento|quarto|sala|cozinha|banheiro|quintal|jardim|porta|janela|telhado|muro|parede|chão|chao|piso|teto|sofá|sofa|cama|mesa|cadeira|poltrona|armário|armario|estante|tapete|espelho|lâmpada|lampada|luz|chave|relógio|relogio|celular|telefone|mochila|bolsa|roupa|camisa|sapato|dormir|dormiu|acordar|acordou|descansar|limpar|arrumar|morar|mora|subiu|desceu|entrou|saiu|sentou|deitou)$/i
    },
    places_travel: {
      label: "Viagens, Cidades & Lugares",
      regex: /^(viajar|viajou|viagem|viagens|passear|passeio|ir|fui|foi|vamos|vou|cidade|cidades|país|pais|países|mundo|estado|capital|bairro|rua|avenida|praça|praca|parque|praia|mar|oceano|montanha|serra|campo|interior|exterior|hotel|aeroporto|avião|aviao|ônibus|onibus|trem|estação|estacao|mapa|turista|férias|ferias|brasil|europa|lisboa|paris|londres|caminho|destino|chegar|chegou|partir|voltar|voltou)$/i
    },
    nature_weather: {
      label: "Natureza, Clima & Tempo",
      regex: /^(sol|lua|estrela|estrelas|céu|ceu|nuvem|nuvens|chuva|chover|choveu|vento|ventando|tempestade|frio|quente|calor|temperatura|clima|tempo|dia|noite|manhã|manha|tarde|amanheceu|anoiteceu|árvore|arvore|árvores|flor|flores|planta|plantas|folha|folhas|galho|rio|lago|cachoeira|terra|pedra|areia|fogo|ar|natureza|ambiental|meio|ecologia|verde|azul|brilhante|ensolarado|nublado)$/i
    },
    work_economy: {
      label: "Trabalho, Economia & Negócios",
      regex: /^(trabalho|trabalhar|trabalha|trabalhou|emprego|empresa|empresas|negócio|negocio|negócios|mercado|economia|econômico|economico|dinheiro|preço|preco|valor|custo|lucro|investimento|investir|banco|cliente|clientes|vendas|vender|vendeu|comprar|comprou|produto|produtos|serviço|servico|projeto|projetos|equipe|time|reunião|reuniao|escritório|escritorio|carreira|profissão|profissao|salário|salario|governo|lei|política|politica|indústria|industria|produção|producao|gestão|gestao|meta|metas|resultado|resultados)$/i
    },
    health_body: {
      label: "Saúde, Medicina & Bem-Estar",
      regex: /^(saúde|saude|médico|medico|médica|medica|hospital|clínica|clinica|paciente|remédio|remedio|medicamento|tratamento|cura|curar|doença|doenca|dor|febre|exame|consulta|receitou|cuidar|corpo|cabeça|cabeca|coração|coracao|mão|mao|mãos|olho|olhos|mente|cérebro|cerebro|vida|viver|exercício|exercicio|treino|energia|força|forca|bem-estar|descanso|sono)$/i
    },
    sports_games: {
      label: "Esportes, Jogos & Competição",
      regex: /^(jogo|jogos|jogar|jogou|jogador|jogadores|futebol|bola|gol|partida|campeonato|torneio|copa|time|equipe|vencer|venceu|ganhar|ganhou|perder|perdeu|correr|correu|corrida|pular|pulou|nadar|atleta|esporte|esportes|quadra|campo|estádio|estadio|vitória|vitoria|título|titulo|medalha|ponto|pontos|chutou|chutar|defesa|ataque)$/i
    },
    art_media: {
      label: "Cultura, Música, Literatura & Arte",
      regex: /^(música|musica|canção|cancao|cantar|cantou|tocar|tocou|violão|violao|piano|banda|show|festa|arte|artista|pintura|quadro|desenho|filme|filmes|cinema|série|serie|teatro|história|historia|conto|romance|poesia|poema|autor|autora|escritor|escrever|escreveu|obra|obras|cultura|cultural|beleza|bonito|bonita|lindo|linda|emoção|emocao)$/i
    },
    transport: {
      label: "Transporte, Veículos & Mobilidade",
      regex: /^(carro|carros|veículo|veiculo|moto|bicicleta|caminhão|caminhao|ônibus|onibus|metrô|metro|trem|avião|aviao|barco|navio|motorista|piloto|dirigir|dirigiu|conduzir|trânsito|transito|estrada|rodovia|ponte|garagem|combustível|gasolina|elétrico|eletrico|velocidade|rápido|rapido|lento|freio|motor|roda|viagem)$/i
    },
    people_social: {
      label: "Pessoas, Sociedade & Diálogo",
      regex: /^(pessoa|pessoas|gente|homem|mulher|criança|crianca|crianças|menino|menina|família|familia|pai|mãe|mae|filho|filha|irmão|irmao|irmã|irma|amigo|amiga|amigos|colega|vizinho|cidadão|sociedade|comunidade|grupo|povo|conversar|conversou|falar|falou|dizer|disse|perguntar|perguntou|responder|respondeu|ajudar|ajudou|amar|gostar|sentir|pensar|achar|acreditar|feliz|triste|alegre|importante|bom|boa)$/i
    },
    english: {
      label: "English Context & Data Science",
      regex: /^(data|visualization|empowers|users|to|the|a|an|of|in|on|for|with|by|is|are|was|were|be|been|will|can|could|should|would|may|might|must|have|has|had|do|does|did|attention|all|you|we|they|he|she|it|this|that|these|those|need|want|model|models|language|natural|processing|neural|network|networks|deep|learning|transformer|transformers|predict|predicts|next|word|token|tokens|layer|layers|weight|weights|matrix|vector|science|system|information|user|analysis|chart|graph|dashboard|explore|create|build|see|understand|make)$/i
    }
  };

  // Analisador Morfológico e Sintático Individual de Token
  function classifyTokenLinguistics(rawWord) {
    const w = (rawWord || "").toLowerCase().trim();
    const res = {
      word: w,
      pos: "NOUN_M_SG",
      posLabel: "Substantivo/Termo",
      gender: "N",
      number: "SG",
      isVerb: false,
      verbFrame: null,
      isSubjectCandidate: false,
      domains: []
    };
    if (!w) return res;

    // Detecta domínios semânticos do token
    for (const [dKey, dObj] of Object.entries(SEMANTIC_DOMAINS)) {
      if (dObj.regex.test(w)) {
        res.domains.push(dKey);
      }
    }

    // Artigos, Contrações e Determinantes
    if (/^(o|um|este|esse|aquele|meu|teu|seu|nosso|do|no|ao|pelo|num|próximo|proximo|novo|bom|grande|velho|próprio|proprio|único|unico|outro|mesmo|todo|cada)$/.test(w)) {
      res.pos = /^(próximo|proximo|novo|bom|grande|velho|próprio|proprio|único|unico)$/.test(w) ? "ADJ_PRE_M_SG" : "ART_M_SG";
      res.posLabel = "Determinante/Artigo Masc. Sing.";
      res.gender = "M";
      res.number = "SG";
      return res;
    }
    if (/^(a|uma|esta|essa|aquela|minha|tua|sua|nossa|da|na|à|pela|numa|próxima|proxima|nova|boa|velha|própria|propria|única|unica|outra|mesma|toda)$/.test(w)) {
      res.pos = /^(próxima|proxima|nova|boa|velha|própria|propria|única|unica)$/.test(w) ? "ADJ_PRE_F_SG" : "ART_F_SG";
      res.posLabel = "Determinante/Artigo Fem. Sing.";
      res.gender = "F";
      res.number = "SG";
      return res;
    }
    if (/^(os|uns|estes|esses|aqueles|meus|teus|seus|nossos|dos|nos|aos|pelos|muitos|vários|varios|alguns|todos|outros|novos|bons|grandes|diferentes|diversos)$/.test(w)) {
      res.pos = "ART_M_PL";
      res.posLabel = "Determinante/Artigo Masc. Plural";
      res.gender = "M";
      res.number = "PL";
      return res;
    }
    if (/^(as|umas|estas|essas|aquelas|minhas|tuas|suas|nossas|das|nas|às|pelas|muitas|várias|varias|algumas|todas|outras|novas|boas)$/.test(w)) {
      res.pos = "ART_F_PL";
      res.posLabel = "Determinante/Artigo Fem. Plural";
      res.gender = "F";
      res.number = "PL";
      return res;
    }

    // Inglês: Determinantes e Preposições
    if (/^(the|this|that|my|your|our|their|his|her|its)$/.test(w)) {
      res.pos = "EN_DET";
      res.posLabel = "Determiner (EN)";
      return res;
    }
    if (w === "to") {
      res.pos = "EN_TO";
      res.posLabel = "Infinitive Particle 'to' (EN)";
      return res;
    }
    if (/^(is|was|are|were|be|been)$/.test(w)) {
      res.pos = "EN_COPULA";
      res.posLabel = "Copula Verb (EN)";
      res.isVerb = true;
      return res;
    }
    if (/^(will|can|could|should|would|may|might|must)$/.test(w)) {
      res.pos = "EN_MODAL";
      res.posLabel = "Modal Auxiliary (EN)";
      res.isVerb = true;
      return res;
    }

    // Pronomes Pessoais Sujeito
    if (w === "eu") {
      res.pos = "PRON_1SG";
      res.posLabel = "Pronome Pessoal (1ª Pessoa Sing.)";
      res.isSubjectCandidate = true;
      return res;
    }
    if (w === "nós" || w === "nos" && res.pos !== "ART_M_PL") {
      res.pos = "PRON_1PL";
      res.posLabel = "Pronome Pessoal (1ª Pessoa Plural)";
      res.isSubjectCandidate = true;
      return res;
    }
    if (/^(você|voce|ele|ela|alguém|alguem|ninguém|ninguem)$/.test(w)) {
      res.pos = "PRON_3SG";
      res.posLabel = "Pronome Pessoal (3ª Pessoa Sing.)";
      res.gender = w === "ela" ? "F" : "M";
      res.isSubjectCandidate = true;
      return res;
    }
    if (/^(vocês|voces|eles|elas)$/.test(w)) {
      res.pos = "PRON_3PL";
      res.posLabel = "Pronome Pessoal (3ª Pessoa Plural)";
      res.gender = w === "elas" ? "F" : "M";
      res.number = "PL";
      res.isSubjectCandidate = true;
      return res;
    }

    // Preposições e Conectivos
    if (/^(de|em|para|por|com|sem|sobre|entre|até|ate|durante|contra|após|apos|desde|perante|atrás|atras|dentro|fora|perto|longe|antes|depois)$/.test(w)) {
      res.pos = "PREP";
      res.posLabel = "Preposição / Locução Espacial";
      return res;
    }
    if (/^(que|porque|pois|quando|como|se|mas|porém|porem|contudo|entanto|portanto|logo|ou|nem|enquanto|embora)$/.test(w)) {
      res.pos = "CONJ";
      res.posLabel = "Conjunção / Pronome Relativo";
      return res;
    }

    // Advérbios e Intensificadores
    if (/^(muito|muita|bem|mais|menos|tão|tao|bastante|pouco|sempre|nunca|já|ja|ainda|hoje|ontem|amanhã|amanha|agora|aqui|lá|la|ali|assim|também|tambem|só|so|apenas|realmente|rapidamente|lentamente)$/.test(w)) {
      res.pos = "ADV";
      res.posLabel = "Advérbio / Modificador";
      return res;
    }

    // Verbos de Ligação (Cópula / Estado)
    if (/^(é|foi|era|será|sera|está|esta|estava|esteve|estou|fica|ficou|parece|continua|permanece|anda)$/.test(w)) {
      res.pos = "COPULA_SG";
      res.posLabel = "Verbo de Ligação / Estado (Sing.)";
      res.isVerb = true;
      res.verbFrame = "state_predicative";
      return res;
    }
    if (/^(são|sao|foram|eram|serão|serao|estão|estao|estavam|estamos|somos|ficam|ficaram|parecem|continuam)$/.test(w)) {
      res.pos = "COPULA_PL";
      res.posLabel = "Verbo de Ligação / Estado (Plural)";
      res.number = "PL";
      res.isVerb = true;
      res.verbFrame = "state_predicative";
      return res;
    }

    // Verbos Auxiliares / Modais (pedem infinitivo)
    if (/^(vou|vai|irá|ira|vamos|vão|vao|quero|quer|queremos|querem|pode|podem|posso|podemos|deve|devem|devo|devemos|preciso|precisa|precisamos|precisam|consigo|consegue|conseguem|costuma|costumam|começou|comecou|voltou)$/.test(w)) {
      res.pos = "MODAL_VERB";
      res.posLabel = "Verbo Auxiliar / Modal";
      res.isVerb = true;
      res.verbFrame = "modal_infinitive";
      return res;
    }

    // Detecção de Quadros Verbais Específicos (Verb Frames)
    const VERB_FRAMES_LIST = [
      { frame: "eat_food", regex: /^(comer|come|comeu|comem|comendo|almoçar|almocar|almoçou|jantar|jantou|mastigar|preparar|preparou|cozinhar|cozinhou|experimentar|saborear|pedir|pediu)$/ },
      { frame: "drink_liquid", regex: /^(beber|bebe|bebeu|bebem|bebendo|tomar|toma|tomou|tomam|tomando)$/ },
      { frame: "climb_surface", regex: /^(subir|sobe|subiu|subiram|subindo|pular|pula|pulou|saltar|saltou|deitar|deitou|sentar|sentou|cair|caiu|dormir|dorme|dormiu)$/ },
      { frame: "chase_target", regex: /^(correr|corre|correu|correram|correndo|perseguir|perseguiu|fugir|fugiu|caçar|cacar|caçou|atrás|atras|latir|latiu|brincar|brincou)$/ },
      { frame: "teach_learn", regex: /^(estudar|estuda|estudou|estudam|estudando|aprender|aprende|aprendeu|aprendem|aprendendo|ensinar|ensina|ensinou|explicar|explica|explicou|apresentar|apresentou|pesquisar|pesquisou|revisar|compreender|entender|entendeu|resolver|resolveu)$/ },
      { frame: "read_write", regex: /^(ler|lê|le|leu|lendo|escrever|escreve|escreveu|escrevendo|publicar|publicou|assinar|assinou|contar|contou|relatar|descrever|descreveu)$/ },
      { frame: "travel_dest", regex: /^(viajar|viaja|viajou|viajando|ir|fui|foi|foram|indo|passear|passeou|visitar|visitou|chegar|chegou|partir|partiu|voltar|voltou|morar|mora|morou|viver|vive|viveu|entrar|entrou|sair|saiu|caminhar|caminhou|andar|andou)$/ },
      { frame: "compute_nlp", regex: /^(processar|processa|processou|processam|prever|prevê|preve|previu|calcular|calcula|calculou|treinar|treina|treinou|gerar|gera|gerou|classificar|codificar|decodificar|transformar|transforma|transformou|transformará|analisar|analisa|analisou|otimizar|programar|programou|desenvolver|desenvolveu|executar|executou|rodar|rodou|usar|usa|usamos|usou|utilizar|utiliza|utilizou)$/ },
      { frame: "buy_build", regex: /^(comprar|compra|comprou|compraram|vender|vende|vendeu|criar|cria|criou|construir|construiu|produzir|produziu|lançar|lancou|abrir|abriu|fechar|fechou|encontrar|encontrou|perder|perdeu|procurar|procurou|buscar|buscou|escolher|escolheu|ganhar|ganhou|receber|recebeu|dar|deu|entregar|entregou)$/ },
      { frame: "heal_treat", regex: /^(receitar|receitou|examinar|examinou|cuidar|cuidou|curar|curou|atender|atendeu|operar|tratou|tratar|diagnosticar)$/ },
      { frame: "play_music_sport", regex: /^(jogar|joga|jogou|jogaram|chutar|chutou|marcar|marcou|vencer|venceu|competir|tocar|toca|tocou|cantar|canta|cantou|ouvir|ouve|ouviu|escutar|escutou|assistir|assiste|assistiu|ver|vê|ve|viu)$/ },
      { frame: "drive_vehicle", regex: /^(dirigir|dirige|dirigiu|pilotar|conduzir|estacionar|acelerar|frear|embarcar|embarcou)$/ },
      { frame: "like_feel", regex: /^(gostar|gosta|gostou|gostam|amar|ama|amou|adorar|adora|preferir|prefere|sentir|sente|sentiu|pensar|pensa|pensou|acreditar|acredita|sonhar|sonhou|lembrar|lembrou)$/ }
    ];

    for (const vf of VERB_FRAMES_LIST) {
      if (vf.regex.test(w)) {
        res.isVerb = true;
        res.verbFrame = vf.frame;
        if (/(ar|er|ir|or)$/.test(w)) {
          res.pos = "VERB_INF";
          res.posLabel = "Verbo no Infinitivo";
        } else if (/(ando|endo|indo)$/.test(w)) {
          res.pos = "VERB_GER";
          res.posLabel = "Verbo no Gerúndio";
        } else {
          res.pos = "VERB_FIN";
          res.posLabel = "Verbo Conjugado (Ação)";
        }
        return res;
      }
    }

    // Heurística Morfológica para Verbos Gerais não listados acima
    if (w.length > 3 && /(ar|er|ir)$/.test(w) && !/^(mar|par|lar|bar|cor|dor|flor|amor|valor|vetor|motor|fator|setor|autor|calor|sabor|temor|humor|rumor|vapor|tensor|professor|computador|programador|jogador|pesquisador|servidor|lugar|olhar|jantar|almoçar|celular|popular|particular|regular|singular|linear|nuclear|solar|militar|escolar|familiar)$/.test(w)) {
      res.pos = "VERB_INF";
      res.posLabel = "Verbo no Infinitivo";
      res.isVerb = true;
      res.verbFrame = "general_action";
      return res;
    }
    if (w.length > 4 && /(ou|eu|iu|aram|eram|iram|ava|iam|ando|endo|indo)$/.test(w) && !/^(céu|ceu|meu|teu|seu|museu|europeu|troféu|chapéu|grau)$/.test(w)) {
      res.pos = /(ando|endo|indo)$/.test(w) ? "VERB_GER" : "VERB_FIN";
      res.posLabel = /(ando|endo|indo)$/.test(w) ? "Verbo no Gerúndio" : "Verbo Conjugado";
      res.isVerb = true;
      res.verbFrame = "general_action";
      return res;
    }

    // Adjetivos Comuns
    if (/^(bonito|bonita|lindo|linda|grande|pequeno|pequena|alto|alta|baixo|baixa|forte|fraco|rápido|rapido|lento|lenta|quente|frio|fria|bom|boa|ruim|melhor|pior|importante|necessário|necessario|possível|possivel|impossível|difícil|dificil|fácil|facil|claro|clara|escuro|escura|cheio|cheia|vazio|vazia|aberto|aberta|fechado|fechada|limpo|limpa|sujo|suja|feliz|triste|alegre|calmo|calma|inteligente|complexo|complexa|simples|profundo|profunda|artificial|natural|humano|humana|digital|moderno|moderna|antigo|antiga|rico|rica|pobre|caro|cara|barato|barata|doce|salgado|amargo|ensolarado|nublado|chuvoso|azul|verde|vermelho|branco|branca|preto|preta|amarelo|amarela)$/.test(w)) {
      res.gender = w.endsWith("a") ? "F" : (w.endsWith("o") ? "M" : "N");
      res.pos = res.gender === "F" ? "ADJ_F_SG" : "ADJ_M_SG";
      res.posLabel = "Adjetivo Qualificador";
      return res;
    }

    // Substantivos (Morfologia de Gênero e Número)
    res.isSubjectCandidate = true;
    if (w.endsWith("s") && !/^(lápis|lapis|ônibus|onibus|vírus|virus|atlas|país|pais|mais|menos|atrás|atras|após|apos|três|tres|seis|mês|mes|português|portugues|inglês|ingles|francês|frances|simples)$/.test(w)) {
      res.number = "PL";
      if (/(ões|ães|ices|ades|gens|as|es)$/.test(w) && (/(ções|sões|dades|gens|as)$/.test(w) || /^(redes|camadas|palavras|pessoas|empresas|cidades|coisas|ideias|regras|tarefas|aulas|provas|frutas|flores|árvores|arvores|casas|portas|janelas|mesas|cadeiras|músicas|musicas|histórias|historias|obras|férias|ferias|notícias|noticias|informações|informacoes|decisões|decisoes|soluções|solucoes|questões|questoes|cabeças|cabecas|matrizes|funções|funcoes)$/.test(w))) {
        res.gender = "F";
        res.pos = "NOUN_F_PL";
        res.posLabel = "Substantivo Feminino Plural";
      } else {
        res.gender = "M";
        res.pos = "NOUN_M_PL";
        res.posLabel = "Substantivo Masculino Plural";
      }
      return res;
    }

    if (/(ção|são|dade|tude|ice|gem|ência|encia|ância|ancia)$/.test(w) || /^(casa|vida|água|agua|terra|lua|estrela|chuva|nuvem|árvore|arvore|flor|folha|praia|montanha|cidade|rua|avenida|praça|praca|escola|universidade|faculdade|aula|matéria|materia|prova|pesquisa|ciência|ciencia|teoria|fórmula|formula|história|historia|música|musica|arte|obra|festa|empresa|economia|política|politica|lei|saúde|saude|doença|doenca|médica|medica|professora|aluna|menina|mulher|mãe|mae|filha|irmã|irma|amiga|pessoa|criança|crianca|gente|gata|cadela|ave|bola|partida|vitória|vitoria|comida|fruta|maçã|maca|banana|pizza|carne|salada|sopa|água|agua|mesa|cadeira|cama|porta|janela|parede|cozinha|sala|chave|luz|roupa|camisa|bolsa|mochila|estrada|rodovia|ponte|viagem|manhã|manha|tarde|noite|semana|hora|vez|palavra|frase|linguagem|rede|camada|matriz|atenção|atencao|saída|saida|entrada|resposta|pergunta|ideia|coisa|forma|maneira|parte|área|area|meta|força|forca|energia|mente|cabeça|cabeca|mão|mao|voz|cor|paz|fé|fe)$/.test(w)) {
      res.gender = "F";
      res.pos = "NOUN_F_SG";
      res.posLabel = "Substantivo Feminino Singular";
      return res;
    }

    res.gender = "M";
    res.pos = "NOUN_M_SG";
    res.posLabel = "Substantivo Masculino Singular";
    return res;
  }

  // Analisa toda a frase do usuário e sintetiza o contexto sintático e semântico
  function analyzePromptContext(text) {
    const raw = (text || "").trim();
    const lower = raw.toLowerCase().replace(/[\r\n\t]+/g, " ");
    const tokensAll = lower ? (lower.match(TOKEN_REGEX) || [lower]) : [];
    const tagged = tokensAll.map(t => classifyTokenLinguistics(t));
    const N = tagged.length;

    const lastTag = N > 0 ? tagged[N - 1] : classifyTokenLinguistics("");
    const prevTag = N >= 2 ? tagged[N - 2] : null;
    const prev2Tag = N >= 3 ? tagged[N - 3] : null;

    // 1. Identifica Sujeito Principal e Verbo Principal na frase inteira
    let subjectTag = null;
    let verbTag = null;
    const domainScores = {};
    const contextWords = [];

    for (let i = 0; i < N; i++) {
      const tk = tagged[i];
      const recencyBoost = 0.6 + (i / Math.max(1, N)) * 0.8;

      if (tk.isVerb && tk.pos !== "COPULA_SG" && tk.pos !== "COPULA_PL") {
        verbTag = tk;
      } else if (tk.isVerb && !verbTag) {
        verbTag = tk;
      }

      if (!subjectTag && tk.isSubjectCandidate && !tk.isVerb) {
        subjectTag = tk;
      }

      if (tk.domains.length > 0 || tk.isVerb || tk.isSubjectCandidate) {
        if (i < N - 1 || N === 1) contextWords.push(tk.word);
      }

      tk.domains.forEach(d => {
        domainScores[d] = (domainScores[d] || 0) + 1.5 * recencyBoost;
      });

      // Inferência extra de domínio a partir do quadro verbal
      if (tk.verbFrame === "eat_food" || tk.verbFrame === "drink_liquid") {
        domainScores.food_drink = (domainScores.food_drink || 0) + 2.5 * recencyBoost;
      } else if (tk.verbFrame === "climb_surface") {
        domainScores.home_objects = (domainScores.home_objects || 0) + 2.0 * recencyBoost;
      } else if (tk.verbFrame === "chase_target") {
        domainScores.animals = (domainScores.animals || 0) + 2.2 * recencyBoost;
      } else if (tk.verbFrame === "teach_learn") {
        domainScores.science_edu = (domainScores.science_edu || 0) + 2.4 * recencyBoost;
      } else if (tk.verbFrame === "travel_dest") {
        domainScores.places_travel = (domainScores.places_travel || 0) + 2.3 * recencyBoost;
      } else if (tk.verbFrame === "compute_nlp") {
        domainScores.nlp_ai = (domainScores.nlp_ai || 0) + 2.0 * recencyBoost;
        domainScores.tech_code = (domainScores.tech_code || 0) + 1.8 * recencyBoost;
      } else if (tk.verbFrame === "heal_treat") {
        domainScores.health_body = (domainScores.health_body || 0) + 2.6 * recencyBoost;
      } else if (tk.verbFrame === "play_music_sport") {
        domainScores.sports_games = (domainScores.sports_games || 0) + 1.8 * recencyBoost;
        domainScores.art_media = (domainScores.art_media || 0) + 1.8 * recencyBoost;
      } else if (tk.verbFrame === "drive_vehicle") {
        domainScores.transport = (domainScores.transport || 0) + 2.5 * recencyBoost;
      }
    }

    // Determina domínio dominante
    let dominantDomain = "people_social";
    let bestDomainScore = 0;
    for (const [dKey, sc] of Object.entries(domainScores)) {
      if (sc > bestDomainScore) {
        bestDomainScore = sc;
        dominantDomain = dKey;
      }
    }
    const domainLabel = SEMANTIC_DOMAINS[dominantDomain] ? SEMANTIC_DOMAINS[dominantDomain].label : "Contexto Geral Cotidiano";

    // 2. Determina o Slot Sintático esperado para a PRÓXIMA palavra após lastTag
    let expectedSlot = "NOUN_M_SG";
    let slotLabel = "Substantivo Masculino Singular";
    let agreementSummary = "Masculino Singular";

    if (N === 0) {
      expectedSlot = "SENTENCE_START";
      slotLabel = "Início de Sentença (Artigo/Sujeito)";
      agreementSummary = "Abertura Oracional";
    } else if (lastTag.pos === "EN_TO") {
      expectedSlot = "EN_VERB_INF";
      slotLabel = "Infinitive Verb (EN)";
      agreementSummary = "After 'to'";
    } else if (lastTag.pos === "EN_DET") {
      expectedSlot = "EN_NOUN";
      slotLabel = "Noun / Adjective (EN)";
      agreementSummary = "Nominal Phrase";
    } else if (lastTag.pos === "EN_COPULA" || lastTag.pos === "EN_MODAL") {
      expectedSlot = "EN_PREDICATE";
      slotLabel = "Predicate / Complement (EN)";
      agreementSummary = "Verbal Complement";
    } else if (lastTag.pos === "ART_M_SG" || lastTag.pos === "ADJ_PRE_M_SG") {
      expectedSlot = "NOUN_M_SG";
      slotLabel = "Substantivo Masculino Singular";
      agreementSummary = `Concordância Masc. Sing. com "${lastTag.word}"`;
    } else if (lastTag.pos === "ART_F_SG" || lastTag.pos === "ADJ_PRE_F_SG") {
      expectedSlot = "NOUN_F_SG";
      slotLabel = "Substantivo Feminino Singular";
      agreementSummary = `Concordância Fem. Sing. com "${lastTag.word}"`;
    } else if (lastTag.pos === "ART_M_PL") {
      expectedSlot = "NOUN_M_PL";
      slotLabel = "Substantivo Masculino Plural";
      agreementSummary = `Concordância Masc. Plural com "${lastTag.word}"`;
    } else if (lastTag.pos === "ART_F_PL") {
      expectedSlot = "NOUN_F_PL";
      slotLabel = "Substantivo Feminino Plural";
      agreementSummary = `Concordância Fem. Plural com "${lastTag.word}"`;
    } else if (lastTag.pos === "PRON_1SG") {
      expectedSlot = "VERB_1SG";
      slotLabel = "Verbo na 1ª Pessoa do Singular";
      agreementSummary = `Concordância Verbal com "eu"`;
    } else if (lastTag.pos === "PRON_1PL") {
      expectedSlot = "VERB_1PL";
      slotLabel = "Verbo na 1ª Pessoa do Plural";
      agreementSummary = `Concordância Verbal com "nós"`;
    } else if (lastTag.pos === "PRON_3SG") {
      expectedSlot = "VERB_3SG";
      slotLabel = "Verbo na 3ª Pessoa do Singular";
      agreementSummary = `Concordância Verbal com "${lastTag.word}"`;
    } else if (lastTag.pos === "PRON_3PL") {
      expectedSlot = "VERB_3PL";
      slotLabel = "Verbo na 3ª Pessoa do Plural";
      agreementSummary = `Concordância Verbal com "${lastTag.word}"`;
    } else if (lastTag.pos === "MODAL_VERB") {
      expectedSlot = "VERB_INF";
      slotLabel = "Verbo Principal no Infinitivo";
      agreementSummary = `Locução Verbal regida por "${lastTag.word}"`;
    } else if (lastTag.pos === "COPULA_SG") {
      expectedSlot = subjectTag && subjectTag.gender === "F" ? "PRED_F_SG" : "PRED_M_SG";
      slotLabel = subjectTag && subjectTag.gender === "F" ? "Predicativo / Adjetivo Feminino" : "Predicativo / Adjetivo Masculino";
      agreementSummary = `Predicativo concordando com "${subjectTag ? subjectTag.word : 'sujeito'}"`;
    } else if (lastTag.pos === "COPULA_PL") {
      expectedSlot = subjectTag && subjectTag.gender === "F" ? "PRED_F_PL" : "PRED_M_PL";
      slotLabel = "Predicativo / Adjetivo no Plural";
      agreementSummary = `Predicativo plural concordando com "${subjectTag ? subjectTag.word : 'sujeito'}"`;
    } else if (lastTag.pos === "PREP") {
      if (lastTag.word === "para" && (!prevTag || prevTag.isVerb || prevTag.pos.startsWith("NOUN"))) {
        if (verbTag && verbTag.verbFrame === "travel_dest") {
          expectedSlot = "PREP_COMPLEMENT";
          slotLabel = `Destino / Lugar regido por "${lastTag.word}"`;
        } else {
          expectedSlot = "PREP_PARA";
          slotLabel = `Verbo Infinitivo ou Alvo após "para"`;
        }
      } else if (lastTag.word === "de" && prevTag && (prevTag.verbFrame === "like_feel" || /^(gosto|gosta|gostam|preciso|precisa|cansado|capaz|hora|tempo|vontade|medo|orgulho)$/.test(prevTag.word))) {
        expectedSlot = "PREP_DE_ACTION_OR_NOUN";
        slotLabel = `Ação ou Objeto regido por "${prevTag.word} de"`;
      } else if (lastTag.word === "atrás" || lastTag.word === "atras" || lastTag.word === "perto" || lastTag.word === "dentro" || lastTag.word === "fora" || lastTag.word === "antes" || lastTag.word === "depois") {
        expectedSlot = "LOCUTION_DE";
        slotLabel = `Preposição "de/do/da" completando "${lastTag.word}"`;
      } else {
        expectedSlot = "PREP_COMPLEMENT";
        slotLabel = `Complemento Nominal regido por "${lastTag.word}"`;
      }
      agreementSummary = `Regência prepositiva de "${lastTag.word}"`;
    } else if (lastTag.pos === "VERB_INF" || lastTag.pos === "VERB_FIN" || lastTag.pos === "VERB_GER") {
      expectedSlot = "VERB_OBJECT";
      slotLabel = `Objeto / Complemento Verbal de "${lastTag.word}"`;
      agreementSummary = `Transitividade do verbo "${lastTag.word}"`;
    } else if (lastTag.pos === "ADV") {
      if (prevTag && (prevTag.pos === "COPULA_SG" || prevTag.pos === "COPULA_PL" || prevTag.pos.startsWith("NOUN"))) {
        expectedSlot = subjectTag && subjectTag.gender === "F" ? "PRED_F_SG" : "PRED_M_SG";
        slotLabel = `Adjetivo intensificado por "${lastTag.word}"`;
        agreementSummary = `Concordância nominal com "${subjectTag ? subjectTag.word : 'sujeito'}"`;
      } else {
        expectedSlot = "AFTER_ADV";
        slotLabel = `Continuação verbal/adjetival após "${lastTag.word}"`;
        agreementSummary = `Escopo do modificador "${lastTag.word}"`;
      }
    } else if (lastTag.pos === "NOUN_M_SG") {
      if (!verbTag) {
        expectedSlot = "AFTER_SUBJ_M_SG";
        slotLabel = `Verbo (3ª Sing.) ou Adjetivo para "${lastTag.word}"`;
        agreementSummary = `Sujeito Masc. Sing. "${lastTag.word}"`;
      } else {
        expectedSlot = "AFTER_OBJ_M_SG";
        slotLabel = `Qualificador Masc. ou Conectivo após "${lastTag.word}"`;
        agreementSummary = `Concordância com "${lastTag.word}"`;
      }
    } else if (lastTag.pos === "NOUN_F_SG") {
      if (!verbTag) {
        expectedSlot = "AFTER_SUBJ_F_SG";
        slotLabel = `Verbo (3ª Sing.) ou Adjetivo para "${lastTag.word}"`;
        agreementSummary = `Sujeito Fem. Sing. "${lastTag.word}"`;
      } else {
        expectedSlot = "AFTER_OBJ_F_SG";
        slotLabel = `Qualificador Fem. ou Conectivo após "${lastTag.word}"`;
        agreementSummary = `Concordância com "${lastTag.word}"`;
      }
    } else if (lastTag.pos === "NOUN_M_PL" || lastTag.pos === "NOUN_F_PL") {
      const isFem = lastTag.pos === "NOUN_F_PL";
      if (!verbTag) {
        expectedSlot = isFem ? "AFTER_SUBJ_F_PL" : "AFTER_SUBJ_M_PL";
        slotLabel = `Verbo (3ª Plural) ou Qualificador para "${lastTag.word}"`;
        agreementSummary = `Sujeito Plural "${lastTag.word}"`;
      } else {
        expectedSlot = isFem ? "AFTER_OBJ_F_PL" : "AFTER_OBJ_M_PL";
        slotLabel = `Qualificador Plural ou Conectivo após "${lastTag.word}"`;
        agreementSummary = `Concordância Plural com "${lastTag.word}"`;
      }
    } else if (lastTag.pos === "CONJ") {
      expectedSlot = "AFTER_CONJ";
      slotLabel = `Nova Oração / Sujeito após "${lastTag.word}"`;
      agreementSummary = `Articulação sintática pós-"${lastTag.word}"`;
    } else {
      expectedSlot = "GENERAL_CONTINUATION";
      slotLabel = "Continuação Sintática Contextual";
      agreementSummary = `Fluxo após "${lastTag.word}"`;
    }

    const uniqueCtx = [...new Set(contextWords.slice(-4))];
    const contextWordsSummary = uniqueCtx.length > 0 ? uniqueCtx.map(w => `"${w}"`).join(" + ") : (lastTag.word ? `"${lastTag.word}"` : "Início");

    return {
      raw,
      lower,
      tokensAll,
      tagged,
      lastWord: lastTag.word || "<inicio>",
      lastTag,
      lastPosLabel: lastTag.posLabel,
      prevWord: prevTag ? prevTag.word : "",
      prevTag,
      prev2Tag,
      bigram: prevTag ? `${prevTag.word} ${lastTag.word}` : lastTag.word,
      trigram: prev2Tag && prevTag ? `${prev2Tag.word} ${prevTag.word} ${lastTag.word}` : "",
      subjectWord: subjectTag ? subjectTag.word : null,
      subjectTag,
      verbWord: verbTag ? verbTag.word : null,
      verbTag,
      activeVerbFrame: verbTag ? verbTag.verbFrame : null,
      dominantDomain,
      domainLabel,
      domainScores,
      expectedSlot,
      slotLabel,
      agreementSummary,
      contextWordsSummary
    };
  }

  // Explicações Dinâmicas em Tempo Real para cada uma das 7 Etapas baseadas na frase do usuário
  function buildDynamicStepExplanation(stepIndex, ctx) {
    const tokList = ctx.tokensAll.slice(-7).map(t => `<code>"${escapeXml(t)}"</code>`).join(", ") || "<code>&lt;inicio&gt;</code>";
    const lastW = escapeXml(ctx.lastWord);
    const subjW = escapeXml(ctx.subjectWord || ctx.tokensAll[0] || "início");
    const verbW = escapeXml(ctx.verbWord || ctx.lastWord);

    switch (stepIndex) {
      case 0:
        return `A frase digitada é segmentada nos tokens ${tokList} e projetada em $\\mathbb{R}^{768}$ com codificação posicional ($\\mathbf{x}_t = \\mathbf{e}_t + \\mathbf{p}_t$). O modelo identifica o último token <strong>"${lastW}"</strong> (<em>${escapeXml(ctx.lastPosLabel)}</em>) na extremidade da janela.`;
      case 1:
        return `O token final <strong>"${lastW}"</strong> gera o vetor <strong>Query ($Q$)</strong> buscando pistas nos tokens anteriores (${escapeXml(ctx.contextWordsSummary)}). Sua estrutura morfológica abre uma expectativa sintática para: <strong>${escapeXml(ctx.slotLabel)}</strong>.`;
      case 2:
        return `As 12 cabeças calculam $\\text{Softmax}(QK^T/\\sqrt{d_k} + M)$. A atenção conecta <strong>"${lastW}"</strong> ao núcleo semântico <strong>"${subjW}"</strong> e à ação <strong>"${verbW}"</strong>, impondo <em>${escapeXml(ctx.agreementSummary)}</em> no domínio de <strong>${escapeXml(ctx.domainLabel)}</strong>.`;
      case 3:
        return `A matriz de atenção pondera os vetores de <strong>Value ($V$)</strong> e soma ao atalho residual ($\\mathbf{x}_1 = \\mathbf{x}_0 + \\text{Attn}(\\mathbf{x}_0)$). O vetor de <strong>"${lastW}"</strong> agora carrega a intenção combinada de ${escapeXml(ctx.contextWordsSummary)}.`;
      case 4:
        return `No bloco <strong>Mixture of Experts (MoE)</strong>, o Router calcula $g_i(x) = \\text{Softmax}(\\text{TopK}(x W_g))$ para ativar os especialistas do domínio <strong>${escapeXml(ctx.domainLabel)}</strong> e somar ao <strong>Shared Expert</strong> ($y = E_{\\text{shared}}(x) + \\sum_{i \\in \\text{TopK}(x)} g_i(x) E_i(x)$).`;
      case 5:
        return `Atravessando os 12 blocos Transformer: as camadas iniciais fixam a gramática de <strong>"${lastW}"</strong>, as médias alinham <strong>"${subjW}"</strong> + <strong>"${verbW}"</strong>, e as profundas refinam o subespaço semântico de <strong>${escapeXml(ctx.domainLabel)}</strong>.`;
      case 6:
        return `O vetor final $\\mathbf{h}_{12}$ de <strong>"${lastW}"</strong> multiplica a matriz de vocabulário $W_U$ e passa pelo Softmax ($T = ${state.temperature.toFixed(2)}$), descobrindo e medindo uma a uma as palavras candidatas para completar a sua frase!`;
      default:
        return JOURNEY_STEPS[stepIndex].explanation;
    }
  }

  function getStepIntermediateHypothesis(stepIndex, ctx) {
    switch (stepIndex) {
      case 0: return `Token final "${ctx.lastWord}" (${ctx.lastPosLabel}) vetorizado`;
      case 1: return `Query de "${ctx.lastWord}" exige: ${ctx.slotLabel}`;
      case 2: return `Atenção vinculando "${ctx.lastWord}" ← ${ctx.contextWordsSummary}`;
      case 3: return `Restrição ativa: ${ctx.agreementSummary}`;
      case 4: return `MoE Router ativou Top-K Experts para [${ctx.domainLabel}]`;
      case 5: return `Convergindo 12 blocos para [${ctx.slotLabel}]`;
      default: return "Projetando no vocabulário W_U...";
    }
  }

  // ==================== MOTOR COMPOSICIONAL DE PREVISÃO DE PRÓXIMA PALAVRA ====================
  function getCandidatePredictions(text, temperature) {
    const raw = (text || "").trim();
    if (!raw) {
      return [
        { word: "O", prob: 0.35, probPercent: "35.00%", logit: 7.5, note: "Artigo masculino definido iniciando nova sentença." },
        { word: "A", prob: 0.28, probPercent: "28.00%", logit: 7.1, note: "Artigo feminino definido iniciando nova sentença." },
        { word: "No", prob: 0.15, probPercent: "15.00%", logit: 6.2, note: "Contração prepositiva situando contexto." },
        { word: "Eu", prob: 0.12, probPercent: "12.00%", logit: 5.8, note: "Pronome pessoal em 1ª pessoa iniciando discurso." },
        { word: "Hoje", prob: 0.10, probPercent: "10.00%", logit: 5.5, note: "Advérbio temporal de abertura." }
      ];
    }

    const ctx = analyzePromptContext(raw);
    const { lastWord, prevWord, bigram, trigram, dominantDomain, domainLabel, activeVerbFrame, verbWord, subjectWord, expectedSlot } = ctx;

    // 1. Expressões Canônicas & Colocações Fortes (Presets + Frases Clássicas)
    const EXACT_PATTERNS = {
      "data visualization empowers users to": [
        { word: "visualize", logit: 9.5, note: "Ação direta de visualização gráfica a partir de 'data visualization'." },
        { word: "create", logit: 8.3, note: "Construção de relatórios e dashboards interativos." },
        { word: "see", logit: 7.8, note: "Percepção visual imediata de padrões nos dados." },
        { word: "explore", logit: 7.4, note: "Análise exploratória multidimensional (EDA)." },
        { word: "understand", logit: 7.0, note: "Compreensão de tendências e correlações." },
        { word: "make", logit: 6.6, note: "Tomada de decisão fundamentada em dados." }
      ],
      "a inteligência artificial irá transformar o": [
        { word: "mundo", logit: 9.3, note: "Impacto global direto projetado para 'inteligência artificial' + 'transformar o'." },
        { word: "futuro", logit: 8.7, note: "Projeção temporal associada ao verbo no futuro 'irá transformar'." },
        { word: "mercado", logit: 8.1, note: "Revolução econômica e corporativa causada pela IA." },
        { word: "trabalho", logit: 7.6, note: "Transformação estrutural nas profissões." },
        { word: "conhecimento", logit: 7.1, note: "Nova síntese automatizada da ciência humana." },
        { word: "ensino", logit: 6.6, note: "Personalização educacional por modelos generativos." }
      ],
      "o modelo de linguagem prevê a próxima": [
        { word: "palavra", logit: 9.7, note: "Definição formal autoregressiva: prever a 'próxima palavra' dada a sequência." },
        { word: "sequência", logit: 8.4, note: "Previsão de cadeias de tokens consecutivos." },
        { word: "frase", logit: 7.7, note: "Unidade sintática completa gerada pelo decoder." },
        { word: "resposta", logit: 7.2, note: "Geração contextual em assistentes conversacionais." },
        { word: "etapa", logit: 6.6, note: "Passo seguinte no raciocínio estruturado." },
        { word: "ação", logit: 6.1, note: "Decisão em agentes autônomos." }
      ],
      "atenção é tudo o que você": [
        { word: "precisa", logit: 9.9, note: "Tradução exata do artigo seminal 'Attention Is All You Need' (Vaswani et al., 2017)." },
        { word: "necessita", logit: 8.0, note: "Sinônimo formal concordando com o pronome 'você'." },
        { word: "deseja", logit: 7.1, note: "Variação semântica volitiva na 3ª pessoa." },
        { word: "busca", logit: 6.6, note: "Foco em recuperação de informação relevante." },
        { word: "procura", logit: 6.2, note: "Alinhamento de consulta (Query) no contexto." },
        { word: "quer", logit: 5.8, note: "Forma verbal coloquial equivalente." }
      ],
      "attention is all you": [
        { word: "need", logit: 9.9, note: "Classic title of Vaswani et al. (2017): 'Attention Is All You Need'." },
        { word: "want", logit: 7.2, note: "Alternative transitive verb matching 'you'." },
        { word: "require", logit: 6.7, note: "Formal synonym in academic English." },
        { word: "seek", logit: 6.1, note: "Query-oriented semantic completion." },
        { word: "use", logit: 5.7, note: "Architectural sufficiency statement." },
        { word: "have", logit: 5.3, note: "Possessive auxiliary completion." }
      ],
      "no processamento de linguagem natural usamos redes": [
        { word: "neurais", logit: 9.6, note: "Colocação técnica central: 'redes neurais' aplicadas a PLN." },
        { word: "recorrentes", logit: 8.5, note: "Arquiteturas RNN/LSTM para modelagem sequencial de texto." },
        { word: "profundas", logit: 7.6, note: "Deep Learning com múltiplas camadas de abstração." },
        { word: "densas", logit: 6.9, note: "Camadas lineares totalmente conectadas (MLP)." },
        { word: "convolucionais", logit: 6.4, note: "CNNs unidimensionais para extração de n-gramas." },
        { word: "artificiais", logit: 6.0, note: "Qualificador formal de sistemas conexionistas." }
      ],
      "processamento de linguagem": [
        { word: "natural", logit: 9.9, note: "Termo consagrado da área: Processamento de Linguagem Natural (PLN)." },
        { word: "humana", logit: 7.4, note: "Modelagem computacional da comunicação humana." },
        { word: "computacional", logit: 6.8, note: "Linguística computacional e formal." },
        { word: "escrita", logit: 6.2, note: "Análise de corpora textuais." },
        { word: "falada", logit: 5.8, note: "Reconhecimento e síntese de voz." },
        { word: "técnica", logit: 5.4, note: "Domínios especializados." }
      ],
      "redes neurais": [
        { word: "recorrentes", logit: 9.4, note: "RNNs e LSTMs especializadas em séries temporais e sequências." },
        { word: "profundas", logit: 8.7, note: "Arquiteturas Deep Learning com múltiplas camadas ocultas." },
        { word: "artificiais", logit: 8.3, note: "Nomenclatura clássica da computação bioinspirada." },
        { word: "convolucionais", logit: 7.7, note: "Redes especializadas em padrões locais e visão." },
        { word: "são", logit: 7.2, note: "Verbo de ligação iniciando definição das redes." },
        { word: "aprendem", logit: 6.8, note: "Verbo de ação descrevendo o ajuste sináptico." }
      ],
      "inteligência artificial": [
        { word: "generativa", logit: 9.2, note: "Qualificador feminino ligado aos LLMs e Transformers modernos." },
        { word: "irá", logit: 8.8, note: "Verbo auxiliar projetando o impacto futuro da IA." },
        { word: "está", logit: 8.4, note: "Verbo auxiliar descrevendo a transformação em curso." },
        { word: "pode", logit: 7.9, note: "Modalizador de capacidade analítica e automação." },
        { word: "transforma", logit: 7.4, note: "Verbo transitivo direto concordando com 'inteligência'." },
        { word: "moderna", logit: 6.9, note: "Adjetivo feminino qualificando o estado da arte." }
      ]
    };

    const fullClean = ctx.tokensAll.join(" ");
    let rawCandidates = null;
    if (EXACT_PATTERNS[fullClean]) {
      rawCandidates = EXACT_PATTERNS[fullClean];
    } else if (trigram && EXACT_PATTERNS[trigram]) {
      rawCandidates = EXACT_PATTERNS[trigram];
    } else if (bigram && EXACT_PATTERNS[bigram]) {
      rawCandidates = EXACT_PATTERNS[bigram];
    }

    // 2. BANCOS DE VOCABULÁRIO CONTEXTUAL POR SLOT SINTÁTICO E DOMÍNIO SEMÂNTICO
    // Se a frase do usuário é nova/customizada, o modelo raciocina combinando:
    // (a) Slot Gramatical exigido pelo último token + (b) Quadro do Verbo ativo + (c) Domínio Semântico da frase inteira!
    if (!rawCandidates) {
      rawCandidates = synthesizeContextualCandidates(ctx);
    }

    // Remove qualquer palavra idêntica ao último token para evitar repetição artificial ("o o", "casa casa")
    const filtered = rawCandidates.filter(c => c.word.toLowerCase() !== lastWord);
    const finalPool = (filtered.length >= 4 ? filtered : rawCandidates).slice(0, 8);

    // 3. Aplicação da Temperatura (T) e Softmax
    const T = Math.max(0.05, temperature);
    const scaled = finalPool.map(c => c.logit / T);
    const maxVal = Math.max(...scaled);
    const exps = scaled.map(s => Math.exp(s - maxVal));
    const sumExps = exps.reduce((a, b) => a + b, 0);

    return finalPool.map((c, i) => {
      const p = exps[i] / sumExps;
      return {
        word: c.word,
        prob: p,
        probPercent: (p * 100).toFixed(2) + "%",
        logit: c.logit,
        note: c.note
      };
    }).sort((a, b) => b.prob - a.prob);
  }

  // Sintetizador Composicional que raciocina sobre QUALQUER frase nova digitada pelo usuário
  function synthesizeContextualCandidates(ctx) {
    const { lastWord, prevWord, subjectWord, verbWord, activeVerbFrame, dominantDomain, domainLabel, expectedSlot, slotLabel } = ctx;
    const subjCite = subjectWord ? `sujeito "${subjectWord}"` : `contexto inicial`;
    const verbCite = verbWord ? `verbo "${verbWord}"` : `fluxo da frase`;

    // A) Substantivos Masculinos Singulares por Quadro Verbal e Domínio (ex: após "o, um, do, no, pelo, meu, novo...")
    const NOUN_M_SG_BY_CONTEXT = {
      frame_climb_surface: [
        { word: "telhado", logit: 9.4, why: `superfície elevada típica para a ação "${verbWord}" do ${subjCite}` },
        { word: "sofá", logit: 8.9, why: `móvel doméstico compatível com "${verbWord} ${lastWord}"` },
        { word: "muro", logit: 8.5, why: `estrutura física associada ao movimento de "${verbWord}"` },
        { word: "galho", logit: 8.0, why: `apoio natural frequente em narrativas com "${subjectWord || verbWord}"` },
        { word: "tapete", logit: 7.5, why: `objeto de repouso doméstico no espaço da frase` },
        { word: "armário", logit: 7.1, why: `móvel elevado no ambiente interno` }
      ],
      frame_chase_target: [
        { word: "gato", logit: 9.5, why: `alvo clássico de perseguição associado ao ${subjCite} e "${verbWord}"` },
        { word: "osso", logit: 8.8, why: `objeto de interesse direto ligado a "${subjectWord || verbWord}"` },
        { word: "brinquedo", logit: 8.3, why: `alvo lúdico compatível com a ação "${verbWord}"` },
        { word: "carteiro", logit: 7.9, why: `personagem recorrente em cenas com "${subjectWord || 'cão'}"` },
        { word: "coelho", logit: 7.4, why: `animal veloz associado ao verbo "${verbWord}"` },
        { word: "carro", logit: 7.0, why: `objeto em movimento no cenário urbano` }
      ],
      frame_eat_food: [
        { word: "pão", logit: 9.4, why: `alimento masculino singular selecionado pelo verbo "${verbWord}"` },
        { word: "bolo", logit: 8.9, why: `alimento preparado compatível com "${verbWord} ${lastWord}"` },
        { word: "almoço", logit: 8.5, why: `refeição principal associada à ação "${verbWord}"` },
        { word: "arroz", logit: 8.0, why: `item culinário cotidiano no domínio de alimentação` },
        { word: "chocolate", logit: 7.6, why: `alimento energético frequente após "${verbWord}"` },
        { word: "queijo", logit: 7.2, why: `ingrediente alimentar concordando com "${lastWord}"` }
      ],
      frame_drink_liquid: [
        { word: "café", logit: 9.6, why: `bebida masculina singular de maior afinidade com "${verbWord}"` },
        { word: "suco", logit: 8.9, why: `líquido natural selecionado pelo quadro verbal de "${verbWord}"` },
        { word: "chá", logit: 8.3, why: `bebida quente/gelada compatível com "${verbWord} ${lastWord}"` },
        { word: "leite", logit: 7.8, why: `bebida cotidiana associada ao ${subjCite}` },
        { word: "refrigerante", logit: 7.3, why: `bebida gaseificada concordando no masculino singular` },
        { word: "vinho", logit: 6.9, why: `bebida associada a refeições e encontros` }
      ],
      frame_heal_treat: [
        { word: "remédio", logit: 9.5, why: `prescrição direta associada ao ${subjCite} e ao verbo "${verbWord}"` },
        { word: "medicamento", logit: 8.9, why: `termo clínico formal exigido por "${verbWord}"` },
        { word: "tratamento", logit: 8.4, why: `conduta terapêutica conduzida pelo ${subjCite}` },
        { word: "paciente", logit: 8.0, why: `agente receptor do cuidado médico na oração` },
        { word: "exame", logit: 7.5, why: `procedimento diagnóstico hospitalar` },
        { word: "repouso", logit: 7.0, why: `recomendação médica frequente` }
      ],
      nlp_ai: [
        { word: "modelo", logit: 9.4, why: `entidade central de IA/PLN concordando com "${lastWord}"` },
        { word: "transformer", logit: 8.9, why: `arquitetura neural em foco na frase (${ctx.contextWordsSummary})` },
        { word: "contexto", logit: 8.5, why: `informação semântica agregada pelas cabeças de atenção` },
        { word: "vetor", logit: 8.0, why: `representação contínua processada por "${verbWord || 'rede'}"` },
        { word: "token", logit: 7.6, why: `unidade discreta de entrada na sequência` },
        { word: "vocabulário", logit: 7.2, why: `espaço de projeção final do decodificador` }
      ],
      tech_code: [
        { word: "sistema", logit: 9.3, why: `arquitetura computacional ligada a ${ctx.contextWordsSummary}` },
        { word: "código", logit: 8.8, why: `artefato de software associado a "${verbWord || subjectWord}"` },
        { word: "algoritmo", logit: 8.4, why: `procedimento lógico do domínio de computação` },
        { word: "programa", logit: 7.9, why: `aplicação executada no ambiente técnico` },
        { word: "servidor", logit: 7.5, why: `infraestrutura de processamento de dados` },
        { word: "aplicativo", logit: 7.1, why: `solução digital voltada ao usuário` }
      ],
      science_edu: [
        { word: "conteúdo", logit: 9.3, why: `objeto pedagógico associado a ${ctx.contextWordsSummary}` },
        { word: "artigo", logit: 8.8, why: `produção acadêmica ligada ao ${subjCite}` },
        { word: "assunto", logit: 8.4, why: `tema de estudo abordado por "${verbWord || subjectWord}"` },
        { word: "exercício", logit: 7.9, why: `atividade prática de fixação em aula` },
        { word: "livro", logit: 7.5, why: `material bibliográfico de referência` },
        { word: "projeto", logit: 7.1, why: `pesquisa desenvolvida no curso/mestrado` }
      ],
      animals: [
        { word: "quintal", logit: 9.2, why: `espaço físico associado ao comportamento de "${subjectWord || 'animal'}"` },
        { word: "jardim", logit: 8.7, why: `ambiente aberto compatível com "${verbWord || subjectWord}"` },
        { word: "parque", logit: 8.3, why: `local de passeio e corrida para "${subjectWord || 'pet'}"` },
        { word: "pássaro", logit: 7.9, why: `elemento da fauna presente no mesmo cenário` },
        { word: "ninho", logit: 7.4, why: `abrigo natural no domínio zoológico` },
        { word: "mato", logit: 7.0, why: `vegetação associada ao ambiente natural` }
      ],
      places_travel: [
        { word: "exterior", logit: 9.2, why: `destino de viagem compatível com "${verbWord || 'viajar'}"` },
        { word: "aeroporto", logit: 8.7, why: `infraestrutura de embarque associada a ${ctx.contextWordsSummary}` },
        { word: "hotel", logit: 8.3, why: `local de hospedagem em viagens` },
        { word: "centro", logit: 7.9, why: `região urbana de deslocamento` },
        { word: "litoral", logit: 7.5, why: `destino turístico costeiro` },
        { word: "interior", logit: 7.1, why: `região tranquila de passeio` }
      ],
      nature_weather: [
        { word: "céu", logit: 9.3, why: `elemento atmosférico ligado a ${ctx.contextWordsSummary}` },
        { word: "horizonte", logit: 8.7, why: `referência visual da paisagem natural` },
        { word: "mar", logit: 8.3, why: `ecossistema natural alinhado ao tema da frase` },
        { word: "vento", logit: 7.9, why: `fenômeno meteorológico associado` },
        { word: "clima", logit: 7.5, why: `condição ambiental em foco` },
        { word: "planeta", logit: 7.1, why: `escala ambiental global` }
      ],
      work_economy: [
        { word: "mercado", logit: 9.3, why: `ambiente econômico ligado a ${ctx.contextWordsSummary}` },
        { word: "projeto", logit: 8.8, why: `iniciativa profissional conduzida pelo ${subjCite}` },
        { word: "trabalho", logit: 8.4, why: `atividade produtiva central no contexto` },
        { word: "contrato", logit: 7.9, why: `instrumento formal de negócios` },
        { word: "resultado", logit: 7.5, why: `desfecho corporativo esperado` },
        { word: "setor", logit: 7.1, why: `segmento produtivo da economia` }
      ],
      sports_games: [
        { word: "campeonato", logit: 9.4, why: `competição principal disputada pelo ${subjCite}` },
        { word: "jogo", logit: 8.9, why: `evento esportivo ligado à ação "${verbWord || 'competir'}"` },
        { word: "título", logit: 8.5, why: `conquista máxima almejada na partida` },
        { word: "gol", logit: 8.0, why: `objetivo central da jogada esportiva` },
        { word: "torneio", logit: 7.5, why: `disputa organizada entre equipes` },
        { word: "estádio", logit: 7.1, why: `arena onde ocorre a partida` }
      ],
      art_media: [
        { word: "público", logit: 9.2, why: `audiência receptora da expressão artística` },
        { word: "palco", logit: 8.8, why: `espaço de apresentação musical/cultural` },
        { word: "romance", logit: 8.3, why: `gênero literário associado a "${verbWord || subjectWord}"` },
        { word: "filme", logit: 7.9, why: `obra audiovisual narrativa` },
        { word: "quadro", logit: 7.5, why: `obra visual ou artística` },
        { word: "ritmo", logit: 7.1, why: `cadência musical da composição` }
      ],
      transport: [
        { word: "carro", logit: 9.4, why: `veículo automotor central no contexto de mobilidade` },
        { word: "trânsito", logit: 8.8, why: `fluxo viário associado a ${ctx.contextWordsSummary}` },
        { word: "caminho", logit: 8.3, why: `trajeto percorrido pelo ${subjCite}` },
        { word: "destino", logit: 7.9, why: `ponto final do deslocamento` },
        { word: "motor", logit: 7.4, why: `componente mecânico de propulsão` },
        { word: "ônibus", logit: 7.0, why: `transporte coletivo urbano` }
      ],
      home_objects: [
        { word: "quarto", logit: 9.2, why: `cômodo residencial ligado a ${ctx.contextWordsSummary}` },
        { word: "sofá", logit: 8.7, why: `móvel doméstico compatível com a ação "${verbWord || 'estar'}"` },
        { word: "jardim", logit: 8.3, why: `área externa da residência` },
        { word: "computador", logit: 7.9, why: `equipamento de uso diário em casa` },
        { word: "celular", logit: 7.5, why: `dispositivo pessoal cotidiano` },
        { word: "portão", logit: 7.1, why: `acesso principal da casa` }
      ],
      default: [
        { word: "caminho", logit: 9.0, why: `substantivo masculino compatível com "${lastWord}" e ${verbCite}` },
        { word: "mundo", logit: 8.6, why: `escopo geral associado a ${ctx.contextWordsSummary}` },
        { word: "sistema", logit: 8.2, why: `estrutura organizada compatível com a oração` },
        { word: "momento", logit: 7.8, why: `referência temporal/situacional para "${lastWord}"` },
        { word: "trabalho", logit: 7.4, why: `atividade humana de alta frequência contextual` },
        { word: "processo", logit: 7.0, why: `encadeamento de ações ligado a "${verbWord || lastWord}"` }
      ]
    };

    // B) Substantivos Femininos Singulares por Quadro Verbal e Domínio (ex: após "a, uma, da, na, pela, minha, nova...")
    const NOUN_F_SG_BY_CONTEXT = {
      frame_climb_surface: [
        { word: "árvore", logit: 9.5, why: `superfície vertical natural para "${verbWord} ${lastWord}" pelo ${subjCite}` },
        { word: "mesa", logit: 9.0, why: `superfície doméstica elevada compatível com "${verbWord}"` },
        { word: "cadeira", logit: 8.5, why: `assento doméstico associado ao movimento de "${subjectWord || verbWord}"` },
        { word: "cama", logit: 8.0, why: `móvel de repouso concordando no feminino com "${lastWord}"` },
        { word: "janela", logit: 7.6, why: `abertura elevada frequentemente alcançada por "${subjectWord || 'gato'}"` },
        { word: "estante", logit: 7.1, why: `mobília alta no ambiente interno` }
      ],
      frame_chase_target: [
        { word: "bola", logit: 9.5, why: `objeto em movimento perseguido pelo ${subjCite} ("${verbWord}")` },
        { word: "borboleta", logit: 8.8, why: `alvo em voo associado a "${subjectWord || 'animal'}" e "${verbWord}"` },
        { word: "pomba", logit: 8.3, why: `ave urbana que desperta o instinto de "${verbWord}"` },
        { word: "moto", logit: 7.8, why: `veículo veloz perseguido na rua` },
        { word: "bicicleta", logit: 7.4, why: `objeto em movimento no passeio` },
        { word: "sombra", logit: 6.9, why: `alvo visual lúdico` }
      ],
      frame_eat_food: [
        { word: "pizza", logit: 9.4, why: `refeição feminina singular selecionada pelo verbo "${verbWord}"` },
        { word: "comida", logit: 8.9, why: `substantivo nuclear do domínio alimentar após "${verbWord}"` },
        { word: "fruta", logit: 8.5, why: `alimento natural compatível com "${verbWord} ${lastWord}"` },
        { word: "salada", logit: 8.0, why: `prato leve associado à refeição` },
        { word: "carne", logit: 7.6, why: `alimento proteico concordando com "${lastWord}"` },
        { word: "sobremesa", logit: 7.2, why: `fechamento de refeição no quadro de "${verbWord}"` }
      ],
      frame_drink_liquid: [
        { word: "água", logit: 9.6, why: `líquido essencial feminino singular regido por "${verbWord}"` },
        { word: "vitamina", logit: 8.7, why: `bebida nutritiva compatível com "${verbWord} ${lastWord}"` },
        { word: "limonada", logit: 8.2, why: `bebida refrescante concordando no feminino` },
        { word: "cerveja", logit: 7.7, why: `bebida fermentada associada a lazer` },
        { word: "xícara", logit: 7.3, why: `recipiente associado ao ato de "${verbWord}"` },
        { word: "garrafa", logit: 6.9, why: `recipiente de líquido` }
      ],
      frame_teach_learn: [
        { word: "matéria", logit: 9.5, why: `conteúdo curricular explicado/estudado por "${subjectWord || verbWord}"` },
        { word: "aula", logit: 9.0, why: `sessão didática diretamente ligada a "${verbWord}"` },
        { word: "teoria", logit: 8.5, why: `fundamentação científica do domínio acadêmico` },
        { word: "lição", logit: 8.0, why: `unidade pedagógica transmitida na escola/universidade` },
        { word: "fórmula", logit: 7.6, why: `expressão matemática/analítica da disciplina` },
        { word: "pesquisa", logit: 7.2, why: `investigação científica de pós-graduação` }
      ],
      frame_travel_dest: [
        { word: "praia", logit: 9.5, why: `destino turístico feminino singular regido por "${verbWord} ${lastWord}"` },
        { word: "cidade", logit: 9.0, why: `localidade urbana associada ao deslocamento "${verbWord}"` },
        { word: "montanha", logit: 8.4, why: `destino natural de viagem e lazer` },
        { word: "Europa", logit: 8.0, why: `destino internacional frequente após "${verbWord}"` },
        { word: "capital", logit: 7.5, why: `centro metropolitano de destino` },
        { word: "fazenda", logit: 7.1, why: `destino rural de descanso` }
      ],
      nlp_ai: [
        { word: "palavra", logit: 9.5, why: `unidade lexical prevista pelo modelo em ${ctx.contextWordsSummary}` },
        { word: "rede", logit: 9.0, why: `arquitetura neural feminina concordando com "${lastWord}"` },
        { word: "atenção", logit: 8.6, why: `mecanismo central que pondera a importância dos tokens` },
        { word: "linguagem", logit: 8.2, why: `sistema simbólico modelado pelo Transformer` },
        { word: "camada", logit: 7.7, why: `bloco de processamento profundo da arquitetura` },
        { word: "probabilidade", logit: 7.3, why: `medida estatística gerada pelo Softmax` }
      ],
      tech_code: [
        { word: "aplicação", logit: 9.3, why: `sistema de software em foco no contexto técnico` },
        { word: "interface", logit: 8.8, why: `camada visual de interação com o usuário` },
        { word: "memória", logit: 8.4, why: `recurso de armazenamento de dados` },
        { word: "plataforma", logit: 7.9, why: `ambiente tecnológico integrado` },
        { word: "informação", logit: 7.5, why: `dado estruturado processado pelo código` },
        { word: "função", logit: 7.1, why: `rotina modular de programação` }
      ],
      science_edu: [
        { word: "universidade", logit: 9.3, why: `instituição acadêmica associada a ${ctx.contextWordsSummary}` },
        { word: "pesquisa", logit: 8.9, why: `investigação científica conduzida pelo ${subjCite}` },
        { word: "disciplina", logit: 8.4, why: `matéria acadêmica do curso/mestrado` },
        { word: "biblioteca", logit: 7.9, why: `espaço de estudo e consulta bibliográfica` },
        { word: "dissertação", logit: 7.5, why: `trabalho acadêmico de mestrado` },
        { word: "ciência", logit: 7.1, why: `campo do conhecimento sistemático` }
      ],
      work_economy: [
        { word: "empresa", logit: 9.4, why: `organização produtiva ligada a ${ctx.contextWordsSummary}` },
        { word: "economia", logit: 8.9, why: `sistema financeiro e produtivo em análise` },
        { word: "reunião", logit: 8.4, why: `encontro profissional de alinhamento` },
        { word: "equipe", logit: 8.0, why: `grupo de trabalho responsável pelo projeto` },
        { word: "produção", logit: 7.5, why: `geração de valor e resultados` },
        { word: "estratégia", logit: 7.1, why: `planejamento corporativo` }
      ],
      sports_games: [
        { word: "bola", logit: 9.5, why: `instrumento central da ação "${verbWord || 'jogar'}"` },
        { word: "partida", logit: 9.0, why: `disputa esportiva em andamento` },
        { word: "vitória", logit: 8.5, why: `resultado positivo conquistado pela equipe` },
        { word: "equipe", logit: 8.0, why: `coletivo de atletas em quadra/campo` },
        { word: "final", logit: 7.5, why: `etapa decisiva do campeonato` },
        { word: "quadra", logit: 7.1, why: `espaço físico da prática esportiva` }
      ],
      art_media: [
        { word: "música", logit: 9.4, why: `obra sonora associada a ${ctx.contextWordsSummary}` },
        { word: "história", logit: 8.9, why: `narrativa literária ou cinematográfica` },
        { word: "obra", logit: 8.4, why: `criação artística produzida pelo ${subjCite}` },
        { word: "festa", logit: 8.0, why: `evento cultural/social associado` },
        { word: "canção", logit: 7.5, why: `composição musical interpretada` },
        { word: "pintura", logit: 7.1, why: `expressão visual plástica` }
      ],
      transport: [
        { word: "estrada", logit: 9.4, why: `via de deslocamento associada a "${verbWord || 'viajar'}"` },
        { word: "avenida", logit: 8.9, why: `arterial urbana percorrida pelo veículo` },
        { word: "rodovia", logit: 8.4, why: `via expressa interurbana` },
        { word: "viagem", logit: 8.0, why: `jornada de transporte em curso` },
        { word: "garagem", logit: 7.4, why: `local de abrigo do veículo` },
        { word: "ponte", logit: 7.0, why: `estrutura viária de travessia` }
      ],
      nature_weather: [
        { word: "natureza", logit: 9.3, why: `conjunto ambiental ligado a ${ctx.contextWordsSummary}` },
        { word: "chuva", logit: 8.8, why: `fenômeno meteorológico natural` },
        { word: "floresta", logit: 8.4, why: `ecossistema rico em biodiversidade` },
        { word: "manhã", logit: 7.9, why: `período luminoso do dia` },
        { word: "noite", logit: 7.5, why: `período noturno do ciclo diário` },
        { word: "terra", logit: 7.1, why: `solo e superfície natural` }
      ],
      home_objects: [
        { word: "casa", logit: 9.4, why: `ambiente doméstico central na frase` },
        { word: "sala", logit: 8.9, why: `cômodo social da residência` },
        { word: "cozinha", logit: 8.4, why: `espaço de preparo de refeições` },
        { word: "porta", logit: 8.0, why: `elemento arquitetônico de passagem` },
        { word: "mesa", logit: 7.6, why: `mobília central do ambiente` },
        { word: "cama", logit: 7.2, why: `móvel de descanso no quarto` }
      ],
      default: [
        { word: "vida", logit: 9.0, why: `substantivo feminino compatível com "${lastWord}" e ${verbCite}` },
        { word: "cidade", logit: 8.6, why: `espaço coletivo alinhado ao contexto da frase` },
        { word: "casa", logit: 8.2, why: `referência espacial de alta coesão semântica` },
        { word: "resposta", logit: 7.8, why: `fechamento comunicativo para a oração` },
        { word: "história", logit: 7.4, why: `sequência de eventos associada ao ${subjCite}` },
        { word: "ideia", logit: 7.0, why: `conceito abstrato compatível com "${lastWord}"` }
      ]
    };

    // Seleciona banco por quadro verbal prioritário ou domínio
    const pickContextKey = (mapObj) => {
      if (activeVerbFrame && mapObj[`frame_${activeVerbFrame}`]) return `frame_${activeVerbFrame}`;
      if (mapObj[dominantDomain]) return dominantDomain;
      return "default";
    };

    // 1. SLOT: SUBSTANTIVO MASCULINO SINGULAR
    if (expectedSlot === "NOUN_M_SG") {
      const key = pickContextKey(NOUN_M_SG_BY_CONTEXT);
      return NOUN_M_SG_BY_CONTEXT[key].map(item => ({
        word: item.word,
        logit: item.logit,
        note: `Concordância masculina singular com "${lastWord}": ${item.why} (${domainLabel}).`
      }));
    }

    // 2. SLOT: SUBSTANTIVO FEMININO SINGULAR
    if (expectedSlot === "NOUN_F_SG") {
      const key = pickContextKey(NOUN_F_SG_BY_CONTEXT);
      return NOUN_F_SG_BY_CONTEXT[key].map(item => ({
        word: item.word,
        logit: item.logit,
        note: `Concordância feminina singular com "${lastWord}": ${item.why} (${domainLabel}).`
      }));
    }

    // 3. SLOT: SUBSTANTIVO MASCULINO PLURAL (após "os, dos, nos, muitos, vários...")
    if (expectedSlot === "NOUN_M_PL") {
      const mplByDom = {
        nlp_ai: [
          { word: "tokens", logit: 9.4, why: "unidades discretas processadas em paralelo" },
          { word: "vetores", logit: 8.9, why: "representações contínuas em ℝ⁷⁶⁸" },
          { word: "pesos", logit: 8.5, why: "parâmetros aprendidos nas matrizes de atenção" },
          { word: "modelos", logit: 8.0, why: "arquiteturas neurais autoregressivas" },
          { word: "dados", logit: 7.6, why: "exemplos do corpus de treinamento" },
          { word: "blocos", logit: 7.2, why: "camadas empilhadas do Transformer" }
        ],
        science_edu: [
          { word: "alunos", logit: 9.4, why: "discentes que participam da atividade acadêmica" },
          { word: "professores", logit: 8.9, why: "docentes orientadores da disciplina" },
          { word: "estudos", logit: 8.4, why: "investigações científicas do mestrado" },
          { word: "livros", logit: 8.0, why: "obras de referência bibliográfica" },
          { word: "conceitos", logit: 7.5, why: "fundamentos teóricos explicados" },
          { word: "exercícios", logit: 7.1, why: "atividades práticas de aprendizagem" }
        ],
        animals: [
          { word: "cachorros", logit: 9.3, why: "animais domésticos no plural concordando com o determinante" },
          { word: "gatos", logit: 8.8, why: "felinos associados ao contexto da frase" },
          { word: "pássaros", logit: 8.4, why: "aves presentes no ambiente natural" },
          { word: "animais", logit: 7.9, why: "seres vivos do domínio zoológico" },
          { word: "galhos", logit: 7.4, why: "estruturas das árvores no cenário" },
          { word: "cuidados", logit: 7.0, why: "atenções dedicadas aos pets" }
        ],
        food_drink: [
          { word: "alimentos", logit: 9.3, why: "itens nutritivos selecionados na refeição" },
          { word: "ingredientes", logit: 8.8, why: "componentes do preparo culinário" },
          { word: "pratos", logit: 8.4, why: "refeições servidas à mesa" },
          { word: "sucos", logit: 7.9, why: "bebidas naturais do cardápio" },
          { word: "doces", logit: 7.4, why: "sobremesas apreciadas" },
          { word: "sabores", logit: 7.0, why: "qualidades gustativas da comida" }
        ],
        default: [
          { word: "dias", logit: 9.2, why: "contagem temporal frequente após determinantes plurais" },
          { word: "dados", logit: 8.7, why: "informações analisadas no contexto" },
          { word: "resultados", logit: 8.3, why: "efeitos observados a partir da ação" },
          { word: "alunos", logit: 7.9, why: "participantes ativos no cenário" },
          { word: "problemas", logit: 7.5, why: "desafios resolvidos pela ação verbal" },
          { word: "amigos", logit: 7.1, why: "pessoas próximas no convívio social" }
        ]
      };
      const list = mplByDom[dominantDomain] || mplByDom.default;
      return list.map(item => ({
        word: item.word,
        logit: item.logit,
        note: `Concordância masculina plural com "${lastWord}": ${item.why} (${domainLabel}).`
      }));
    }

    // 4. SLOT: SUBSTANTIVO FEMININO PLURAL (após "as, das, nas, muitas, várias...")
    if (expectedSlot === "NOUN_F_PL") {
      const fplByDom = {
        nlp_ai: [
          { word: "palavras", logit: 9.5, why: "tokens lexicais cuja probabilidade é estimada" },
          { word: "redes", logit: 9.0, why: "arquiteturas neurais profundas" },
          { word: "camadas", logit: 8.5, why: "níveis hierárquicos de processamento" },
          { word: "cabeças", logit: 8.1, why: "subespaços paralelos de auto-atenção" },
          { word: "matrizes", logit: 7.6, why: "operadores lineares Q, K, V e W_U" },
          { word: "probabilidades", logit: 7.2, why: "distribuição normalizada pelo Softmax" }
        ],
        science_edu: [
          { word: "aulas", logit: 9.4, why: "encontros acadêmicos da disciplina" },
          { word: "pesquisas", logit: 8.9, why: "trabalhos científicos desenvolvidos" },
          { word: "teorias", logit: 8.4, why: "modelos explicativos estudados" },
          { word: "questões", logit: 8.0, why: "perguntas avaliadas no estudo" },
          { word: "provas", logit: 7.5, why: "avaliações de conhecimento" },
          { word: "notas", logit: 7.1, why: "resultados acadêmicos" }
        ],
        default: [
          { word: "pessoas", logit: 9.3, why: "sujeitos sociais concordando no feminino plural" },
          { word: "informações", logit: 8.8, why: "elementos de conhecimento do contexto" },
          { word: "horas", logit: 8.3, why: "duração temporal associada à ação" },
          { word: "coisas", logit: 7.9, why: "elementos concretos ou abstratos da situação" },
          { word: "ideias", logit: 7.5, why: "propostas construídas no discurso" },
          { word: "respostas", logit: 7.1, why: "soluções encontradas para o tema" }
        ]
      };
      const list = fplByDom[dominantDomain] || fplByDom.default;
      return list.map(item => ({
        word: item.word,
        logit: item.logit,
        note: `Concordância feminina plural com "${lastWord}": ${item.why} (${domainLabel}).`
      }));
    }

    // 5. SLOT: VERBO NA 1ª PESSOA DO SINGULAR (após "eu")
    if (expectedSlot === "VERB_1SG") {
      return [
        { word: "vou", logit: 9.4, note: `Auxiliar de futuro imediato em 1ª pessoa concordando com "eu" (${domainLabel}).` },
        { word: "gosto", logit: 8.9, note: `Verbo de afinidade pessoal em 1ª pessoa ("eu gosto de...").` },
        { word: "quero", logit: 8.5, note: `Verbo modal de intenção/desejo concordando com "eu".` },
        { word: "estou", logit: 8.1, note: `Verbo de estado/aspecto contínuo na 1ª pessoa do singular.` },
        { word: "preciso", logit: 7.7, note: `Verbo modal de necessidade ("eu preciso...").` },
        { word: "estudo", logit: 7.3, note: `Ação intelectual direta na 1ª pessoa do singular.` }
      ];
    }

    // 6. SLOT: VERBO NA 1ª PESSOA DO PLURAL (após "nós")
    if (expectedSlot === "VERB_1PL") {
      return [
        { word: "vamos", logit: 9.5, note: `Auxiliar de ação coletiva concordando com "nós" (${domainLabel}).` },
        { word: "estamos", logit: 8.9, note: `Estado ou ação contínua na 1ª pessoa do plural.` },
        { word: "podemos", logit: 8.5, note: `Modalizador de possibilidade coletiva ("nós podemos").` },
        { word: "usamos", logit: 8.0, note: `Ação metodológica frequente em ciência e PLN.` },
        { word: "estudamos", logit: 7.6, note: `Ação acadêmica na 1ª pessoa do plural.` },
        { word: "queremos", logit: 7.2, note: `Intenção compartilhada pelo grupo.` }
      ];
    }

    // 7. SLOT: APÓS SUJEITO SINGULAR ("O cachorro...", "A professora...", "O sol...", "O modelo...", "Ele...")
    if (expectedSlot === "AFTER_SUBJ_M_SG" || expectedSlot === "AFTER_SUBJ_F_SG" || expectedSlot === "VERB_3SG") {
      const isFem = expectedSlot === "AFTER_SUBJ_F_SG" || (ctx.subjectTag && ctx.subjectTag.gender === "F");
      const subj = subjectWord || lastWord;
      const verbsBySubjDomain = {
        animals: [
          { word: "correu", logit: 9.5, note: `Verbo de movimento na 3ª pessoa singular típico do sujeito "${subj}".` },
          { word: "subiu", logit: 9.0, note: `Ação espacial vertical frequentemente realizada por "${subj}".` },
          { word: "dormiu", logit: 8.5, note: `Estado de repouso compatível com o agente animado "${subj}".` },
          { word: "comeu", logit: 8.1, note: `Ação alimentar básica associada ao sujeito "${subj}".` },
          { word: "pulou", logit: 7.7, note: `Movimento ágil característico de "${subj}".` },
          { word: "está", logit: 7.3, note: `Verbo de ligação descrevendo o estado atual de "${subj}".` }
        ],
        science_edu: [
          { word: "explicou", logit: 9.5, note: `Ação pedagógica na 3ª pessoa singular realizada por "${subj}".` },
          { word: "estudou", logit: 9.0, note: `Ação de investigação acadêmica associada a "${subj}".` },
          { word: "apresentou", logit: 8.5, note: `Exposição didática de resultados ou conceitos por "${subj}".` },
          { word: "ensinou", logit: 8.1, note: `Transmissão de conhecimento associada a "${subj}".` },
          { word: "escreveu", logit: 7.6, note: `Produção textual/científica realizada por "${subj}".` },
          { word: "é", logit: 7.2, note: `Verbo de ligação definindo o atributo de "${subj}".` }
        ],
        nlp_ai: [
          { word: "prevê", logit: 9.5, note: `Ação autoregressiva canônica executada por "${subj}".` },
          { word: "processa", logit: 9.0, note: `Transformação vetorial de sequências realizada por "${subj}".` },
          { word: "aprende", logit: 8.5, note: `Otimização de representações latentes por "${subj}".` },
          { word: "calcula", logit: 8.0, note: `Operação algébrica sobre tensores em "${subj}".` },
          { word: "gera", logit: 7.6, note: `Síntese condicional de novos tokens por "${subj}".` },
          { word: "é", logit: 7.2, note: `Cópula definindo a natureza matemática de "${subj}".` }
        ],
        nature_weather: [
          { word: "está", logit: 9.4, note: `Verbo de estado introduzindo condição climática de "${subj}".` },
          { word: "brilhou", logit: 8.9, note: `Fenômeno luminoso diretamente associado a "${subj}".` },
          { word: "caiu", logit: 8.4, note: `Precipitação ou movimento natural ligado a "${subj}".` },
          { word: "esquentou", logit: 7.9, note: `Variação térmica provocada por "${subj}".` },
          { word: "mudou", logit: 7.5, note: `Transição nas condições naturais de "${subj}".` },
          { word: "apareceu", logit: 7.1, note: `Surgimento visível no horizonte.` }
        ],
        health_body: [
          { word: "receitou", logit: 9.4, note: `Ato clínico de prescrição realizado por "${subj}".` },
          { word: "examinou", logit: 8.9, note: `Avaliação médica conduzida por "${subj}".` },
          { word: "atendeu", logit: 8.4, note: `Cuidado assistencial prestado por "${subj}".` },
          { word: "melhorou", logit: 8.0, note: `Evolução clínica positiva associada a "${subj}".` },
          { word: "orientou", logit: 7.5, note: `Recomendação de saúde dada por "${subj}".` },
          { word: "está", logit: 7.1, note: `Estado clínico atual de "${subj}".` }
        ],
        sports_games: [
          { word: "venceu", logit: 9.5, note: `Conquista competitiva alcançada por "${subj}".` },
          { word: "chutou", logit: 9.0, note: `Ação técnica esportiva executada por "${subj}".` },
          { word: "marcou", logit: 8.5, note: `Pontuação/gol registrado por "${subj}".` },
          { word: "jogou", logit: 8.0, note: `Participação ativa na partida por "${subj}".` },
          { word: "ganhou", logit: 7.6, note: `Vitória obtida por "${subj}".` },
          { word: "treinou", logit: 7.1, note: `Preparação física e tática de "${subj}".` }
        ],
        transport: [
          { word: "passou", logit: 9.3, note: `Deslocamento viário realizado por "${subj}".` },
          { word: "chegou", logit: 8.8, note: `Conclusão do trajeto por "${subj}".` },
          { word: "acelerou", logit: 8.4, note: `Ganho de velocidade de "${subj}".` },
          { word: "parou", logit: 7.9, note: `Frenagem ou parada de "${subj}".` },
          { word: "viajou", logit: 7.5, note: `Percurso de longa distância feito por "${subj}".` },
          { word: isFem ? "nova" : "novo", logit: 7.1, note: `Adjetivo qualificador concordando com "${subj}".` }
        ],
        default: [
          { word: "é", logit: 9.3, note: `Verbo de ligação na 3ª pessoa singular definindo "${subj}".` },
          { word: "está", logit: 8.9, note: `Estado presente concordando com o sujeito "${subj}".` },
          { word: "foi", logit: 8.4, note: `Verbo no pretérito perfeito concordando com "${subj}".` },
          { word: "pode", logit: 8.0, note: `Modalizador de capacidade associado a "${subj}".` },
          { word: "tem", logit: 7.6, note: `Verbo de posse/propriedade atribuído a "${subj}".` },
          { word: "fez", logit: 7.2, note: `Ação realizada pelo sujeito "${subj}".` }
        ]
      };
      return verbsBySubjDomain[dominantDomain] || verbsBySubjDomain.default;
    }

    // 8. SLOT: APÓS SUJEITO PLURAL ("Os alunos...", "As empresas...", "Eles...")
    if (expectedSlot === "AFTER_SUBJ_M_PL" || expectedSlot === "AFTER_SUBJ_F_PL" || expectedSlot === "VERB_3PL") {
      const subj = subjectWord || lastWord;
      if (dominantDomain === "science_edu" || dominantDomain === "nlp_ai") {
        return [
          { word: "estudam", logit: 9.5, note: `Verbo na 3ª pessoa do plural concordando com "${subj}" (${domainLabel}).` },
          { word: "estão", logit: 9.0, note: `Verbo auxiliar de estado contínuo para "${subj}".` },
          { word: "aprendem", logit: 8.5, note: `Ação cognitiva plural associada a "${subj}".` },
          { word: "desenvolvem", logit: 8.0, note: `Criação de pesquisas e modelos por "${subj}".` },
          { word: "utilizam", logit: 7.6, note: `Emprego de ferramentas técnicas por "${subj}".` },
          { word: "são", logit: 7.2, note: `Cópula plural caracterizando "${subj}".` }
        ];
      }
      return [
        { word: "são", logit: 9.4, note: `Verbo de ligação na 3ª pessoa do plural concordando com "${subj}".` },
        { word: "estão", logit: 8.9, note: `Estado ou ação em curso concordando com "${subj}".` },
        { word: "podem", logit: 8.4, note: `Modalizador plural associado a "${subj}".` },
        { word: "foram", logit: 8.0, note: `Ação ou deslocamento pretérito de "${subj}".` },
        { word: "fazem", logit: 7.6, note: `Ação direta executada por "${subj}".` },
        { word: "têm", logit: 7.2, note: `Posse ou atributo plural de "${subj}".` }
      ];
    }

    // 9. SLOT: VERBO NO INFINITIVO APÓS AUXILIAR/MODAL ("vou...", "quero...", "pode...", "irá...")
    if (expectedSlot === "VERB_INF" || expectedSlot === "PREP_PARA") {
      const infByDom = {
        nlp_ai: [
          { word: "prever", logit: 9.5, why: "tarefa autoregressiva central dos modelos de linguagem" },
          { word: "processar", logit: 9.0, why: "transformação paralela de tokens e tensores" },
          { word: "aprender", logit: 8.5, why: "extração de padrões estatísticos do corpus" },
          { word: "transformar", logit: 8.1, why: "impacto estrutural da inteligência artificial" },
          { word: "gerar", logit: 7.7, why: "síntese condicional de texto coerente" },
          { word: "calcular", logit: 7.2, why: "cômputo de matrizes de atenção e Softmax" }
        ],
        science_edu: [
          { word: "estudar", logit: 9.5, why: "atividade acadêmica central associada ao contexto" },
          { word: "aprender", logit: 9.0, why: "assimilação de novos conceitos na disciplina" },
          { word: "apresentar", logit: 8.5, why: "exposição de seminário ou pesquisa" },
          { word: "escrever", logit: 8.0, why: "redação de artigo ou dissertação" },
          { word: "pesquisar", logit: 7.6, why: "investigação científica aprofundada" },
          { word: "entender", logit: 7.2, why: "compreensão teórica e matemática" }
        ],
        food_drink: [
          { word: "comer", logit: 9.5, why: "ação alimentar selecionada pelo contexto gastronômico" },
          { word: "tomar", logit: 9.0, why: "ingestão de bebida ou refeição leve" },
          { word: "almoçar", logit: 8.5, why: "refeição principal do dia" },
          { word: "preparar", logit: 8.0, why: "elaboração culinária na cozinha" },
          { word: "beber", logit: 7.6, why: "hidratação ou consumo de líquidos" },
          { word: "experimentar", logit: 7.2, why: "degustação de novo prato" }
        ],
        places_travel: [
          { word: "viajar", logit: 9.5, why: "deslocamento para novo destino" },
          { word: "visitar", logit: 9.0, why: "conhecer lugar ou cidade" },
          { word: "passear", logit: 8.5, why: "atividade de lazer ao ar livre" },
          { word: "conhecer", logit: 8.0, why: "exploração de novos lugares" },
          { word: "voltar", logit: 7.6, why: "retorno ao ponto de origem" },
          { word: "descansar", logit: 7.2, why: "pausa recreativa nas férias" }
        ],
        default: [
          { word: "fazer", logit: 9.3, why: "verbo de ação geral regido pelo auxiliar" },
          { word: "estudar", logit: 8.8, why: "ação cognitiva e de aprendizado" },
          { word: "trabalhar", logit: 8.4, why: "atividade produtiva cotidiana" },
          { word: "viajar", logit: 8.0, why: "deslocamento espacial planejado" },
          { word: "aprender", logit: 7.6, why: "desenvolvimento de novas habilidades" },
          { word: "comprar", logit: 7.2, why: "aquisição de item ou serviço" }
        ]
      };
      const list = infByDom[dominantDomain] || infByDom.default;
      return list.map(item => ({
        word: item.word,
        logit: item.logit,
        note: `Infinitivo regido por "${lastWord}" (${subjCite}): ${item.why}.`
      }));
    }

    // 10. SLOT: OBJETO / COMPLEMENTO DIRETO APÓS VERBO ("comer...", "tomar...", "correu...", "estudando...", "viajar...")
    if (expectedSlot === "VERB_OBJECT") {
      if (activeVerbFrame === "eat_food") {
        return [
          { word: "pizza", logit: 9.4, note: `Objeto direto alimentar selecionado pelo verbo "${lastWord}".` },
          { word: "um", logit: 9.0, note: `Artigo indefinido introduzindo o alimento ("${lastWord} um lanche/bolo").` },
          { word: "uma", logit: 8.7, note: `Artigo indefinido feminino ("${lastWord} uma fruta/salada").` },
          { word: "pão", logit: 8.3, note: `Alimento cotidiano diretamente regido por "${lastWord}".` },
          { word: "frutas", logit: 7.9, note: `Complemento alimentar saudável para "${lastWord}".` },
          { word: "bolo", logit: 7.5, note: `Alimento preparado compatível com "${lastWord}".` }
        ];
      }
      if (activeVerbFrame === "drink_liquid") {
        return [
          { word: "café", logit: 9.5, note: `Complemento direto de alta probabilidade após o verbo "${lastWord}".` },
          { word: "água", logit: 9.1, note: `Bebida essencial diretamente selecionada por "${lastWord}".` },
          { word: "um", logit: 8.7, note: `Artigo iniciando sintagma nominal ("${lastWord} um café/suco").` },
          { word: "suco", logit: 8.3, note: `Bebida natural compatível com "${lastWord}".` },
          { word: "chá", logit: 7.8, note: `Infusão quente/gelada associada a "${lastWord}".` },
          { word: "leite", logit: 7.4, note: `Bebida nutritiva regida por "${lastWord}".` }
        ];
      }
      if (activeVerbFrame === "climb_surface") {
        return [
          { word: "no", logit: 9.6, note: `Contração prepositiva exigida pelo verbo de movimento "${lastWord}" (ex: "${lastWord} no telhado/sofá").` },
          { word: "na", logit: 9.2, note: `Contração feminina indicando superfície ("${lastWord} na árvore/mesa").` },
          { word: "pelo", logit: 8.3, note: `Preposição indicando o percurso de "${lastWord}".` },
          { word: "para", logit: 7.8, note: `Preposição indicando direção espacial.` },
          { word: "rápido", logit: 7.3, note: `Advérbio de modo qualificando a ação "${lastWord}".` },
          { word: "alto", logit: 6.9, note: `Modificador espacial vertical.` }
        ];
      }
      if (activeVerbFrame === "chase_target") {
        return [
          { word: "atrás", logit: 9.6, note: `Locução direcional clássica após "${lastWord}" ("${lastWord} atrás do...").` },
          { word: "pelo", logit: 8.9, note: `Percurso espacial do movimento ("${lastWord} pelo parque/quintal").` },
          { word: "para", logit: 8.4, note: `Direção de destino da ação "${lastWord}".` },
          { word: "muito", logit: 7.9, note: `Intensificador de velocidade/esforço de "${lastWord}".` },
          { word: "rápido", logit: 7.5, note: `Modificador adverbial de velocidade.` },
          { word: "na", logit: 7.1, note: `Localização espacial da corrida.` }
        ];
      }
      if (activeVerbFrame === "travel_dest") {
        return [
          { word: "para", logit: 9.6, note: `Preposição de destino regida pelo verbo de movimento "${lastWord}".` },
          { word: "pelo", logit: 8.7, note: `Preposição de percurso ("${lastWord} pelo mundo/país").` },
          { word: "com", logit: 8.2, note: `Preposição de companhia ("${lastWord} com a família/amigos").` },
          { word: "de", logit: 7.8, note: `Preposição indicando meio de transporte ("${lastWord} de avião/carro").` },
          { word: "nas", logit: 7.4, note: `Circunstância temporal ("${lastWord} nas férias").` },
          { word: "amanhã", logit: 7.0, note: `Marcador temporal futuro.` }
        ];
      }
      if (activeVerbFrame === "teach_learn") {
        return [
          { word: "a", logit: 9.4, note: `Artigo feminino introduzindo o objeto de "${lastWord}" ("a matéria / a teoria").` },
          { word: "o", logit: 9.1, note: `Artigo masculino introduzindo o conteúdo ("o conteúdo / o modelo").` },
          { word: "redes", logit: 8.6, note: `Objeto técnico direto de estudo em PLN e IA.` },
          { word: "inteligência", logit: 8.2, note: `Tema acadêmico central associado a "${lastWord}".` },
          { word: "como", logit: 7.8, note: `Conjunção explicativa ("${lastWord} como funciona").` },
          { word: "para", logit: 7.4, note: `Preposição indicando finalidade ou destinatário.` }
        ];
      }
      if (activeVerbFrame === "heal_treat") {
        return [
          { word: "um", logit: 9.5, note: `Artigo indefinido iniciando a prescrição ("${lastWord} um remédio/exame").` },
          { word: "o", logit: 9.0, note: `Artigo definido referenciando o paciente ou tratamento.` },
          { word: "remédio", logit: 8.6, note: `Objeto direto clínico do verbo "${lastWord}".` },
          { word: "repouso", logit: 8.1, note: `Recomendação terapêutica direta.` },
          { word: "exames", logit: 7.7, note: `Solicitação diagnóstica médica.` },
          { word: "a", logit: 7.3, note: `Artigo feminino introduzindo a medicação.` }
        ];
      }
      if (activeVerbFrame === "play_music_sport") {
        return [
          { word: "a", logit: 9.4, note: `Artigo feminino introduzindo o objeto ("a bola / a música").` },
          { word: "o", logit: 9.0, note: `Artigo masculino introduzindo o complemento ("o jogo / o violão").` },
          { word: "futebol", logit: 8.5, note: `Modalidade esportiva diretamente regida por "${lastWord}".` },
          { word: "violão", logit: 8.1, note: `Instrumento musical associado a "${lastWord}".` },
          { word: "muito", logit: 7.6, note: `Intensificador de desempenho.` },
          { word: "na", logit: 7.2, note: `Contração indicando o local da apresentação/jogo.` }
        ];
      }
      // Objeto geral de verbo transitivo
      return [
        { word: "o", logit: 9.3, note: `Artigo masculino introduzindo o objeto direto de "${lastWord}".` },
        { word: "a", logit: 9.0, note: `Artigo feminino introduzindo o complemento de "${lastWord}".` },
        { word: "um", logit: 8.5, note: `Artigo indefinido masculino regido por "${lastWord}".` },
        { word: "uma", logit: 8.2, note: `Artigo indefinido feminino regido por "${lastWord}".` },
        { word: "com", logit: 7.7, note: `Preposição de instrumento ou companhia para "${lastWord}".` },
        { word: "para", logit: 7.3, note: `Preposição de finalidade associada a "${lastWord}".` }
      ];
    }

    // 11. SLOT: LOCUÇÃO ESPACIAL ("atrás...", "perto...", "dentro...", "fora...")
    if (expectedSlot === "LOCUTION_DE") {
      return [
        { word: "do", logit: 9.6, note: `Contração masculina singular completando a locução "${lastWord} do..." (${domainLabel}).` },
        { word: "da", logit: 9.3, note: `Contração feminina singular completando a locução "${lastWord} da...".` },
        { word: "de", logit: 8.6, note: `Preposição pura exigida pela regência de "${lastWord}".` },
        { word: "dos", logit: 8.0, note: `Contração masculina plural ("${lastWord} dos...").` },
        { word: "das", logit: 7.6, note: `Contração feminina plural ("${lastWord} das...").` },
        { word: "dele", logit: 7.1, note: `Contração pronominal referenciando entidade anterior.` }
      ];
    }

    // 12. SLOT: REGÊNCIA DE "gosto de / precisa de / hora de..."
    if (expectedSlot === "PREP_DE_ACTION_OR_NOUN") {
      return [
        { word: "estudar", logit: 9.3, note: `Infinitivo completando "${prevWord} de" com foco em conhecimento.` },
        { word: "comer", logit: 8.9, note: `Ação cotidiana frequente após "${prevWord} de".` },
        { word: "viajar", logit: 8.6, note: `Atividade de lazer e descoberta regida por "${prevWord} de".` },
        { word: "tomar", logit: 8.2, note: `Verbo de hábito cotidiano ("${prevWord} de tomar café").` },
        { word: "música", logit: 7.8, note: `Substantivo cultural regido pela preposição "de".` },
        { word: "aprender", logit: 7.5, note: `Ação de desenvolvimento intelectual.` }
      ];
    }

    // 13. SLOT: PREDICATIVO / ADJETIVO APÓS VERBO DE LIGAÇÃO ("é, está, ficou, são...")
    if (expectedSlot === "PRED_M_SG" || expectedSlot === "PRED_F_SG" || expectedSlot === "PRED_M_PL" || expectedSlot === "PRED_F_PL") {
      const isFem = expectedSlot === "PRED_F_SG" || expectedSlot === "PRED_F_PL";
      const isPl = expectedSlot === "PRED_M_PL" || expectedSlot === "PRED_F_PL";
      const subj = subjectWord || "sujeito";

      if (dominantDomain === "nature_weather") {
        return [
          { word: isPl ? (isFem ? "lindas" : "lindos") : (isFem ? "linda" : "lindo"), logit: 9.4, note: `Adjetivo predicativo concordando com "${subj}" no domínio climático/natural.` },
          { word: isPl ? "quentes" : "quente", logit: 9.0, note: `Condição térmica associada a "${subj}".` },
          { word: isPl ? (isFem ? "frias" : "frios") : (isFem ? "fria" : "frio"), logit: 8.5, note: `Característica meteorológica atribuída a "${subj}".` },
          { word: isPl ? "brilhantes" : "brilhante", logit: 8.1, note: `Qualificador luminoso de "${subj}".` },
          { word: isPl ? (isFem ? "ensolaradas" : "ensolarados") : (isFem ? "ensolarada" : "ensolarado"), logit: 7.7, note: `Estado atmosférico de céu aberto.` },
          { word: "muito", logit: 7.3, note: `Advérbio intensificador antes do adjetivo.` }
        ];
      }
      if (dominantDomain === "food_drink") {
        return [
          { word: isPl ? "quentes" : "quente", logit: 9.4, note: `Estado térmico ideal do alimento/bebida "${subj}".` },
          { word: isPl ? (isFem ? "deliciosas" : "deliciosos") : (isFem ? "deliciosa" : "delicioso"), logit: 9.0, note: `Avaliação sensorial positiva concordando com "${subj}".` },
          { word: isPl ? (isFem ? "prontas" : "prontos") : (isFem ? "pronta" : "pronto"), logit: 8.5, note: `Estado de preparo concluído para "${subj}".` },
          { word: isPl ? "doces" : "doce", logit: 8.0, note: `Perfil gustativo atribuído a "${subj}".` },
          { word: isPl ? (isFem ? "frescas" : "frescos") : (isFem ? "fresca" : "fresco"), logit: 7.6, note: `Qualidade de conservação de "${subj}".` },
          { word: isPl ? "fortes" : "forte", logit: 7.2, note: `Intensidade de sabor (ex: café forte).` }
        ];
      }
      return [
        { word: isPl ? "importantes" : "importante", logit: 9.4, note: `Predicativo de relevância concordando com "${subj}" (${domainLabel}).` },
        { word: isPl ? "muito" : (isFem ? "uma" : "um"), logit: 9.0, note: `Introdução de definição nominal ou intensificador após "${lastWord}".` },
        { word: isPl ? "essenciais" : "essencial", logit: 8.5, note: `Adjetivo predicativo qualificando "${subj}".` },
        { word: isPl ? "capazes" : "capaz", logit: 8.1, note: `Atributo de capacidade funcional de "${subj}".` },
        { word: isPl ? (isFem ? "boas" : "bons") : (isFem ? "boa" : "bom"), logit: 7.7, note: `Qualificador positivo concordando em gênero e número com "${subj}".` },
        { word: isPl ? "estudando" : "funcionando", logit: 7.3, note: `Gerúndio descrevendo processo em andamento.` }
      ];
    }

    // 14. SLOT: COMPLEMENTO DE PREPOSIÇÃO ("de, em, com, sobre, para...")
    if (expectedSlot === "PREP_COMPLEMENT") {
      if (dominantDomain === "places_travel") {
        return [
          { word: "a", logit: 9.4, note: `Artigo feminino introduzindo o destino ("${lastWord} a praia/cidade").` },
          { word: "o", logit: 9.1, note: `Artigo masculino introduzindo o local ("${lastWord} o exterior/centro").` },
          { word: "casa", logit: 8.6, note: `Destino doméstico direto após "${lastWord}".` },
          { word: "Lisboa", logit: 8.1, note: `Destino geográfico próprio compatível com "${verbWord || lastWord}".` },
          { word: "avião", logit: 7.7, note: `Meio de transporte associado à viagem.` },
          { word: "férias", logit: 7.3, note: `Contexto temporal/recreativo da viagem.` }
        ];
      }
      if (dominantDomain === "nlp_ai" || dominantDomain === "tech_code") {
        return [
          { word: "dados", logit: 9.4, note: `Complemento técnico central regido pela preposição "${lastWord}".` },
          { word: "linguagem", logit: 9.0, note: `Domínio de Processamento de Linguagem Natural.` },
          { word: "atenção", logit: 8.6, note: `Mecanismo de ponderação contextual do Transformer.` },
          { word: "redes", logit: 8.1, note: `Arquiteturas conexionistas de aprendizado profundo.` },
          { word: "texto", logit: 7.7, note: `Sequência de entrada processada pelo modelo.` },
          { word: "paralelo", logit: 7.3, note: `Modo de execução matricial em GPUs.` }
        ];
      }
      return [
        { word: "o", logit: 9.2, note: `Artigo masculino introduzindo o complemento de "${lastWord}".` },
        { word: "a", logit: 9.0, note: `Artigo feminino introduzindo o complemento de "${lastWord}".` },
        { word: "casa", logit: 8.5, note: `Substantivo de lugar/contexto regido por "${lastWord}".` },
        { word: "trabalho", logit: 8.1, note: `Ambiente ou atividade associada a "${lastWord}".` },
        { word: "forma", logit: 7.7, note: `Locução modal iniciada por "${lastWord}".` },
        { word: "todos", logit: 7.3, note: `Totalizador pronominal regido por "${lastWord}".` }
      ];
    }

    // 15. SLOTS EM INGLÊS (EN_VERB_INF, EN_NOUN, EN_PREDICATE)
    if (expectedSlot === "EN_VERB_INF") {
      return [
        { word: "understand", logit: 9.4, note: `Infinitive verb following "to" in context ${ctx.contextWordsSummary}.` },
        { word: "visualize", logit: 9.0, note: `Direct analytical action governed by "to".` },
        { word: "predict", logit: 8.6, note: `Autoregressive modeling action following "to".` },
        { word: "explore", logit: 8.2, note: `Exploratory action aligned with subject "${subjectWord || 'users'}".` },
        { word: "create", logit: 7.8, note: `Generative action in data/AI context.` },
        { word: "learn", logit: 7.4, note: `Cognitive/training verb following "to".` }
      ];
    }
    if (expectedSlot === "EN_NOUN" || expectedSlot === "EN_PREDICATE") {
      return [
        { word: "model", logit: 9.4, note: `Core noun following "${lastWord}" in AI/Data context.` },
        { word: "transformer", logit: 8.9, note: `Self-attention architecture aligned with prompt.` },
        { word: "data", logit: 8.5, note: `Empirical information processed in the sentence.` },
        { word: "network", logit: 8.1, note: `Neural architecture component.` },
        { word: "next", logit: 7.7, note: `Sequential modifier ("the next token/word").` },
        { word: "system", logit: 7.3, note: `Computational entity completing the phrase.` }
      ];
    }

    // 16. CONTINUAÇÃO APÓS OBJETO OU ADJETIVO (ex: "Comprei um carro...", "A professora explicou a matéria...")
    const isFemObj = expectedSlot === "AFTER_OBJ_F_SG" || expectedSlot === "AFTER_OBJ_F_PL";
    const isPlObj = expectedSlot === "AFTER_OBJ_M_PL" || expectedSlot === "AFTER_OBJ_F_PL";
    const adjSample = dominantDomain === "transport"
      ? (isFemObj ? "nova" : "novo")
      : (dominantDomain === "nlp_ai" ? (isFemObj ? "profunda" : "neural") : (isFemObj ? "importante" : "importante"));

    return [
      { word: adjSample, logit: 9.3, note: `Qualificador direto concordando com "${lastWord}" no domínio de ${domainLabel}.` },
      { word: "para", logit: 8.9, note: `Preposição introduzindo a finalidade ou destinatário de "${verbWord || lastWord}".` },
      { word: "no", logit: 8.5, note: `Contração situando o lugar/contexto da ação "${verbWord || lastWord}".` },
      { word: "na", logit: 8.2, note: `Contração feminina situando o ambiente de "${lastWord}".` },
      { word: "com", logit: 7.8, note: `Preposição adicionando instrumento ou companhia à frase.` },
      { word: isPlObj ? "que" : "de", logit: 7.4, note: `Conectivo expandindo a especificação de "${lastWord}".` }
    ];
  }

  // ==================== REVELAÇÃO ANIMADA DE PALAVRAS (ETAPA 7) ====================
  function updateLiveTraceHUD(passedCtx) {
    const ctx = passedCtx || analyzePromptContext(state.prompt);
    const traceLastToken = document.getElementById('traceLastToken');
    const traceContextWords = document.getElementById('traceContextWords');

    if (traceLastToken) {
      traceLastToken.textContent = `"${ctx.lastWord}" (${ctx.lastPosLabel} → pede ${ctx.slotLabel})`;
    }

    if (traceContextWords) {
      if (ctx.tokensAll.length <= 1) {
        traceContextWords.textContent = `Início de frase [${ctx.domainLabel}]`;
      } else {
        traceContextWords.textContent = `${ctx.contextWordsSummary} [${ctx.domainLabel}]`;
      }
    }
  }

  function startCandidatesRevelation() {
    if (state.revelationTimer) {
      clearInterval(state.revelationTimer);
      state.revelationTimer = null;
    }

    state.isRevealingPredictions = true;
    state.revealedCandidatesCount = 0;

    const predictions = getCandidatePredictions(state.prompt, state.temperature);
    state.currentPredictions = predictions;

    const hudConfidencePill = document.getElementById('hudConfidencePill');
    if (hudConfidencePill) {
      hudConfidencePill.textContent = "⚡ Medindo afinidades no vocabulário W_U...";
      hudConfidencePill.style.background = "rgba(124, 58, 237, 0.15)";
      hudConfidencePill.style.color = "var(--accent-purple)";
      hudConfidencePill.style.borderColor = "rgba(124, 58, 237, 0.4)";
    }

    const traceEmergingWords = document.getElementById('traceEmergingWords');
    if (traceEmergingWords) {
      traceEmergingWords.textContent = "Projetando logits no vocabulário...";
      traceEmergingWords.style.color = "var(--accent-purple)";
    }

    renderFlowchart();
    renderIsolatedProbabilities();
    highlightActiveStage('stage-probabilities');

    const totalToReveal = Math.min(6, predictions.length);
    let count = 0;
    const intervalMs = Math.max(600, Math.round(state.stepSpeed / 5)); // Mais lento na velocidade didática

    state.revelationTimer = setInterval(() => {
      count++;
      state.revealedCandidatesCount = count;

      const currentCand = predictions[count - 1];
      if (currentCand) {
        inspectorTitle.textContent = `🔍 Medindo #${count}: "${currentCand.word}" (${currentCand.probPercent})`;
        inspectorDescription.innerHTML = `O vetor final do último token projeta compatibilidade no vocabulário com peso de <strong>${currentCand.probPercent}</strong>. <em>${currentCand.note}</em>`;

        if (traceEmergingWords) {
          traceEmergingWords.textContent = `Descobrindo #${count}: "${currentCand.word}" (${currentCand.probPercent})`;
          traceEmergingWords.style.color = "var(--accent-purple)";
        }
      }

      renderFlowchart();
      renderIsolatedProbabilities();
      highlightActiveStage('stage-probabilities');

      if (count >= totalToReveal) {
        clearInterval(state.revelationTimer);
        state.revelationTimer = null;
        state.isRevealingPredictions = false;

        const top = predictions[0];
        if (top) {
          inspectorTitle.textContent = `⭐ Palavra Prevista pelo Transformer: "${top.word}" (${top.probPercent})`;
          inspectorDescription.innerHTML = `Com temperatura $T = ${state.temperature.toFixed(2)}$, o maior alinhamento no vocabulário é a palavra <strong>"${top.word}"</strong>. <em>${top.note}</em>`;

          if (hudConfidencePill) {
            hudConfidencePill.textContent = `⭐ Prevista: "${top.word}" (${top.probPercent})`;
            hudConfidencePill.style.background = "rgba(16, 185, 129, 0.15)";
            hudConfidencePill.style.color = "var(--accent-green)";
            hudConfidencePill.style.borderColor = "rgba(16, 185, 129, 0.4)";
          }
          if (traceEmergingWords) {
            traceEmergingWords.textContent = `⭐ "${top.word}" (${top.probPercent})`;
            traceEmergingWords.style.color = "var(--accent-green)";
          }
        }
        renderFlowchart();
        renderIsolatedProbabilities();
      }
    }, intervalMs);
  }

  // ==================== SINCRONIZADOR GLOBAL DE TODAS AS VIEWS ====================
  function renderAllViews() {
    updateLiveTraceHUD();
    renderFlowchart();
    renderIsolatedStages();
  }

  // ==================== RENDERIZADOR DO FLUXOGRAMA SANKEY ====================
  function renderFlowchart() {
    const text = state.prompt;
    const tokens = extractTokens(text);
    state.tokens = tokens;
    const N = tokens.length;

    const predictions = getCandidatePredictions(text, state.temperature);
    state.currentPredictions = predictions;

    const ySpacing = Math.min(38, 220 / Math.max(1, N - 1));
    const yStart = 240 - ((N - 1) * ySpacing) / 2;
    const tokenY = tokens.map((_, i) => yStart + i * ySpacing);

    const xEmbedding = 110;
    const xQKV = 180;
    const xAttentionBox = 340;
    const xAttentionOut = 530;
    const xMLP = 660;
    const xResidualMerge = 780;
    const x11Blocks = 860;
    const xProbabilities = 960;

    let svg = `
      <defs>
        <filter id="cardShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.06)" />
        </filter>
        <linearGradient id="blockStackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#818cf8" stop-opacity="0.25" />
          <stop offset="50%" stop-color="#6366f1" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#818cf8" stop-opacity="0.25" />
        </linearGradient>
      </defs>
    `;

    // 1. TÍTULOS COM LUPAS CLICÁVEIS ESTÁVEIS
    svg += `
      <!-- Embedding -->
      <g>
        <text x="${xEmbedding - 45}" y="48" class="svg-header-title clickable-title svg-zoom-trigger" data-modal="embedding">Embedding</text>
        <g class="svg-zoom-btn svg-zoom-trigger" data-modal="embedding" title="Detalhamento Matemático do Embedding">
          <rect x="${xEmbedding + 32}" y="32" width="24" height="24" rx="5" class="zoom-btn-bg" />
          <text x="${xEmbedding + 44}" y="48" text-anchor="middle" class="zoom-btn-icon">🔍</text>
        </g>
      </g>
      
      <!-- Attention -->
      <g>
        <text x="${xAttentionBox + 20}" y="28" class="svg-header-title" text-anchor="middle">Transformer Block ${state.selectedBlock}</text>
        <text x="${xAttentionBox + 20}" y="48" class="svg-header-text clickable-title svg-zoom-trigger" data-modal="attention" text-anchor="middle">Multi-head Self Attention</text>
        <g class="svg-zoom-btn svg-zoom-trigger" data-modal="attention" title="Detalhamento Matemático da Auto-Atenção">
          <rect x="${xAttentionBox + 102}" y="32" width="24" height="24" rx="5" class="zoom-btn-bg" />
          <text x="${xAttentionBox + 114}" y="48" text-anchor="middle" class="zoom-btn-icon">🔍</text>
        </g>
      </g>

      <!-- MoE (Mixture of Experts) -->
      <g>
        <text x="${xMLP + 42}" y="48" class="svg-header-title clickable-title svg-zoom-trigger" data-modal="mlp" text-anchor="middle">MoE (Top-K)</text>
        <g class="svg-zoom-btn svg-zoom-trigger" data-modal="mlp" title="Detalhamento Matemático do Mixture of Experts (MoE)">
          <rect x="${xMLP + 90}" y="32" width="24" height="24" rx="5" class="zoom-btn-bg" />
          <text x="${xMLP + 102}" y="48" text-anchor="middle" class="zoom-btn-icon">🔍</text>
        </g>
      </g>

      <!-- 11 Blocks -->
      <g class="svg-zoom-trigger" data-modal="blocks" cursor="pointer" title="Detalhamento da Pilha de 12 Blocos">
        <text x="${x11Blocks - 5}" y="24" class="svg-header-text" text-anchor="middle" font-size="11">11 more identical</text>
        <text x="${x11Blocks - 5}" y="38" class="svg-header-text" text-anchor="middle" font-size="11">Transformer Blocks</text>
        <text x="${x11Blocks - 5}" y="52" fill="#818cf8" text-anchor="middle" font-size="12">↓ 🔍</text>
      </g>

      <!-- Probabilities -->
      <g>
        <text x="${xProbabilities + 50}" y="48" class="svg-header-title clickable-title svg-zoom-trigger" data-modal="probabilities">Probabilities</text>
        <g class="svg-zoom-btn svg-zoom-trigger" data-modal="probabilities" title="Detalhamento Matemático das Probabilidades">
          <rect x="${xProbabilities + 142}" y="32" width="24" height="24" rx="5" class="zoom-btn-bg" />
          <text x="${xProbabilities + 154}" y="48" text-anchor="middle" class="zoom-btn-icon">🔍</text>
        </g>
      </g>
    `;

    // 2. CONEXÃO RESIDUAL SUPERIOR
    const resY = 70;
    svg += `
      <text x="${(xEmbedding + xAttentionOut) / 2}" y="${resY - 4}" class="svg-header-text" text-anchor="middle" font-size="11" font-style="italic">Residual</text>
      <path d="M ${xEmbedding + 20} ${tokenY[0] - 12} 
               C ${xEmbedding + 60} ${resY}, ${xAttentionOut - 60} ${resY}, ${xAttentionOut + 50} ${tokenY[0] - 12}" 
            class="svg-residual-path" />
    `;

    // 3. TOKENS DE ENTRADA & FITAS Q, K, V
    tokens.forEach((tok, i) => {
      const y = tokenY[i];
      svg += `
        <text x="${xEmbedding - 10}" y="${y + 4}" class="svg-token-label" text-anchor="end" data-token="${escapeXml(tok)}">${escapeXml(tok)}</text>
        <circle cx="${xEmbedding}" cy="${y}" r="3" fill="#818cf8" />
        
        <path d="M ${xEmbedding + 4} ${y} 
                 C ${xEmbedding + 35} ${y}, ${xQKV - 35} ${y}, ${xQKV - 14} ${y}" 
              class="svg-stream-path stream-token-${i}" />

        <g transform="translate(${xQKV - 12}, ${y - 18})">
          <rect x="0" y="0" width="16" height="11" rx="2" fill="rgba(59, 130, 246, 0.18)" stroke="#3b82f6" stroke-width="0.9" />
          <text x="8" y="8" font-size="8" font-family="monospace" font-weight="700" fill="#3b82f6" text-anchor="middle">Q</text>
          
          <rect x="0" y="13" width="16" height="11" rx="2" fill="rgba(239, 68, 68, 0.18)" stroke="#ef4444" stroke-width="0.9" />
          <text x="8" y="21" font-size="8" font-family="monospace" font-weight="700" fill="#ef4444" text-anchor="middle">K</text>
          
          <rect x="0" y="26" width="16" height="11" rx="2" fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" stroke-width="0.9" />
          <text x="8" y="34" font-size="8" font-family="monospace" font-weight="700" fill="#10b981" text-anchor="middle">V</text>
        </g>
      `;

      const matrixY = 160 + i * (130 / Math.max(1, N - 1));
      const matrixX = (xAttentionBox + 30) + i * (130 / Math.max(1, N - 1));
      const valY = 360 + i * 10;

      svg += `
        <path d="M ${xQKV + 4} ${y - 12} 
                 C ${xQKV + 40} ${y - 12}, ${xAttentionBox - 40} ${matrixY}, ${xAttentionBox - 5} ${matrixY}" 
              class="svg-stream-q stream-q-${i}" fill="none" stroke-width="1.3" />

        <path d="M ${xQKV + 4} ${y} 
                 C ${xQKV + 50} ${y}, ${matrixX} 110, ${matrixX} 145" 
              class="svg-stream-k stream-k-${i}" fill="none" stroke-width="1.3" />

        <path d="M ${xQKV + 4} ${y + 14} 
                 C ${xQKV + 50} ${y + 14}, ${xAttentionBox - 30} ${valY}, ${xAttentionBox + 20} ${valY}" 
              class="svg-stream-v stream-v-${i}" fill="none" stroke-width="1.3" />
      `;
    });

    // 4. MATRIZ DE ATENÇÃO (12 Cabeças)
    const boxW = 160;
    const boxH = 160;
    const boxX = xAttentionBox + 10;
    const boxY = 145;

    svg += `
      <rect x="${boxX + 10}" y="${boxY - 10}" width="${boxW}" height="${boxH}" rx="8" fill="var(--bg-tertiary)" stroke="var(--border-color)" opacity="0.4" />
      <rect x="${boxX + 5}" y="${boxY - 5}" width="${boxW}" height="${boxH}" rx="8" fill="var(--bg-tertiary)" stroke="var(--border-color)" opacity="0.7" />
      
      <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="8" fill="var(--bg-card)" stroke="var(--border-color)" filter="url(#cardShadow)" />
      
      <text x="${boxX + boxW / 2}" y="${boxY - 18}" fill="#ef4444" font-size="11" font-weight="700" text-anchor="middle">Key</text>
      <text x="${boxX - 25}" y="${boxY + boxH / 2}" fill="#3b82f6" font-size="11" font-weight="700" text-anchor="middle">Query</text>
      <text x="${boxX - 10}" y="${boxH + boxY + 20}" fill="#10b981" font-size="11" font-weight="700" text-anchor="end">Value</text>
      
      <g>
        <text x="${boxX + boxW / 2 - 12}" y="${boxY + boxH + 20}" fill="var(--text-muted)" font-size="12" font-weight="600" text-anchor="middle" class="clickable-title svg-zoom-trigger" data-modal="attention">Attention</text>
        <g class="svg-zoom-btn svg-zoom-trigger" data-modal="attention">
          <rect x="${boxX + boxW / 2 + 16}" y="${boxY + boxH + 6}" width="22" height="22" rx="4" class="zoom-btn-bg" />
          <text x="${boxX + boxW / 2 + 27}" y="${boxY + boxH + 21}" text-anchor="middle" class="zoom-btn-icon">🔍</text>
        </g>
      </g>
      <text x="${boxX + boxW / 2}" y="${boxY + boxH + 42}" fill="var(--text-secondary)" font-size="11" text-anchor="middle">Head ${state.selectedHead} of ${state.totalHeads} ‹ ›</text>
    `;

    // Células da Matriz de Atenção
    const matrixStep = (boxW - 40) / Math.max(1, N - 1);
    for (let r = 0; r < N; r++) {
      const cy = boxY + 20 + r * matrixStep;
      for (let c = 0; c < N; c++) {
        const cx = boxX + 20 + c * matrixStep;
        
        if (c > r) {
          svg += `
            <circle cx="${cx}" cy="${cy}" r="2" class="svg-attn-masked" 
                    data-type="masked" data-row="${r}" data-col="${c}" />
          `;
        } else {
          const weight = getHeadWeight(state.selectedHead, r, c);

          const radius = 2.5 + weight * 5.5;
          const opacity = 0.25 + weight * 0.75;

          svg += `
            <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#7c3aed" opacity="${opacity}" class="svg-attn-circle"
                    data-type="attention-cell" data-row="${r}" data-col="${c}" data-weight="${(weight*100).toFixed(1)}"
                    data-q="${escapeXml(tokens[r])}" data-k="${escapeXml(tokens[c])}" />
          `;
        }
      }
    }

    // 5. SAÍDA ("Out")
    const xOut = boxX + boxW;
    svg += `<text x="${xOut + 28}" y="${boxY + boxH / 2 - 4}" fill="#7c3aed" font-size="12" font-weight="700">Out</text>`;

    tokens.forEach((_, i) => {
      const startY = boxY + 20 + i * matrixStep;
      const endY = tokenY[i];
      svg += `
        <path d="M ${xOut} ${startY} 
                 C ${xOut + 35} ${startY}, ${xMLP - 40} ${endY}, ${xMLP - 5} ${endY}" 
              fill="none" stroke="rgba(124, 58, 237, 0.45)" stroke-width="1.8" />
      `;
    });

    // 6. MIXTURE OF EXPERTS (MoE: ROUTER + ROUTED EXPERTS + SHARED EXPERT) & LAÇO RESIDUAL
    const moeActive = state.currentStep === 4 || (state.activeMoeCategories && state.activeMoeCategories.length > 0);
    const activeCatSet = new Set(state.activeMoeCategories || []);
    const expertDefs = [
      { id: "E0", label: "E0·Arq", cat: "files" },
      { id: "E1", label: "E1·Web", cat: "web" },
      { id: "E2", label: "E2·API", cat: "api" },
      { id: "E3", label: "E3·SQL", cat: "database" },
      { id: "E4..15", label: "E4..15·Proc", cat: "process" }
    ];
    const hasCustomCats = activeCatSet.size > 0;
    const moeBoxX = xMLP - 6;
    const moeBoxY = 122;
    const moeBoxW = 134;
    const moeBoxH = 260;

    svg += `
      <g class="svg-moe-block svg-zoom-trigger" data-modal="mlp" cursor="pointer">
        <!-- Container MoE -->
        <rect x="${moeBoxX}" y="${moeBoxY}" width="${moeBoxW}" height="${moeBoxH}" rx="8"
              fill="${moeActive ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.05)'}"
              stroke="${moeActive ? '#0284c7' : 'var(--border-color)'}" stroke-width="${moeActive ? '2' : '1.2'}" />
        <text x="${moeBoxX + moeBoxW / 2}" y="${moeBoxY + 15}" font-size="9.5" font-weight="800" fill="#0284c7" text-anchor="middle">Mixture of Experts</text>

        <!-- Caixa Routed Experts -->
        <rect x="${moeBoxX + 7}" y="${moeBoxY + 23}" width="${moeBoxW - 14}" height="156" rx="6"
              fill="rgba(236, 72, 153, 0.08)" stroke="rgba(236, 72, 153, 0.4)" stroke-width="1" />
        <text x="${moeBoxX + moeBoxW / 2}" y="${moeBoxY + 36}" font-size="8.5" font-weight="700" fill="#be185d" text-anchor="middle">Routed Experts (Top-K)</text>
    `;

    expertDefs.forEach((exp, idx) => {
      const ey = moeBoxY + 44 + idx * 20;
      const isExpHot = hasCustomCats ? activeCatSet.has(exp.cat) : (moeActive && (idx === 0 || idx === 3));
      svg += `
        <rect x="${moeBoxX + 14}" y="${ey}" width="${moeBoxW - 28}" height="16" rx="3"
              fill="${isExpHot ? '#7c3aed' : 'var(--bg-card)'}"
              stroke="${isExpHot ? '#6d28d9' : 'var(--border-color)'}" stroke-width="1" />
        <text x="${moeBoxX + moeBoxW / 2}" y="${ey + 11}" font-size="8" font-weight="700"
              fill="${isExpHot ? '#ffffff' : 'var(--text-main)'}" text-anchor="middle">${exp.label}</text>
      `;
    });

    svg += `
        <!-- Router -->
        <rect x="${moeBoxX + 20}" y="${moeBoxY + 149}" width="${moeBoxW - 40}" height="22" rx="4"
              fill="${moeActive ? '#10b981' : 'rgba(16, 185, 129, 0.25)'}" stroke="#059669" stroke-width="1.2" />
        <text x="${moeBoxX + moeBoxW / 2}" y="${moeBoxY + 163}" font-size="9" font-weight="800"
              fill="${moeActive ? '#ffffff' : '#065f46'}" text-anchor="middle">Router gᵢ(x)</text>

        <!-- Shared Expert -->
        <rect x="${moeBoxX + 12}" y="${moeBoxY + 188}" width="${moeBoxW - 24}" height="28" rx="5"
              fill="${moeActive ? '#f59e0b' : 'rgba(245, 158, 11, 0.25)'}" stroke="#d97706" stroke-width="1.2" />
        <text x="${moeBoxX + moeBoxW / 2}" y="${moeBoxY + 205}" font-size="9" font-weight="800"
              fill="${moeActive ? '#ffffff' : '#92400e'}" text-anchor="middle">Shared Expert</text>

        <!-- Nó Somatório (+) -->
        <circle cx="${moeBoxX + moeBoxW / 2}" cy="${moeBoxY + 238}" r="11"
                fill="var(--bg-card)" stroke="${moeActive ? '#7c3aed' : 'var(--border-color)'}" stroke-width="1.8" />
        <text x="${moeBoxX + moeBoxW / 2}" y="${moeBoxY + 242}" font-size="13" font-weight="800"
              fill="var(--text-main)" text-anchor="middle">+</text>
      </g>
    `;

    const mlpResBottom = 470;
    svg += `
      <text x="${xMLP + 58}" y="${mlpResBottom - 18}" class="svg-header-text" text-anchor="middle" font-size="11" font-style="italic">Residual</text>
      <path d="M ${xMLP - 10} ${tokenY[N - 1] + 10} 
               C ${xMLP} ${mlpResBottom}, ${xResidualMerge + 25} ${mlpResBottom}, ${xResidualMerge + 25} ${tokenY[N - 1] + 5}" 
            class="svg-residual-path" />
    `;

    tokens.forEach((tok, i) => {
      const y = tokenY[i];
      svg += `
        <text x="${xMLP - 10}" y="${y + 4}" class="svg-token-label" font-size="11" text-anchor="end" fill="var(--text-muted)">${escapeXml(tok)}</text>
        <path d="M ${moeBoxX + moeBoxW} ${y} 
                 C ${moeBoxX + moeBoxW + 25} ${y}, ${x11Blocks - 35} ${y}, ${x11Blocks - 10} ${y}" 
              class="svg-stream-path" />
      `;
    });

    // 7. BLOCO DOS 11 TRANSFORMER BLOCKS IDENTICOS
    svg += `
      <rect x="${x11Blocks - 8}" y="65" width="16" height="420" rx="4" fill="url(#blockStackGrad)" />
      <line x1="${x11Blocks}" y1="65" x2="${x11Blocks}" y2="485" stroke="#6366f1" stroke-dasharray="3,3" opacity="0.6" />
    `;

    // 8. ÚLTIMO TOKEN E LEQUE PARA AS PROBABILIDADES
    const lastTokY = tokenY[N - 1];
    const lastTokenText = tokens[N - 1];

    if (state.currentStep < 6) {
      // -------------------------------------------------------------
      // ETAPAS 1 A 6: O MODELO ESTÁ RACIOCINANDO SOBRE A FRASE DO USUÁRIO!
      // AS PALAVRAS AINDA NÃO FORAM REVELADAS (EVITA SPOILER MOCKADO).
      // -------------------------------------------------------------
      const ctx = analyzePromptContext(text);
      const stepNames = [
        "1. Embeddings & Codificação Posicional",
        "2. Projeção Linear Query, Key & Value",
        "3. Auto-Atenção Multi-Head (12 Cabeças)",
        "4. Consolidação Contextual & Residual 1",
        "5. Mixture of Experts (MoE Top-K)",
        "6. Refinamento nos 12 Blocos Transformer"
      ];
      const subjInfo = ctx.subjectWord ? `Sujeito: "${ctx.subjectWord}"` : `Início: "${tokens[0] || ''}"`;
      const verbInfo = ctx.verbWord ? `Verbo: "${ctx.verbWord}"` : `Foco: "${lastTokenText}"`;
      const stepActionLines = [
        [`Vetorizando ${N} token(s). Último token: "${lastTokenText}" (${ctx.lastPosLabel}).`, `${subjInfo} | ${verbInfo}`],
        [`Query Q de "${lastTokenText}" busca conexões sintáticas anteriores.`, `Alvo gramatical exigido: ${ctx.slotLabel}.`],
        [`As 12 cabeças conectam "${lastTokenText}" a ${ctx.contextWordsSummary}.`, `Alinhando concordância (${ctx.agreementSummary}) e papel temático.`],
        [`Soma ponderada A×V incorpora "${ctx.verbWord || tokens[0]}" ao vetor de "${lastTokenText}".`, `Restrição sintática ativa: ${ctx.slotLabel}.`],
        [`Router MoE seleciona Top-K Experts + Shared Expert [${ctx.domainLabel}].`, `y = E_shared(x) + Σ g_i(x)·E_i(x)`],
        [`Bloco ${state.selectedBlock}/12 refinando representação latente de "${lastTokenText}".`, `Hipótese estrutural: ${ctx.slotLabel} (${ctx.domainLabel}).`]
      ];
      const linesForStep = stepActionLines[state.currentStep] || stepActionLines[0];

      // Leque tracejado em processamento
      svg += `
        <text x="${x11Blocks + 25}" y="${lastTokY + 4}" class="svg-token-label" font-size="12" font-weight="700" fill="var(--text-muted)">${escapeXml(lastTokenText)}</text>
        
        <path d="M ${x11Blocks + 8} ${lastTokY} 
                 C ${x11Blocks + 50} ${lastTokY}, ${xProbabilities - 40} 120, ${xProbabilities} 90
                 L ${xProbabilities} 460
                 C ${xProbabilities - 40} 430, ${x11Blocks + 50} ${lastTokY}, ${x11Blocks + 8} ${lastTokY} Z" 
              fill="rgba(99, 102, 241, 0.02)" stroke="rgba(156, 163, 175, 0.25)" stroke-dasharray="4,4" stroke-width="1.2" />

        <g transform="translate(${xProbabilities}, 100)" class="svg-pipeline-box">
          <rect x="0" y="0" width="380" height="275" rx="10" fill="var(--bg-tertiary)" stroke="var(--border-color)" stroke-dasharray="4,4" />
          
          <rect x="16" y="14" width="138" height="22" rx="11" fill="rgba(99, 102, 241, 0.14)" />
          <text x="85" y="29" text-anchor="middle" font-size="11" font-weight="700" fill="var(--accent-primary)">Raciocínio: Etapa ${state.currentStep + 1}/7</text>
          
          <text x="18" y="58" font-size="13.5" font-weight="700" fill="var(--text-main)">${escapeXml(stepNames[state.currentStep])}</text>
          
          <text x="18" y="82" font-size="11.5" fill="var(--text-secondary)">
            <tspan x="18" dy="0">${escapeXml(linesForStep[0].slice(0, 56))}</tspan>
            <tspan x="18" dy="18" fill="var(--text-main)" font-weight="600">${escapeXml(linesForStep[1].slice(0, 56))}</tspan>
            <tspan x="18" dy="22" fill="var(--accent-primary)" font-weight="600">🧠 Domínio: ${escapeXml(ctx.domainLabel.slice(0, 42))}</tspan>
            <tspan x="18" dy="18" fill="var(--accent-purple)" font-weight="600">⏳ Calculando tensores... Palavras só na Etapa 7.</tspan>
            <tspan x="18" dy="17" fill="var(--text-muted)" font-size="10.5">As candidatas são descobertas e medidas uma a uma</tspan>
            <tspan x="18" dy="15" fill="var(--text-muted)" font-size="10.5">quando o vetor final atingir Unembedding (W_U) &amp; Softmax.</tspan>
          </text>
          
          <g class="svg-jump-step7-btn" id="svgBtnJumpStep7" cursor="pointer" title="Avançar diretamente para a previsão final">
            <rect x="18" y="215" width="250" height="36" rx="6" fill="var(--accent-primary)" />
            <text x="143" y="238" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="700">⚡ Ver Previsão Final (Etapa 7) &rarr;</text>
          </g>
        </g>
      `;
    } else {
      // -------------------------------------------------------------
      // ETAPA 7: O MODELO ATINGIU A CAMADA FINAL (UNEMBEDDING & SOFTMAX)!
      // REVELAÇÃO PROGRESSIVA E MEDIÇÃO DAS PALAVRAS CANDIDATAS!
      // -------------------------------------------------------------
      svg += `
        <text x="${x11Blocks + 25}" y="${lastTokY + 4}" class="svg-token-label" font-size="12" font-weight="700" fill="var(--accent-purple)">${escapeXml(lastTokenText)}</text>
        
        <path d="M ${x11Blocks + 8} ${lastTokY} 
                 C ${x11Blocks + 50} ${lastTokY}, ${xProbabilities - 40} 120, ${xProbabilities} 90
                 L ${xProbabilities} 460
                 C ${xProbabilities - 40} 430, ${x11Blocks + 50} ${lastTokY}, ${x11Blocks + 8} ${lastTokY} Z" 
              fill="rgba(124, 58, 237, 0.16)" stroke="rgba(124, 58, 237, 0.55)" stroke-width="1.8" />
      `;

      // Status informativo
      svg += `
        <text x="${xProbabilities + 10}" y="76" font-size="11" font-weight="600" fill="var(--accent-purple)">
          ${state.isRevealingPredictions ? '⚡ Medindo afinidades no vocabulário W_U...' : '✅ Projeção W_U e Softmax concluídos'}
        </text>
      `;

      const topCandidates = predictions.slice(0, 6);
      const probYStart = 105;
      const probStep = 44;
      const visibleCount = state.revealedCandidatesCount;

      topCandidates.forEach((cand, idx) => {
        if (idx >= visibleCount) return; // Só exibe as candidatas já descobertas até o momento!

        const cy = probYStart + idx * probStep;
        const isTop = idx === 0;
        const isFinished = !state.isRevealingPredictions;
        const barWidth = Math.max(4, Math.round(cand.prob * 135));

        svg += `
          <g class="svg-candidate-group" data-rank="${idx + 1}">
            <!-- Fundo suave no hover/ativo -->
            <rect x="${xProbabilities + 4}" y="${cy - 16}" width="370" height="34" rx="6" 
                  fill="${isTop && isFinished ? 'rgba(16, 185, 129, 0.08)' : 'transparent'}" 
                  stroke="${isTop && isFinished ? 'rgba(16, 185, 129, 0.35)' : 'transparent'}" />

            <!-- Rank e Palavra -->
            <text x="${xProbabilities + 12}" y="${cy + 5}" 
                  class="svg-candidate-word ${isTop ? 'top-candidate' : ''}" 
                  data-word="${escapeXml(cand.word)}" 
                  data-prob="${cand.probPercent}" 
                  data-note="${escapeXml(cand.note)}">
              <tspan fill="var(--text-muted)" font-size="10">#${idx + 1} </tspan>${escapeXml(cand.word)}
            </text>

            <!-- Barra de Probabilidade Animada -->
            <rect x="${xProbabilities + 130}" y="${cy - 2}" width="${barWidth}" height="7" rx="3.5" 
                  fill="${isTop ? 'var(--accent-green)' : 'var(--accent-purple)'}" 
                  opacity="${isTop ? 0.95 : 0.65}" 
                  class="svg-candidate-meter" />

            <!-- Valor Percentual Formatado -->
            <text x="${xProbabilities + 145 + barWidth}" y="${cy + 5}" 
                  font-family="monospace" font-size="12" font-weight="${isTop ? '800' : '500'}" 
                  fill="${isTop ? 'var(--accent-green)' : 'var(--text-main)'}">
              ${cand.probPercent}
            </text>
            
            ${isTop && isFinished ? `
              <g transform="translate(${xProbabilities + 300}, ${cy - 11})">
                <rect x="0" y="0" width="65" height="20" rx="4" fill="var(--accent-green)" />
                <text x="32" y="14" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">⭐ TOP 1</text>
              </g>
            ` : ''}
          </g>
        `;
      });
    }

    transformerSvg.innerHTML = svg;
    attachSvgInteractions();
  }

  // ==================== INTERAÇÕES DO SVG & LUPAS 🔍 ====================
  function attachSvgInteractions() {
    const jumpBtn = document.getElementById('svgBtnJumpStep7');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pauseJourney();
        applyStep(6, true);
      });
    }

    document.querySelectorAll('.svg-zoom-trigger, .svg-zoom-btn').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const modalType = trigger.getAttribute('data-modal') || trigger.dataset.modal;
        if (modalType) {
          openMathModal(modalType);
        }
      });
    });

    document.querySelectorAll('.svg-attn-circle').forEach(circle => {
      circle.addEventListener('mouseenter', (e) => {
        const q = e.target.dataset.q;
        const k = e.target.dataset.k;
        const r = e.target.dataset.row;
        const c = e.target.dataset.col;
        const w = e.target.dataset.weight;

        inspectorTitle.textContent = `🎯 Atenção [Q: "${q}" &rarr; K: "${k}"]`;
        inspectorDescription.innerHTML = `
          O token <strong>"${q}"</strong> (posição ${r}) consulta o token <strong>"${k}"</strong> (posição ${c}) 
          com peso de atenção de <strong>${w}%</strong> através de <em>Softmax(Q·Kᵀ / &radic;dₖ)</em>.
        `;

        highlightQKVStreams(r, c);
      });

      circle.addEventListener('mouseleave', () => {
        resetInspector();
        resetStreamHighlights();
      });
    });

    document.querySelectorAll('.svg-attn-masked').forEach(circle => {
      circle.addEventListener('mouseenter', (e) => {
        const r = e.target.dataset.row;
        const c = e.target.dataset.col;
        inspectorTitle.textContent = `🔒 Máscara Causal (Look-Ahead Mask)`;
        inspectorDescription.innerHTML = `
          Posição futura (${r} &rarr; ${c}) bloqueada com score de <strong>&minus;&infin;</strong>. 
          O modelo não tem permissão para olhar para palavras futuras.
        `;
      });
      circle.addEventListener('mouseleave', resetInspector);
    });

    document.querySelectorAll('.svg-candidate-word').forEach(wordEl => {
      const word = wordEl.dataset.word;
      const prob = wordEl.dataset.prob;
      const note = wordEl.dataset.note;

      wordEl.addEventListener('mouseenter', () => {
        inspectorTitle.textContent = `✨ Candidata: "${word}" (${prob})`;
        inspectorDescription.innerHTML = `${note} <strong>Clique sobre a palavra para estender o texto (1 único passo)!</strong>`;
      });

      wordEl.addEventListener('mouseleave', resetInspector);

      wordEl.addEventListener('click', () => {
        commitSingleWord(word);
      });
    });

    document.querySelectorAll('.svg-token-label').forEach(label => {
      label.addEventListener('mouseenter', (e) => {
        const tok = e.target.dataset.token;
        if (!tok) return;
        inspectorTitle.textContent = `🔤 Token de Entrada: "${tok}"`;
        inspectorDescription.innerHTML = `
          Representação vetorial contínua combinando embedding de vocabulário e vetor posicional: $X_0 = W_e + W_p$.
        `;
      });
      label.addEventListener('mouseleave', resetInspector);
    });
  }

  function highlightQKVStreams(row, col) {
    document.querySelectorAll(`.stream-q-${row}`).forEach(el => {
      el.style.stroke = "#1d4ed8";
      el.style.strokeWidth = "2.5px";
    });
    document.querySelectorAll(`.stream-k-${col}`).forEach(el => {
      el.style.stroke = "#b91c1c";
      el.style.strokeWidth = "2.5px";
    });
  }

  function resetStreamHighlights() {
    document.querySelectorAll('.svg-stream-q').forEach(el => {
      el.style.stroke = "";
      el.style.strokeWidth = "";
    });
    document.querySelectorAll('.svg-stream-k').forEach(el => {
      el.style.stroke = "";
      el.style.strokeWidth = "";
    });
  }

  function resetInspector() {
    inspectorTitle.textContent = "💡 Dica Interativa:";
    inspectorDescription.innerHTML = `
      Passe o mouse sobre os <strong>tokens</strong>, as <strong>fitas de fluxo (Q, K, V)</strong>, a <strong>matriz de atenção</strong> ou as <strong>barras de probabilidades</strong> para inspecionar os tensores em cada etapa. Clique em <span style="color:#6366f1;font-weight:700;">🔍</span> para zoom matemático.
    `;
  }

  function commitSingleWord(word) {
    if (!word) return;
    const current = promptInput.value.trim();
    const updated = current + " " + word;
    promptInput.value = updated;
    state.prompt = updated;
    markActivePreset();
    // O texto mudou: descarta a previsão anterior e reconstrói a jornada do zero.
    resetJourneyForNewInput();
    startJourney();
  }

  // ==================== 4. RENDERIZADOR DOS ESTÁGIOS ISOLADOS ====================
  function renderIsolatedStages() {
    const tokens = state.tokens;

    // 1. Tokens Isolados
    isolatedTokenChips.innerHTML = tokens.map((tok, i) => {
      const id = computeDeterministicTokenId(tok);
      const hue = (id * 37) % 360;
      return `
        <div class="token-chip-box" style="border-top: 3px solid hsl(${hue}, 70%, 55%);">
          <span class="token-chip-text">${escapeXml(tok)}</span>
          <span class="token-chip-id">ID: ${id}</span>
        </div>
      `;
    }).join('');

    // 2. Embeddings Cards
    isolatedEmbeddingCards.innerHTML = tokens.map((tok, i) => {
      const id = computeDeterministicTokenId(tok);
      const cells = [];
      for (let d = 0; d < 6; d++) {
        const val = Math.sin(id * (d + 1) * 0.15);
        const col = val > 0 ? `rgba(99, 102, 241, ${0.3 + val * 0.6})` : `rgba(239, 68, 68, ${0.3 + Math.abs(val) * 0.6})`;
        cells.push(`<div class="vector-cell-dot" style="background:${col};" title="dim ${d}: ${val.toFixed(2)}"></div>`);
      }
      return `
        <div class="vector-mini-card">
          <div class="vector-mini-header">
            <span>"${escapeXml(tok)}"</span>
            <span style="opacity:0.5;">p${i}</span>
          </div>
          <div class="vector-cells-bar">${cells.join('')}</div>
        </div>
      `;
    }).join('');

    // 3. Heatmap Causal Isolado
    renderIsolatedHeatmap();

    // 4. Probabilidades Isoladas
    renderIsolatedProbabilities();
  }

  function renderIsolatedHeatmap() {
    const N = state.tokens.length;
    isolatedHeatmapGrid.innerHTML = "";
    isolatedHeatmapGrid.style.gridTemplateColumns = `75px repeat(${N}, 44px)`;

    // Canto
    const corner = document.createElement('div');
    corner.className = 'heatmap-header-cell';
    corner.innerHTML = '<small style="opacity:0.5;">Q \\ K</small>';
    isolatedHeatmapGrid.appendChild(corner);

    // Colunas (Keys)
    for (let c = 0; c < N; c++) {
      const colHeader = document.createElement('div');
      colHeader.className = 'heatmap-header-cell';
      colHeader.textContent = state.tokens[c].slice(0, 5);
      isolatedHeatmapGrid.appendChild(colHeader);
    }

    // Linhas (Queries)
    for (let r = 0; r < N; r++) {
      const rowHeader = document.createElement('div');
      rowHeader.className = 'heatmap-header-cell row-header';
      rowHeader.textContent = state.tokens[r].slice(0, 6);
      isolatedHeatmapGrid.appendChild(rowHeader);

      for (let c = 0; c < N; c++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';

        if (c > r) {
          cell.classList.add('causal-masked');
          cell.innerHTML = '&times;';
          cell.title = `Bloqueado pela máscara causal`;
        } else {
          const weight = getHeadWeight(state.selectedHead, r, c);

          cell.textContent = weight.toFixed(2);
          cell.style.backgroundColor = getHeatmapColor(weight);
          cell.style.color = '#fff';

          cell.addEventListener('mouseenter', () => {
            inspectIsolatedAttention(r, c, weight);
          });
        }

        isolatedHeatmapGrid.appendChild(cell);
      }
    }
  }

  function getHeatmapColor(val) {
    if (val < 0.25) return 'rgba(30, 41, 59, 0.8)';
    if (val < 0.50) return 'rgba(59, 130, 246, 0.85)';
    if (val < 0.75) return 'rgba(124, 58, 237, 0.9)';
    return 'rgba(236, 72, 153, 0.95)';
  }

  function inspectIsolatedAttention(r, c, weight) {
    const q = state.tokens[r];
    const k = state.tokens[c];
    const score = (Math.log(weight + 1e-4) + 3.2).toFixed(2);

    isolatedInspectorBody.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.6rem;">
        <div style="font-size:0.85rem;">
          Query (Q): <strong style="color:#3b82f6;">"${q}"</strong> [pos ${r}] &rarr; Key (K): <strong style="color:#ef4444;">"${k}"</strong> [pos ${c}]
        </div>
        <div style="background:var(--bg-secondary); padding:0.6rem 0.85rem; border-radius:6px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
          <span>Peso de Atenção: <strong style="color:#7c3aed; font-size:1.1rem;">${(weight*100).toFixed(1)}%</strong></span>
          <span style="font-family:monospace; font-size:0.8rem; color:var(--text-muted);">Q·Kᵀ/√d = ${score}</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.45; margin:0;">
          ${r === c ? `O token <strong>"${q}"</strong> preserva auto-informação com peso de ${(weight*100).toFixed(0)}%.` : `O token <strong>"${q}"</strong> extrai pistas semânticas antecedentes de <strong>"${k}"</strong>.`}
        </p>
      </div>
    `;
  }

  function renderIsolatedProbabilities() {
    // Antes da Etapa 7 o modelo ainda não projetou nada no vocabulário: nada a mostrar.
    if (state.currentStep < 6) {
      isolatedProbList.innerHTML = `
        <div class="prob-item-row" style="opacity:0.75;">
          <div class="prob-item-meta">
            <span class="prob-item-word">⏳ Aguardando a jornada chegar à Etapa 7</span>
          </div>
          <p style="font-size:0.82rem; color:var(--text-secondary); margin:0;">
            As candidatas para a próxima palavra após <strong>"${escapeXml(lastInputToken())}"</strong> só existem depois que o vetor do último token
            atravessa os 12 blocos e é projetado em $W_U$. Use <strong>Reproduzir Jornada</strong>.
          </p>
        </div>`;
      heroWord.textContent = "—";
      heroProb.textContent = "";
      heroNote.textContent = "A palavra mais provável será conhecida ao final da jornada.";
      isolatedAppendBtn.disabled = true;
      isolatedAppendBtn.style.opacity = "0.5";
      return;
    }

    // Etapa 7: mostra apenas as candidatas já descobertas/medidas pela animação.
    const preds = state.currentPredictions.slice(0, Math.min(6, state.revealedCandidatesCount));
    const finished = !state.isRevealingPredictions && preds.length > 0;
    isolatedAppendBtn.disabled = !finished;
    isolatedAppendBtn.style.opacity = finished ? "1" : "0.5";

    if (preds.length === 0) {
      isolatedProbList.innerHTML = `<div class="prob-item-row"><span class="prob-item-word">⚡ Projetando logits no vocabulário...</span></div>`;
      heroWord.textContent = "…";
      heroProb.textContent = "";
      heroNote.textContent = "Medindo afinidades.";
      return;
    }

    isolatedProbList.innerHTML = preds.map((item, idx) => `
      <div class="prob-item-row ${idx === 0 ? 'top-rank' : ''}" style="cursor:pointer;" onclick="window.commitFromIsolated('${escapeXml(item.word)}')">
        <div class="prob-item-meta">
          <span class="prob-item-word">#${idx + 1} "${escapeXml(item.word)}"</span>
          <span class="prob-item-pct">${item.probPercent}</span>
        </div>
        <div class="prob-item-track">
          <div class="prob-item-fill" style="width:${Math.max(3, item.prob * 100)}%;"></div>
        </div>
      </div>
    `).join('');

    if (finished) {
      const top = preds[0];
      heroWord.textContent = top.word;
      heroProb.textContent = top.probPercent;
      heroNote.textContent = top.note;
    } else {
      heroWord.textContent = "…";
      heroProb.textContent = "";
      heroNote.textContent = `Medindo candidata ${preds.length}...`;
    }
  }

  window.commitFromIsolated = function(word) {
    commitSingleWord(word);
  };

  // ==================== 5. MODAL DE DETALHAMENTO MATEMÁTICO RESPONSIVO ====================
  function openMathModal(type) {
    let title = "Detalhamento Matemático";
    let tag = "Módulo";
    let dims = "d_model = 768";
    let content = "";

    const currentTokensStr = state.tokens.map(t => `"${t}"`).join(", ");

    if (type === 'embedding') {
      title = "Embedding de Vocabulário & Codificação Posicional";
      tag = "Módulo 1 & 2";
      dims = "Matriz W_e ∈ ℝ^{50.257 × 768}";
      content = `
        <div class="math-card-block">
          <h4>1. Mapeamento de Vocabulário Discreto para Contínuo</h4>
          <p>O texto de entrada é transformado em IDs inteiros pelo algoritmo de subpalavras (BPE). Para cada token $t$, selecionamos a linha correspondente na matriz treinável $W_e$:</p>
          <div class="math-callout">$$\\mathbf{e}_t = W_e[\\text{id}_t] \\in \\mathbb{R}^{d_{model}} \\quad (d_{model} = 768)$$</div>
          <p>Tokens atuais no prompt: <code>${escapeXml(currentTokensStr)}</code></p>
        </div>

        <div class="math-card-block">
          <h4>2. Injetando a Noção de Ordem Temporal (Positional Encoding)</h4>
          <p>Diferente de uma RNN que processa palavra por palavra no tempo, o Transformer processa todos os tokens em paralelo. Sem codificação posicional, a frase <em>"O cão mordeu o gato"</em> teria representação idêntica a <em>"O gato mordeu o cão"</em>. Somamos o vetor posicional $P_t$:</p>
          <div class="math-callout">$$\\mathbf{x}_t = \\mathbf{e}_t + \\mathbf{p}_t$$</div>
          <p>No paper original (Vaswani et al.), utilizam-se funções trigonométricas senoidais de frequências geométricas:</p>
          <div class="math-callout">$$PE_{(pos, 2i)} = \\sin\\left(\\frac{pos}{10000^{2i/d}}\\right), \\quad PE_{(pos, 2i+1)} = \\cos\\left(\\frac{pos}{10000^{2i/d}}\\right)$$</div>
        </div>
      `;
    } else if (type === 'attention') {
      title = "Auto-Atenção Multi-Head, Projeções QKV & Máscara Causal";
      tag = "Módulo 3 (Núcleo)";
      dims = "h = 12 cabeças | d_k = 64";
      content = `
        <div class="math-card-block">
          <h4>1. As Projeções Lineares Query, Key e Value (QKV)</h4>
          <p>Para cada token da entrada $X \\in \\mathbb{R}^{N \\times d_{model}}$, geramos 3 representações especializadas através de matrizes aprendidas $W_Q, W_K, W_V \\in \\mathbb{R}^{d_{model} \\times d_k}$:</p>
          <div class="math-callout">$$Q = X W_Q, \\quad K = X W_K, \\quad V = X W_V \\in \\mathbb{R}^{N \\times d_k}$$</div>
          <ul>
            <li><strong style="color:#3b82f6;">Query (Q):</strong> O vetor de consulta que busca afinidades contextuais.</li>
            <li><strong style="color:#ef4444;">Key (K):</strong> O vetor de indexação/chave que cada palavra oferece.</li>
            <li><strong style="color:#10b981;">Value (V):</strong> O conteúdo vetorial que será somado se a consulta bater com a chave.</li>
          </ul>
        </div>

        <div class="math-card-block">
          <h4>2. Scaled Dot-Product & Máscara Causal</h4>
          <p>Avaliamos a afinidade entre palavras pelo produto escalar $Q K^T$. Para dimensões grandes ($d_k=64$), a variância cresceria linearmente, empurrando o Softmax para áreas saturadas com derivada nula. Por isso escalonamos por $\\frac{1}{\\sqrt{d_k}}$:</p>
          <div class="math-callout">$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}} + M_{\\text{causal}}\\right) V$$</div>
          <p>A <strong>Máscara Causal</strong> $M_{ij}$ aplica $-\\infty$ a qualquer posição $j > i$ (posições futuras), garantindo $\\exp(-\\infty) = 0$.</p>
        </div>

        <div class="math-card-block">
          <h4>3. Por que 12 Cabeças de Atenção (Multi-Head)?</h4>
          <p>Uma única cabeça seria forçada a mediar todas as relações sintáticas e semânticas ao mesmo tempo. Ao dividir em 12 cabeças ortogonais, cada cabeça foca em uma relação linguística específica:</p>
          <div class="math-callout">$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_{12}) W^O$$</div>
        </div>
      `;
    } else if (type === 'mlp') {
      title = "Mixture of Experts (MoE) — Roteamento Top-K & Shared Expert";
      tag = "Módulo 4 (MoE)";
      dims = "16 Routed Experts + 1 Shared Expert (Sparse Top-K)";
      content = `
        <div class="math-card-block">
          <h4>1. Equação Fundamental do Mixture of Experts (MoE)</h4>
          <p>Em vez de ativar um MLP denso único para todos os tokens, o bloco <strong>MoE</strong> ativa apenas os <strong>$K$ especialistas mais relevantes</strong> escolhidos pelo Router:</p>
          <div class="math-callout">$$y = \\sum_{i \\in \\text{TopK}(x)} g_i(x)\\, E_i(x)$$</div>
          <p>Com a inclusão de um <strong>Shared Expert</strong> sempre ativo (como no diagrama da arquitetura), somamos a base comum aos especialistas roteados:</p>
          <div class="math-callout">$$y = E_{\\text{shared}}(x) + \\sum_{i \\in \\text{TopK}(x)} g_i(x)\\, E_i(x)$$</div>
        </div>

        <div class="math-card-block">
          <h4>2. Rede de Roteamento (Router / Gating Network) &amp; Balanceamento</h4>
          <p>O Router projeta o vetor $x$ sobre os $N$ especialistas ($W_g \\in \\mathbb{R}^{d_{model} \\times N}$) e aplica Softmax nos Top-K escores:</p>
          <div class="math-callout">$$g_i(x) = \\frac{\\exp((x W_g)_i)}{\\sum_{j \\in \\text{TopK}(x)} \\exp((x W_g)_j)}, \\qquad \\mathcal{L}_{\\text{aux}} = \\alpha \\cdot N \\sum_{i=1}^{N} f_i \\cdot P_i$$</div>
          <p>A perda auxiliar $\\mathcal{L}_{\\text{aux}}$ garante distribuição equilibrada entre os especialistas ($E_0 \\dots E_{15}$), evitando colapso de roteamento.</p>
        </div>
      `;
    } else if (type === 'blocks') {
      title = "A Pilha Hierárquica de 12 Blocos Decodificadores";
      tag = "Arquitetura Completa";
      dims = "12 Camadas | 124 Milhões de Parâmetros";
      content = `
        <div class="math-card-block">
          <h4>Especialização por Níveis de Profundidade</h4>
          <p>Os 12 blocos decodificadores idênticos não aprendem as mesmas coisas. Pesquisas empíricas de interpretabilidade mecânica revelam:</p>
          <ul>
            <li><strong>Blocos 1 a 3 (Camadas Baixas):</strong> Foco estrito em relações sintáticas imediatas, pontuação e adjacência.</li>
            <li><strong>Blocos 4 a 8 (Camadas Médias):</strong> Resolução de pronomes, anáforas e concordâncias gramaticais entre sujeito e predicado distante.</li>
            <li><strong>Blocos 9 a 12 (Camadas Altas):</strong> Síntese de tópicos conceituais abstratos, modelagem de intenção e alinhamento com a tarefa final.</li>
          </ul>
        </div>
      `;
    } else if (type === 'probabilities') {
      title = "Unembedding ($W_U$) & Softmax com Parâmetro de Temperatura ($T$)";
      tag = "Módulo 5 (Previsão)";
      dims = "Logits z ∈ ℝ^{50.257}";
      content = `
        <div class="math-card-block">
          <h4>1. Projeção Linear de Vocabulário (Unembedding)</h4>
          <p>O vetor contextual do último token $\\mathbf{h}_{final} \\in \\mathbb{R}^{d_{model}}$ é multiplicado pela matriz de saída $W_U \\in \\mathbb{R}^{d_{model} \\times |V|}$:</p>
          <div class="math-callout">$$\\mathbf{z} = \\mathbf{h}_{final} W_U \\in \\mathbb{R}^{|V|}$$</div>
        </div>

        <div class="math-card-block">
          <h4>2. O Efeito Matemático da Temperatura ($T$)</h4>
          <p>A Temperatura reescala os logits antes do cálculo da função exponencial:</p>
          <div class="math-callout">$$P(\\text{palavra}_i) = \\frac{\\exp\\left(\\frac{z_i}{T}\\right)}{\\sum_{j=1}^{|V|} \\exp\\left(\\frac{z_j}{T}\\right)}$$</div>
          <ul>
            <li><strong>Quando $T \\to 0$:</strong> O maior logit atinge quase $100\\%$ da massa de probabilidade. Isso equivale à <strong>Busca Gulosa (Greedy / Argmax)</strong>: totalmente determinística.</li>
            <li><strong>Quando $T = 1.0$:</strong> Distribuição probabilística pura aprendida durante o pré-treinamento.</li>
            <li><strong>Quando $T \\to \\infty$:</strong> A fração $z_i / T \\to 0$, de modo que $\\exp(0) = 1$. A distribuição torna-se perfeitamente uniforme e caótica.</li>
          </ul>
        </div>
      `;
    }

    modalTitle.textContent = title;
    modalTag.textContent = tag;
    modalDimsPill.textContent = dims;
    modalBody.innerHTML = content;
    mathModalOverlay.classList.add('active');
    initKaTeX();
  }

  function closeMathModal() {
    mathModalOverlay.classList.remove('active');
  }

  // ==================== KATEX MATH ====================
  function initKaTeX() {
    if (window.renderMathInElement) {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }
  }

  function escapeXml(unsafe) {
    if (!unsafe) return "";
    return unsafe.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  // ==================== 6. CENÁRIO REAL LANGCHAIN ARCHITECTURE FLOW & TOOLS ====================
  function initAgentSearchScenario() {
    const searchInput = document.getElementById('agentSearchInput');
    const scenarioSelect = document.getElementById('agentScenarioSelect');
    const modelSelect = document.getElementById('agentModelSelect');
    const btnRun = document.getElementById('btnRunAgentSearch');
    const btnClear = document.getElementById('btnClearAgentSearch');
    const presetChips = document.getElementById('agentPresetChips');
    const statusBadge = document.getElementById('agentSearchStatusBadge');
    const statusText = document.getElementById('agentSearchStatusText');
    const progressFill = document.getElementById('agentProgressFill');
    const progressLabel = document.getElementById('agentProgressLabel');
    const pipelineBoard = document.getElementById('agentPipelineBoard');
    const traceList = document.getElementById('agentTraceList');
    const stepCounter = document.getElementById('agentStepCounter');
    const foundItems = document.getElementById('agentFoundItems');
    const sourceCounter = document.getElementById('agentSourceCounter');
    const aggregatorBox = document.getElementById('agentAggregatorBox');
    const aggregatorContent = document.getElementById('agentAggregatorContent');

    if (!searchInput || !btnRun || !pipelineBoard) return;

    const API_BASE = "http://127.0.0.1:8001";
    let activeTimer = null;

    const LC_NODES = [
      { id: "user_input", icon: "👤", title: "1. User Input", sub: "Query / Question / Command" },
      { id: "prompt_template", icon: "📋", title: "2. Prompt Template", sub: "Formats & injects variables" },
      { id: "llm_model", icon: "🧠", title: "3. LLM / Chat Model", sub: "Processes the structured prompt" },
      { id: "chain", icon: "🔗", title: "4. Chain (Pipeline)", sub: "Sequences multi-step operations" },
      { id: "agent_tools", icon: "🤖", title: "5. Agent & Tools", sub: "Decides actions, calls tools (APIs, DB)" },
      { id: "memory", icon: "💾", title: "6. Memory", sub: "Stores conversation & context" },
      { id: "output", icon: "✅", title: "7. Output", sub: "Final Answer / Action / Data" }
    ];

    const LC_TOOLS = [
      { id: "files", icon: "📄", label: "Arquivos & Chunks (storage/)" },
      { id: "web", icon: "🌐", label: "Web Search API (Live)" },
      { id: "api", icon: "🔌", label: "REST APIs (HTTP GET)" },
      { id: "database", icon: "🗄️", label: "Database Query (PostgreSQL)" },
      { id: "process", icon: "⚙️", label: "Processos Python & Calc" }
    ];

    function renderLangChainFlowSkeleton() {
      pipelineBoard.innerHTML = `
        <div class="langchain-flow-wrapper">
          <div class="langchain-main-column">
            ${LC_NODES.map(n => `
              <div class="lc-step-node" data-lc-node="${n.id}">
                <span class="lc-step-icon">${n.icon}</span>
                <div>
                  <div class="lc-step-title">${escapeXml(n.title)}</div>
                  <div class="lc-step-sub">${escapeXml(n.sub)}</div>
                </div>
              </div>
            `).join("")}
          </div>
          <div class="lc-connector-bridge" id="lcToolsBridge">&harr;</div>
          <div class="lc-tools-column">
            <div class="lc-tools-header">Tools (Tool Calling)</div>
            ${LC_TOOLS.map(t => `
              <div class="lc-tool-pill" data-lc-tool="${t.id}">
                <span>${t.icon}</span>
                <span>${escapeXml(t.label)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    function setNodeState(nodeId, stateName) {
      const el = pipelineBoard.querySelector(`[data-lc-node="${nodeId}"]`);
      if (!el) return;
      el.classList.remove('is-active', 'is-done');
      if (stateName) el.classList.add(stateName);
    }

    function setToolState(toolCat, stateName) {
      const el = pipelineBoard.querySelector(`[data-lc-tool="${toolCat}"]`);
      if (!el) return;
      el.classList.remove('is-active', 'is-done');
      if (stateName) el.classList.add(stateName);
    }

    function appendTrace(title, tag, desc, codeText) {
      const traceEl = document.createElement('div');
      traceEl.className = 'agent-trace-item';
      traceEl.innerHTML = `
        <div class="agent-trace-head">
          <span class="agent-trace-title">${escapeXml(title)}</span>
          <span class="agent-trace-tag">${escapeXml(tag)}</span>
        </div>
        <div class="agent-trace-desc">${escapeXml(desc)}</div>
        ${codeText ? `<div class="agent-trace-code">${escapeXml(codeText)}</div>` : ""}
      `;
      traceList.appendChild(traceEl);
      traceList.scrollTop = traceList.scrollHeight;
    }

    function formatConciseToolSummary(toolExec) {
      const r = toolExec.result;
      if (!r) return "Sem dados retornados.";
      if (typeof r === "string") return r.slice(0, 320);

      if (r.erro) return `Erro: ${r.erro}`;
      if (toolExec.tool === "gerar_pdf_relatorio") {
        return `PDF gerado: ${r.arquivo} (${r.paginas} pág., ${r.tamanho_bytes} bytes)`;
      }
      if ((toolExec.tool === "consultar_compras_restaurante" || toolExec.tool === "consultar_vendas") && r.resumo) {
        const anos = (r.por_ano || []).map(a => `${a.ano}: R$ ${a.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`).join(" | ");
        return `${r.resumo.qtd_compras} compras | Total: R$ ${Number(r.resumo.total_gasto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${anos ? ` (${anos})` : ""}`;
      }
      if (toolExec.tool === "buscar_em_arquivos" && Array.isArray(r.resultados)) {
        if (!r.resultados.length) return "Nenhum trecho correspondente encontrado.";
        return r.resultados.slice(0, 2).map(x => `[${x.arquivo} • ${x.similaridade}%] ${x.trecho.slice(0, 140)}...`).join("\n");
      }
      if (toolExec.tool === "web_search" && Array.isArray(r.resultados)) {
        if (!r.resultados.length) return "Nenhum resultado web encontrado.";
        return r.resultados.slice(0, 2).map(x => `• ${x.titulo}: ${(x.resumo || "").slice(0, 130)}...`).join("\n");
      }
      if (toolExec.tool === "consultar_cep" && r.dados) {
        const d = r.dados;
        return `${d.logradouro || ""} — ${d.bairro || ""}, ${d.localidade || ""}/${d.uf || ""} (CEP ${d.cep || ""})`;
      }
      if (toolExec.tool === "calcular_expressao") {
        return `${r.expressao} = ${r.resultado}`;
      }
      return JSON.stringify(r).slice(0, 260);
    }

    function appendFoundCard(toolExec) {
      const isExternal = toolExec.category === "web" || toolExec.category === "api";
      const badgeLabel = isExternal ? `Externo: ${toolExec.tool}` : `Interno: ${toolExec.tool}`;
      const summaryText = formatConciseToolSummary(toolExec);
      const rawJson = typeof toolExec.result === "string"
        ? toolExec.result
        : JSON.stringify(toolExec.result, null, 2);

      let pdfLinkHtml = "";
      if (toolExec.tool === "gerar_pdf_relatorio" && toolExec.result && toolExec.result.arquivo) {
        const fname = String(toolExec.result.arquivo).split("/").pop();
        pdfLinkHtml = `<div style="margin-top:0.45rem;"><a href="${API_BASE}/api/storage/download/${encodeURIComponent(fname)}" target="_blank" rel="noopener" class="btn btn-primary" style="padding:0.35rem 0.75rem;font-size:0.78rem;">📥 Baixar PDF (${escapeXml(fname)})</a></div>`;
      }

      const card = document.createElement('div');
      card.className = 'agent-found-card';
      card.innerHTML = `
        <div class="found-card-top">
          <span class="found-source-badge ${isExternal ? 'external' : 'internal'}">${escapeXml(badgeLabel)}</span>
          <span class="found-score">${toolExec.status === 'ok' ? 'OK' : 'ERRO'} &bull; ${toolExec.duration_ms} ms</span>
        </div>
        <div class="found-card-body" style="white-space:pre-line;">${escapeXml(summaryText)}</div>
        ${pdfLinkHtml}
        <details style="margin-top:0.25rem;font-size:0.72rem;color:var(--text-muted);">
          <summary style="cursor:pointer;">Ver detalhes técnicos</summary>
          <pre class="agent-trace-code" style="white-space:pre-wrap;max-height:130px;overflow:auto;">Args: ${escapeXml(JSON.stringify(toolExec.args))}\n${escapeXml(rawJson.slice(0, 700))}</pre>
        </details>
        <div class="found-score-bar">
          <div class="found-score-fill" style="width:${toolExec.status === 'ok' ? 100 : 35}%;"></div>
        </div>
      `;
      foundItems.appendChild(card);
      foundItems.scrollTop = foundItems.scrollHeight;
    }

    function setMoeBridgeStage(stageName) {
      const stepsEl = document.getElementById('agentMoeBridgeSteps');
      if (!stepsEl) return;
      const order = ["attn", "router", "experts", "sum"];
      const targetIdx = order.indexOf(stageName);
      stepsEl.querySelectorAll('.moe-chip').forEach(chip => {
        const idx = order.indexOf(chip.dataset.moeStage);
        chip.classList.remove('is-active', 'is-done');
        if (targetIdx === -1) return;
        if (idx < targetIdx) chip.classList.add('is-done');
        else if (idx === targetIdx) chip.classList.add('is-active');
      });
    }

    function resetSearchUI() {
      if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
      state.activeMoeCategories = [];
      setMoeBridgeStage(null);
      renderLangChainFlowSkeleton();
      traceList.innerHTML = "";
      foundItems.innerHTML = "";
      aggregatorBox.style.display = "none";
      aggregatorContent.innerHTML = "";
      progressFill.style.width = "0%";
      progressLabel.textContent = "0% — Iniciando LangChain Architecture Flow...";
      stepCounter.textContent = "0 / 7 etapas";
      sourceCounter.textContent = "0 tool calls";
      statusBadge.className = "agent-status-pill is-searching";
      statusText.textContent = "Executando busca real via LangChain...";
    }

    async function runRealOrchestratedSearch() {
      const query = searchInput.value.trim();
      if (!query) return;

      const mode = scenarioSelect ? scenarioSelect.value : "auto";
      const modelName = modelSelect ? modelSelect.value : "openai/gpt-6.1-sol";
      resetSearchUI();

      // Sincroniza a arquitetura principal do Transformer passando da Atenção para o MoE
      promptInput.value = query;
      state.prompt = query;
      updatePromptStats();
      applyStep(2, true); // Passo 3: Self-Attention
      setMoeBridgeStage("attn");

      let toolCount = 0;
      const stageOrder = ["user_input", "prompt_template", "llm_model", "chain", "agent_tools", "memory", "output"];

      function handleStreamEvent(ev) {
        if (ev.event === "stage") {
          const idx = stageOrder.indexOf(ev.stage);
          if (idx > 0) setNodeState(stageOrder[idx - 1], 'is-done');
          setNodeState(ev.stage, ev.stage === "output" ? 'is-done' : 'is-active');

          if (ev.stage === "llm_model" || ev.stage === "chain") {
            setMoeBridgeStage("router");
            applyStep(4, true); // Passo 5: MoE Router ativo no SVG principal
          } else if (ev.stage === "agent_tools") {
            setMoeBridgeStage("sum");
            const bridge = document.getElementById('lcToolsBridge');
            if (bridge) bridge.classList.remove('is-active');
          }

          progressFill.style.width = `${ev.pct || 0}%`;
          progressLabel.textContent = `${ev.pct || 0}% — ${ev.label}`;
          stepCounter.textContent = `${Math.max(1, idx + 1)} / 7 etapas`;
          appendTrace(ev.label, ev.stage, ev.detail, null);
        } else if (ev.event === "tool_start") {
          setNodeState("chain", "is-done");
          setNodeState("agent_tools", "is-active");
          setMoeBridgeStage("experts");
          const bridge = document.getElementById('lcToolsBridge');
          if (bridge) bridge.classList.add('is-active');

          setToolState(ev.category, "is-active");
          if (!state.activeMoeCategories.includes(ev.category)) {
            state.activeMoeCategories.push(ev.category);
          }
          renderFlowchart(); // Acende o Expert correspondente no diagrama MoE em tempo real!

          progressFill.style.width = `${Math.min(78, 52 + toolCount * 8)}%`;
          progressLabel.textContent = `Executando em tempo real: ${ev.tool}()...`;
          stepCounter.textContent = "5 / 7 etapas";
          appendTrace(
            `5. MoE Expert (${ev.category}) -> ${ev.tool}()`,
            "Executando agora",
            `Buscando apenas a informação solicitada via ${ev.tool}...`,
            `${ev.tool}(${JSON.stringify(ev.args)})`
          );
        } else if (ev.event === "tool_result") {
          toolCount++;
          setToolState(ev.category, "is-done");
          sourceCounter.textContent = `${toolCount} tool call(s)`;
          appendFoundCard(ev);
        } else if (ev.event === "output") {
          document.querySelectorAll('#agentMoeBridgeSteps .moe-chip').forEach(c => {
            c.classList.remove('is-active');
            c.classList.add('is-done');
          });
          traceList.querySelectorAll('.agent-trace-item').forEach(el => el.classList.add('is-done'));
          statusBadge.className = "agent-status-pill is-done";
          statusText.textContent = `Concluído (${toolCount} tool call(s) reais)`;
          progressLabel.textContent = `100% — Concluído em ${ev.duration_ms} ms`;
          aggregatorBox.style.display = "block";
          aggregatorContent.innerHTML = escapeXml(ev.final_answer || "").replace(/\n/g, "<br>");
          initKaTeX();
        } else if (ev.event === "error") {
          throw new Error(ev.detail || "Erro no stream LangChain");
        }
      }

      try {
        const resp = await fetch(`${API_BASE}/api/orchestrate/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, mode, session_id: "web-ui", model_name: modelName })
        });

        if (!resp.ok || !resp.body) {
          const errData = await resp.json().catch(() => ({ detail: resp.statusText }));
          throw new Error(errData.detail || `HTTP ${resp.status}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          for (const chunk of lines) {
            const dataLine = chunk.split("\n").find(l => l.startsWith("data: "));
            if (!dataLine) continue;
            const parsed = JSON.parse(dataLine.slice(6));
            handleStreamEvent(parsed);
          }
        }
      } catch (err) {
        statusBadge.className = "agent-status-pill";
        statusText.textContent = "Backend FastAPI offline ou erro";
        progressLabel.textContent = `Erro ao conectar em ${API_BASE}/api/orchestrate/stream`;
        appendTrace(
          "Backend FastAPI não acessível",
          API_BASE,
          `Não foi possível executar a busca real: ${err.message}. Inicie o servidor FastAPI do ai_orchestrator.`,
          `cd ai_orchestrator && .\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload`
        );
        aggregatorBox.style.display = "block";
        aggregatorContent.innerHTML = `<strong>Para ativar as buscas reais no backend:</strong><br>Execute no terminal:<br><code>cd ai_orchestrator</code><br><code>.\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload</code>`;
      }
    }

    btnRun.addEventListener('click', runRealOrchestratedSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runRealOrchestratedSearch();
      }
    });

    btnClear.addEventListener('click', () => {
      if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
      }
      searchInput.value = "";
      renderLangChainFlowSkeleton();
      traceList.innerHTML = '<div class="agent-empty-state">Digite um comando e clique em <strong>Buscar Real &amp; Animar</strong>.</div>';
      foundItems.innerHTML = '<div class="agent-empty-state">As chamadas de ferramentas reais aparecerão aqui.</div>';
      aggregatorBox.style.display = "none";
      progressFill.style.width = "0%";
      progressLabel.textContent = "0% — Aguardando início da busca";
      stepCounter.textContent = "0 / 7 etapas";
      sourceCounter.textContent = "0 tool calls";
      statusBadge.className = "agent-status-pill";
      statusText.textContent = "Pronto para buscar";
    });

    if (presetChips) {
      presetChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.agent-preset-chip');
        if (!chip) return;
        presetChips.querySelectorAll('.agent-preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        searchInput.value = chip.dataset.query || "";
        scenarioSelect.value = chip.dataset.scenario || "auto";
        runRealOrchestratedSearch();
      });
    }

    renderLangChainFlowSkeleton();
  }

  // ==================== 7. BUBBLE CHAT: DETETIVE JAKE PERALTA ====================
  function initJakePeraltaBubbleChat() {
    const fab = document.getElementById('jakeChatFab');
    const win = document.getElementById('jakeChatWindow');
    const closeBtn = document.getElementById('jakeChatCloseBtn');
    const form = document.getElementById('jakeChatForm');
    const input = document.getElementById('jakeChatInput');
    const sendBtn = document.getElementById('jakeChatSendBtn');
    const messagesEl = document.getElementById('jakeChatMessages');
    const quickPrompts = document.getElementById('jakeQuickPrompts');

    if (!fab || !win || !form || !input || !messagesEl) return;

    const API_BASE = "http://127.0.0.1:8001";

    function toggleChat(open) {
      if (open) {
        win.style.display = "flex";
        fab.style.display = "none";
        input.focus();
      } else {
        win.style.display = "none";
        fab.style.display = "flex";
      }
    }

    fab.addEventListener('click', () => toggleChat(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleChat(false));

    function appendUserBubble(text) {
      const div = document.createElement('div');
      div.className = 'jake-msg jake-msg-user';
      div.innerHTML = `<div class="jake-msg-bubble">${escapeXml(text)}</div>`;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function appendThinkingBubble() {
      const div = document.createElement('div');
      div.className = 'jake-msg jake-msg-bot';
      div.innerHTML = `
        <div class="jake-msg-bubble jake-thinking-bubble">
          <span>🕵️‍♂️ <strong>Jake Peralta está investigando</strong></span>
          <span class="jake-typing-dots"><span></span><span></span><span></span></span>
        </div>
      `;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    function formatJakeMarkdown(rawText) {
      return escapeXml(rawText || "")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\n/g, "<br>");
    }

    async function sendToJake(text) {
      const clean = (text || "").trim();
      if (!clean) return;

      appendUserBubble(clean);
      input.value = "";
      sendBtn.disabled = true;

      // Sincroniza o diagrama principal Transformer + MoE em segundo plano
      promptInput.value = clean;
      state.prompt = clean;
      state.activeMoeCategories = [];
      updatePromptStats();
      applyStep(4, true);

      const botDiv = appendThinkingBubble();

      try {
        const resp = await fetch(`${API_BASE}/api/orchestrate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: clean,
            mode: "auto",
            session_id: "jake-peralta-session",
            model_name: "openai/gpt-6.1-sol",
            persona: "jake_peralta"
          })
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ detail: resp.statusText }));
          throw new Error(err.detail || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const tools = data.tool_executions || [];
        state.activeMoeCategories = [...new Set(tools.map(t => t.category))];
        renderFlowchart();

        const pdfLinksHtml = tools
          .filter(t => t.tool === "gerar_pdf_relatorio" && t.result && t.result.arquivo)
          .map(t => {
            const fname = String(t.result.arquivo).split("/").pop();
            return `<div style="margin-top:0.55rem;"><a href="${API_BASE}/api/storage/download/${encodeURIComponent(fname)}" target="_blank" rel="noopener" class="btn btn-primary" style="padding:0.35rem 0.75rem;font-size:0.78rem;">📥 Baixar PDF (${escapeXml(fname)})</a></div>`;
          })
          .join("");

        const answerHtml = formatJakeMarkdown(data.final_answer);
        botDiv.innerHTML = `
          <div class="jake-msg-bubble">
            <div>${answerHtml}</div>
            ${pdfLinksHtml}
          </div>
        `;
      } catch (err) {
        botDiv.innerHTML = `
          <div class="jake-msg-bubble">
            <strong>Ops!</strong> Não consegui concluir a investigação agora (${escapeXml(err.message)}). Verifique se o servidor FastAPI está ativo.
          </div>
        `;
      } finally {
        sendBtn.disabled = false;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sendToJake(input.value);
    });

    if (quickPrompts) {
      quickPrompts.addEventListener('click', (e) => {
        const chip = e.target.closest('.jake-quick-chip');
        if (!chip) return;
        sendToJake(chip.dataset.msg || chip.textContent);
      });
    }
  }

  init();
  initAgentSearchScenario();
  initJakePeraltaBubbleChat();
});
