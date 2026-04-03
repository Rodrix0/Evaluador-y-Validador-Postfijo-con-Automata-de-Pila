# APD Formal para RPN (Version Lista para Entregar)

## 1. Definicion formal del automata

Sea el automata de pila determinista:

M = (Q, Σ, Γ, δ, q0, Z0, F)

- Q = { q0, q_op_pop2, q_op_push, q_end_check, q_accept }
- Σ = { NUM, OP, ⊣ }
- Γ = { Z0, X }
- q0 = q0
- Z0 = simbolo inicial de pila
- F = { q_accept }

Interpretacion:
- NUM representa cualquier operando numerico valido.
- OP representa cualquier operador binario valido de { +, -, *, / }.
- ⊣ representa fin de cadena.

## 2. Funcion de transicion δ

Notacion usada (estilo JFLAP):
- entrada, tope; reemplazo
- λ significa epsilon (sin consumir simbolo de entrada o sin apilar nada).

Reglas:

1) q0 -> q0 [NUM, Z0; Z0X]
2) q0 -> q0 [NUM, X; XX]
3) q0 -> q_op_pop2 [OP, X; λ]
4) q_op_pop2 -> q_op_push [λ, X; λ]
5) q_op_push -> q0 [λ, Z0; Z0X]
6) q_op_push -> q0 [λ, X; XX]
7) q0 -> q_end_check [⊣, X; λ]
8) q_end_check -> q_accept [λ, Z0; Z0]

## 3. Criterio de aceptacion

La cadena se acepta solo si, tras consumir la entrada y aplicar movimientos λ, el automata alcanza el estado final q_accept.

## 4. Lenguaje reconocido

Este APD reconoce expresiones postfijas bien formadas con operadores binarios.

Condicion estructural equivalente:
- Si hay n operandos, debe haber n - 1 operadores.
- Nunca puede aplicarse un operador si faltan operandos en la pila.

## 5. Ejecucion paso a paso (cadena valida)

Cadena de ejemplo:

5 3 + 2 * =

Cadena interna procesada por el APD:

5 3 + 2 * ⊣

Configuracion: (estado, entrada_restante, pila)

Paso 0:
- (q0, 5 3 + 2 * ⊣, Z0)

Paso 1:
- q0 -> q0 [5, Z0; Z0X]
- (q0, 3 + 2 * ⊣, Z0 X)

Paso 2:
- q0 -> q0 [3, X; XX]
- (q0, + 2 * ⊣, Z0 X X)

Paso 3:
- q0 -> q_op_pop2 [+, X; λ]
- (q_op_pop2, 2 * ⊣, Z0 X)

Paso 4:
- q_op_pop2 -> q_op_push [λ, X; λ]
- (q_op_push, 2 * ⊣, Z0)

Paso 5:
- q_op_push -> q0 [λ, Z0; Z0X]
- (q0, 2 * ⊣, Z0 X)

Paso 6:
- q0 -> q0 [2, X; XX]
- (q0, * ⊣, Z0 X X)

Paso 7:
- q0 -> q_op_pop2 [*, X; λ]
- (q_op_pop2, ⊣, Z0 X)

Paso 8:
- q_op_pop2 -> q_op_push [λ, X; λ]
- (q_op_push, ⊣, Z0)

Paso 9:
- q_op_push -> q0 [λ, Z0; Z0X]
- (q0, ⊣, Z0 X)

Paso 10:
- q0 -> q_end_check [⊣, X; λ]
- (q_end_check, λ, Z0)

Paso 11:
- q_end_check -> q_accept [λ, Z0; Z0]
- (q_accept, λ, Z0)

Resultado:
- CADENA ACEPTADA.

## 6. Correspondencia con implementacion

- Simulador web: RPN-CALCULATOR/web/app.js
- Visualizacion y estilo: RPN-CALCULATOR/web/index.html, RPN-CALCULATOR/web/styles.css
- El grafo mostrado resalta en color las transiciones realmente usadas por cada cadena aceptada.
