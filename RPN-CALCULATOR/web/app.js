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

const state = {
  stack: [],
  tokens: [],
  index: 0,
  step: 0,
  started: false,
  finished: false,
  running: false,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isOperator(token) {
  return ["+", "-", "*", "/"].includes(token);
}

function isNumber(token) {
  return /^[-+]?\d+(\.\d+)?$/.test(token);
}

function setStatus(text, type) {
  statusBadge.textContent = text;
  statusBadge.className = `status ${type}`;
}

function addHistory(text) {
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

function setError(text) {
  errorMessage.textContent = text;
}

function renderStack(animatePush = false) {
  stackColumn.innerHTML = "";

  const view = [...state.stack].reverse();
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

function resetSimulationUi() {
  state.stack = [];
  state.tokens = [];
  state.index = 0;
  state.step = 0;
  state.started = false;
  state.finished = false;
  state.running = false;

  setStatus("Procesando...", "processing");
  clearError();
  clearHistory();
  renderStack(false);
  nextBtn.disabled = true;
}

function parseExpression(raw) {
  if (!raw.trim()) {
    throw new Error("Ingresa una expresión RPN.");
  }

  const parts = raw.trim().split(/\s+/);
  const endIndex = parts.indexOf("=");

  if (endIndex === -1) {
    return parts;
  }

  if (endIndex !== parts.length - 1) {
    throw new Error("El símbolo '=' debe ir al final.");
  }

  return parts.slice(0, endIndex);
}

function startSimulation() {
  resetSimulationUi();

  const tokens = parseExpression(expressionInput.value);
  state.tokens = tokens;
  state.started = true;

  addHistory("Paso 0: d(q0, ε, Z0) = (q0, Z0) · INICIO");
  setStatus("Procesando...", "processing");

  if (stepMode.checked) {
    nextBtn.disabled = false;
    addHistory("Modo paso a paso activado. Presiona 'Siguiente'.");
  }
}

function finishSimulation() {
  state.step += 1;

  if (state.stack.length === 1) {
    addHistory(`Paso ${state.step}: d(q0, ε, X Z0) = (q0, ε) · ACEPTACIÓN`);
    setStatus("Operación válida", "valid");
    clearError();
  } else if (state.stack.length === 0) {
    addHistory(`Paso ${state.step}: RECHAZO · pila vacía`);
    setStatus("Operación inválida", "invalid");
    setError("Expresión inválida: la pila quedó vacía al final.");
  } else {
    addHistory(`Paso ${state.step}: RECHAZO · sobran ${state.stack.length} símbolos X`);
    setStatus("Operación inválida", "invalid");
    setError(`Expresión inválida: sobran ${state.stack.length} operandos.`);
  }

  state.finished = true;
  state.running = false;
  nextBtn.disabled = true;
}

async function processNextToken() {
  if (!state.started || state.finished) {
    return;
  }

  if (state.index >= state.tokens.length) {
    finishSimulation();
    return;
  }

  const token = state.tokens[state.index];
  state.index += 1;
  state.step += 1;

  if (isNumber(token)) {
    const wasEmpty = state.stack.length === 0;
    state.stack.push("X");

    const transition = wasEmpty
      ? `d(q0, ${token}, Z0) = (q0, X Z0)`
      : `d(q0, ${token}, X) = (q0, XX)`;

    addHistory(`Paso ${state.step}: ${transition} · TRANSICIÓN DE OPERANDO`);
    renderStack(true);
    return;
  }

  if (isOperator(token)) {
    if (state.stack.length < 2) {
      addHistory(`Paso ${state.step}: ERROR · faltan operandos para '${token}'`);
      setStatus("Operación inválida", "invalid");
      setError(`Expresión inválida: faltan operandos para '${token}'.`);
      state.finished = true;
      state.running = false;
      nextBtn.disabled = true;
      return;
    }

    triggerPopAnimation();
    state.stack.pop();
    state.stack.pop();
    state.stack.push("X");

    addHistory(`Paso ${state.step}: d(q0, ${token}, XX) = (q0, X) · TRANSICIÓN DE OPERADOR`);
    renderStack(true);
    return;
  }

  addHistory(`Paso ${state.step}: ERROR · símbolo inválido '${token}'`);
  setStatus("Operación inválida", "invalid");
  setError(`Símbolo inválido: '${token}'.`);
  state.finished = true;
  state.running = false;
  nextBtn.disabled = true;
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
    setStatus("Operación inválida", "invalid");
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
