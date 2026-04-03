const expressionInput = document.getElementById("expressionInput");
const runBtn = document.getElementById("runBtn");
const nextBtn = document.getElementById("nextBtn");
const resetBtn = document.getElementById("resetBtn");
const stepMode = document.getElementById("stepMode");
const themeToggle = document.getElementById("themeToggle");
const statusBadge = document.getElementById("statusBadge");
const errorMessage = document.getElementById("errorMessage");
const stackColumn = document.getElementById("stackColumn");
const historyList = document.getElementById("historyList");
const popGhost = document.getElementById("popGhost");
const graphContainer = document.getElementById("graphContainer");
const graphHint = document.getElementById("graphHint");
let cy = null;

const EPSILON = "ε";//sin leer entrada
const END_MARKER = "⊣"; //fin
const LAMBDA_SYMBOL = "λ";//para mostrar en lugar de ε

const state = {
  stack: [],
  tokens: [],
  index: 0,
  step: 0,
  started: false,
  finished: false,
  running: false,
  pdaState: "q0",
  trace: [],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pdaDefinition = {// Definición formal del APD para el lenguaje RPN
  Q: ["q0", "q_op_pop2", "q_op_push", "q_end_check", "q_accept"],
  Sigma: ["NUM", "OP", END_MARKER],
  Gamma: ["Z0", "X"],
  q0: "q0",
  Z0: "Z0",
  F: ["q_accept"],
};

const transitions = [// Transiciones de lectura de operandos
  {
    id: "t_num_z0",
    from: "q0",
    input: "NUM",
    top: "Z0",
    to: "q0",
    pop: true,
    push: ["Z0", "X"],// Se mantiene Z0 y se agrega X para representar el operando
    description: "TRANSICION DE OPERANDO",
  },
  {
    id: "t_num_x",// Transición para leer un operando cuando ya hay otro en la pila (para manejar múltiples operandos)
    from: "q0",
    input: "NUM",// Si el tope es X, se mantiene el X actual y se agrega otro X para representar el nuevo operando
    top: "X",
    to: "q0",
    pop: true,
    push: ["X", "X"],// Se mantiene el X actual y se agrega otro X para representar el nuevo operando
    description: "TRANSICION DE OPERANDO",
  },
  {
    id: "t_op_first",// Transición para leer un operador, que requiere hacer pop de dos operandos (dos X) y luego push del resultado (un X)
    from: "q0",
    input: "OP",
    top: "X",
    to: "q_op_pop2",
    pop: true,
    push: [],
    description: "OPERADOR: PRIMER POP",
  },
  {
    id: "t_op_second",// Segunda transición para el mismo operador, que requiere hacer pop del segundo operando (otro X) sin consumir entrada adicional, y luego push del resultado (un X)
    from: "q_op_pop2",
    input: EPSILON,// No se consume entrada adicional para el segundo pop, solo se verifica que el tope sea X y se hace pop sin push inmediato
    top: "X",
    to: "q_op_push",
    pop: true,
    push: [],
    description: "OPERADOR: SEGUNDO POP",
  },
  {
    id: "t_push_z0",// Transición para hacer push del resultado del operador, que se representa como un nuevo X en la pila. Si el tope era Z0, se mantiene Z0 y se agrega el nuevo X.
    from: "q_op_push",
    input: EPSILON,
    top: "Z0",
    to: "q0",
    pop: true,
    push: ["Z0", "X"],// Se mantiene Z0 y se agrega un nuevo X para representar el resultado del operador
    description: "OPERADOR: PUSH RESULTANTE",
  },
  {
    id: "t_push_x",
    from: "q_op_push",
    input: EPSILON,
    top: "X",
    to: "q0",
    pop: true,
    push: ["X", "X"],// Se mantiene el X actual y se agrega otro X para representar el nuevo operando
    description: "OPERADOR: PUSH RESULTANTE",
  },
  {
    id: "t_end",
    from: "q0",
    input: END_MARKER,
    top: "X",
    to: "q_end_check",
    pop: true,
    push: [],
    description: "CIERRE: VERIFICACION FINAL",
  },
  {
    id: "t_accept",
    from: "q_end_check",
    input: EPSILON,
    top: "Z0",
    to: "q_accept",
    pop: false,
    push: [],
    description: "ACEPTACION FORMAL",
  },
];

const graphNodes = {
  q0: { x: 120, y: 125, label: "q0" },
  q_op_pop2: { x: 340, y: 125, label: "q1" },
  q_op_push: { x: 560, y: 125, label: "q2" },
  q_end_check: { x: 340, y: 260, label: "q3" },
  q_accept: { x: 560, y: 260, label: "q4" },
};

const graphEdges = [
  {
    ids: ["t_num_z0", "t_num_x"],
    source: "q0",
    target: "q0",
    label: "NUM, Z0; Z0X | NUM, X; XX",
  },
  { ids: ["t_op_first"], source: "q0", target: "q_op_pop2", label: "OP, X; λ" },
  { ids: ["t_op_second"], source: "q_op_pop2", target: "q_op_push", label: "λ, X; λ" },
  {
    ids: ["t_push_z0", "t_push_x"],
    source: "q_op_push",
    target: "q0",
    label: "λ, Z0; Z0X | λ, X; XX",
  },
  { ids: ["t_end"], source: "q0", target: "q_end_check", label: "⊣, X; λ" },
  { ids: ["t_accept"], source: "q_end_check", target: "q_accept", label: "λ, Z0; Z0" },
];

function isOperator(token) {
  return ["+", "-", "*", "/"].includes(token);
}

function isNumber(token) {
  return /^[-+]?\d+(\.\d+)?$/.test(token);// Expresión regular para validar números enteros y decimales, con signo opcional
}

function setStatus(text, type) {
  statusBadge.textContent = text;
  statusBadge.className = `status ${type}`;// Elimina clases previas y agrega la clase correspondiente al nuevo estado
}

function addHistory(text) {// Agrega una nueva entrada al historial de pasos, desplazando hacia abajo si es necesario para mostrar la última entrada
  const li = document.createElement("li");
  li.textContent = text;
  historyList.appendChild(li);
  historyList.scrollTop = historyList.scrollHeight;
}

function clearHistory() {
  historyList.innerHTML = "";
}

function clearError() {
  errorMessage.textContent = "";
}

function setError(text) {// Muestra un mensaje de error debajo del estado, indicando la razón del rechazo o el problema encontrado durante la simulación
  errorMessage.textContent = text;
}

function clearExecutionGraph(message) {
  if (!graphContainer || !graphHint) {
    return;
  }
  if (cy) {
    cy.destroy();
    cy = null;
  }
  graphContainer.innerHTML = "";
  graphHint.textContent = message;
}

function renderExecutionGraph() {
  if (!graphContainer || !graphHint || typeof cytoscape === "undefined") {
    if (graphHint) {
      graphHint.textContent = "No se pudo cargar Cytoscape.js para dibujar el grafo.";
    }
    return;
  }

  const usedCounts = new Map();
  for (const edgeId of state.trace) {
    usedCounts.set(edgeId, (usedCounts.get(edgeId) || 0) + 1);
  }

  if (cy) {
    cy.destroy();
  }

  const elements = [];

  elements.push({
    data: { id: "start", label: "" },
    position: { x: 45, y: 125 },
    classes: "start-marker",
  });

  Object.entries(graphNodes).forEach(([id, node]) => {
    elements.push({
      data: { id, label: node.label },
      position: { x: node.x, y: node.y },
      classes: id === "q_accept" ? "accept" : "",
    });
  });

  elements.push({
    data: { id: "start_to_q0", source: "start", target: "q0", label: "" },
    classes: "base-edge",
  });

  graphEdges.forEach((edge, idx) => {
    const count = edge.ids.reduce((acc, id) => acc + (usedCounts.get(id) || 0), 0);
    const usedClass = count > 0 ? "used-edge" : "base-edge";
    const countSuffix = count > 0 ? ` (x${count})` : "";
    elements.push({
      data: {
        id: `edge_${idx}`,
        source: edge.source,
        target: edge.target,
        label: `${edge.label}${countSuffix}`,
      },
      classes: usedClass,
    });
  });

  cy = cytoscape({
    container: graphContainer,
    elements,
    layout: { name: "preset" },
    userZoomingEnabled: true,
    userPanningEnabled: true,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "#f4f08a",
          "border-width": 2,
          "border-color": "#111",
          label: "data(label)",
          color: "#111",
          "font-size": 15,
          "font-weight": 700,
          "text-valign": "center",
          "text-halign": "center",
          width: 52,
          height: 52,
        },
      },
      {
        selector: "node.accept",
        style: {
          "border-width": 5,
        },
      },
      {
        selector: "node.start-marker",
        style: {
          shape: "triangle",
          width: 24,
          height: 24,
          "background-opacity": 0,
          "border-color": "#111",
          "border-width": 2,
          label: "",
        },
      },
      {
        selector: "edge",
        style: {
          width: 2.3,
          "line-color": "#151515",
          "target-arrow-color": "#151515",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          label: "data(label)",
          "font-size": 11,
          "font-weight": 700,
          color: "#111",
          "text-rotation": "autorotate",
          "text-margin-y": -8,
        },
      },
      {
        selector: "edge[source = 'q0'][target = 'q0']",
        style: {
          "curve-style": "unbundled-bezier",
          "control-point-distances": "-70 -70",
          "control-point-weights": "0.25 0.75",
        },
      },
      {
        selector: "edge[source = 'q_op_push'][target = 'q0']",
        style: {
          "curve-style": "unbundled-bezier",
          "control-point-distances": "-70 -40",
          "control-point-weights": "0.3 0.7",
        },
      },
      {
        selector: "edge.base-edge",
        style: {
          "line-color": "#151515",
          "target-arrow-color": "#151515",
          color: "#111",
        },
      },
      {
        selector: "edge.used-edge",
        style: {
          width: 3.2,
          "line-color": "#d35300",
          "target-arrow-color": "#d35300",
          color: "#b64200",
        },
      },
    ],
  });

  graphHint.textContent = "Grafo estilo JFLAP: aristas naranjas indican el recorrido real de la cadena.";
}

function renderStack(animatePush = false) {// Renderiza visualmente el contenido de la pila en la columna lateral, mostrando cada elemento como un bloque apilado. Si animatePush es true, se aplica una animación especial al bloque que acaba de ser agregado.
  stackColumn.innerHTML = "";

  const view = state.stack.filter((s) => s !== "Z0").reverse();
  view.forEach((_, i) => {
    const block = document.createElement("div");
    block.className = "stack-item";
    block.textContent = "X";

    if (i === 0) {
      block.classList.add("top");
      if (animatePush) {
        block.classList.add("push");
      }
    }

    stackColumn.appendChild(block);
  });
}

function triggerPopAnimation() {
  popGhost.classList.remove("show");
  void popGhost.offsetWidth;
  popGhost.classList.add("show");
}

function resetSimulationUi() {// Reinicia el estado de la simulación y actualiza la interfaz para reflejar el estado inicial, listo para procesar una nueva cadena ingresada por el usuario
  state.stack = [pdaDefinition.Z0];
  state.tokens = [];
  state.index = 0;
  state.step = 0;
  state.started = false;
  state.finished = false;
  state.running = false;
  state.pdaState = pdaDefinition.q0;
  state.trace = [];

  setStatus("Procesando...", "processing");
  clearError();
  clearHistory();
  renderStack(false);
  clearExecutionGraph("Ejecuta una cadena valida para generar el grafico del camino recorrido.");
  nextBtn.disabled = true;
}

function parseExpression(raw) {// Toma la cadena de entrada del usuario, valida que no esté vacía, y la divide en tokens separados por espacios. Si encuentra el símbolo de fin '=', verifica que esté al final de la cadena y lo excluye de los tokens procesados. Si la cadena es válida, devuelve un array de tokens para ser procesados por el simulador del APD.
  if (!raw.trim()) {
    throw new Error("Ingresa una expresion RPN.");
  }

  const parts = raw.trim().split(/\s+/);
  const endIndex = parts.indexOf("=");

  if (endIndex === -1) {
    return parts;
  }

  if (endIndex !== parts.length - 1) {
    throw new Error("El simbolo '=' debe ir al final.");
  }

  return parts.slice(0, endIndex);
}

function classifyToken(token) {// Clasifica un token de entrada como "NUM" si es un número válido, "OP" si es un operador reconocido, "END_MARKER" si es el símbolo de fin, o "INVALID" si no coincide con ninguna categoría válida. Esta función se utiliza para determinar cómo procesar cada token durante la simulación del APD.
  if (token === END_MARKER) {
    return END_MARKER;
  }
  if (isNumber(token)) {
    return "NUM";
  }
  if (isOperator(token)) {
    return "OP";
  }
  return "INVALID";
}

function getStackTop() {
  return state.stack[state.stack.length - 1];
}

function formatRemainingInput() {
  return state.tokens.slice(state.index).join(" ") || EPSILON;
}

function formatStackForConfig() {
  return state.stack.length ? state.stack.join(" ") : EPSILON;
}

function applyStackAction(transition) {// Aplica la acción de pila definida por una transición del APD: si transition.pop es true, hace pop del elemento en la cima de la pila; luego hace push de los símbolos definidos en transition.push (en orden). Devuelve el símbolo que estaba en la cima de la pila antes de aplicar la acción, para ser utilizado en la descripción de la transición.
  const previousTop = getStackTop();
  if (transition.pop) {
    state.stack.pop();
  }
  for (const symbol of transition.push) {
    state.stack.push(symbol);
  }
  return previousTop;
}

function findTransition(inputSymbol, topSymbol) {// Busca una transición válida en el estado actual del APD que coincida con el símbolo de entrada y el símbolo en la cima de la pila. Devuelve la transición encontrada o undefined si no existe una transición válida para la configuración actual.
  return transitions.find(
    (t) => t.from === state.pdaState && t.input === inputSymbol && t.top === topSymbol,
  );
}

function renderTransitionLabel(transition, consumedLexeme, previousTop) {
  const shownInput = transition.input === "NUM" || transition.input === "OP"
    ? consumedLexeme
    : transition.input;
  const shownInputSymbol = shownInput === EPSILON ? LAMBDA_SYMBOL : shownInput;
  const pushed = transition.push.length ? transition.push.slice().reverse().join("") : LAMBDA_SYMBOL;

  return `${transition.from} -> ${transition.to} [${shownInputSymbol}, ${previousTop}; ${pushed}]`;
}

function rejectWith(message) {
  setStatus("Operacion invalida", "invalid");
  setError(message);
  clearExecutionGraph("No se genero grafico: la cadena fue rechazada.");
  state.finished = true;
  state.running = false;
  nextBtn.disabled = true;
}

function acceptSimulation() {
  setStatus("Operacion valida", "valid");
  clearError();
  renderExecutionGraph();
  state.finished = true;
  state.running = false;
  nextBtn.disabled = true;
}

function tryRunEpsilonTransition() {// Intenta ejecutar una transición epsilon (que no consume entrada) desde el estado actual. Si encuentra una transición válida, la ejecuta y actualiza el estado del APD en consecuencia, incluyendo la pila, el estado actual, y el historial de pasos. Devuelve true si se ejecutó una transición epsilon, o false si no se encontró ninguna transición epsilon válida.
  const top = getStackTop();
  const transition = findTransition(EPSILON, top);
  if (!transition) {
    return false;
  }

  state.step += 1;
  const previousTop = applyStackAction(transition);
  state.trace.push(transition.id);
  state.pdaState = transition.to;

  const label = renderTransitionLabel(transition, EPSILON, previousTop);
  addHistory(
    `Paso ${state.step}: ${label} · ${transition.description} · Configuracion (${state.pdaState}, ${formatRemainingInput()}, ${formatStackForConfig()})`,
  );
  renderStack(transition.push.includes("X"));

  if (state.pdaState === "q_accept") {
    addHistory(`Paso ${state.step}: CADENA ACEPTADA POR ESTADO FINAL`);
    acceptSimulation();
  }

  return true;
}

function startSimulation() {
  resetSimulationUi();

  const tokens = parseExpression(expressionInput.value);
  state.tokens = [...tokens, END_MARKER];
  state.started = true;

  addHistory(
    `Paso 0: Configuracion inicial (${state.pdaState}, ${formatRemainingInput()}, ${formatStackForConfig()})`,
  );
  setStatus("Procesando...", "processing");

  if (stepMode.checked) {
    nextBtn.disabled = false;
    addHistory("Modo paso a paso activado. Presiona 'Siguiente'.");
  }
}

function finishSimulation() {
  if (state.pdaState === "q_accept") {
    acceptSimulation();
    return;
  }

  rejectWith("Expresion invalida: no existe transicion de aceptacion valida.");
}

async function processNextToken() {// Procesa el siguiente token de entrada en la simulación del APD. Primero intenta ejecutar cualquier transición epsilon disponible, luego procesa el token actual si no se han terminado los tokens de entrada. Si el token es inválido o no existe una transición válida para la configuración actual, rechaza la cadena con un mensaje de error específico. Si se ejecuta una transición válida, actualiza el estado del APD y el historial de pasos en consecuencia. Si se llega al final de los tokens sin aceptar la cadena, llama a finishSimulation para determinar el resultado final.
  if (!state.started || state.finished) {
    return;
  }

  if (tryRunEpsilonTransition()) {// Si se ejecutó una transición epsilon, no se consume un token de entrada en este paso, por lo que se vuelve a intentar procesar el mismo token actual en la siguiente iteración. Esto permite manejar
    return;
  }

  if (state.index >= state.tokens.length) {
    finishSimulation();
    return;
  }

  const token = state.tokens[state.index];
  const tokenClass = classifyToken(token);

  if (tokenClass === "INVALID") {
    state.step += 1;
    addHistory(`Paso ${state.step}: ERROR · simbolo invalido '${token}'`);
    rejectWith(`Simbolo invalido: '${token}'.`);
    return;
  }

  const top = getStackTop();
  const transition = findTransition(tokenClass, top);

  if (!transition) {
    state.step += 1;
    addHistory(`Paso ${state.step}: ERROR · sin transicion para (${state.pdaState}, ${token}, ${top})`);

    if (tokenClass === "OP") {
      rejectWith(`Expresion invalida: faltan operandos para '${token}'.`);
    } else if (tokenClass === END_MARKER) {
      rejectWith("Expresion invalida: la cadena no puede cerrarse en un estado de aceptacion.");
    } else {
      rejectWith("Expresion invalida: no existe transicion valida para el operando ingresado.");
    }
    return;
  }

  state.step += 1;
  if (tokenClass === "OP") {
    triggerPopAnimation();
  }

  const previousTop = applyStackAction(transition);
  state.trace.push(transition.id);
  state.index += 1;
  state.pdaState = transition.to;

  const label = renderTransitionLabel(transition, token, previousTop);
  addHistory(
    `Paso ${state.step}: ${label} · ${transition.description} · Configuracion (${state.pdaState}, ${formatRemainingInput()}, ${formatStackForConfig()})`,
  );
  renderStack(transition.push.includes("X"));

  if (state.pdaState === "q_accept") {
    addHistory(`Paso ${state.step}: CADENA ACEPTADA POR ESTADO FINAL`);
    acceptSimulation();
  }
}

async function runAuto() {
  if (state.running) {
    return;
  }

  state.running = true;

  while (!state.finished) {
    await processNextToken();
    if (!state.finished) {
      await sleep(550);
    }
  }

  state.running = false;
}

runBtn.addEventListener("click", async () => {
  try {
    startSimulation();

    if (!stepMode.checked) {
      nextBtn.disabled = true;
      await runAuto();
    }
  } catch (error) {
    setStatus("Operacion invalida", "invalid");
    setError(error.message);
  }
});

nextBtn.addEventListener("click", async () => {
  if (!state.started) {
    return;
  }

  await processNextToken();
});

resetBtn.addEventListener("click", () => {
  resetSimulationUi();
  expressionInput.focus();
});

themeToggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme");
  document.body.setAttribute("data-theme", current === "dark" ? "light" : "dark");
});

expressionInput.value = "5 3 + 2 * =";
resetSimulationUi();
