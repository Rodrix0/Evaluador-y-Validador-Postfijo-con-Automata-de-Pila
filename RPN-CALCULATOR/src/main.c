#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "../include/stack.h"
#include "../include/utils.h"

static void limpiar_buffer_entrada(void) {
    int c;
    while ((c = getchar()) != '\n' && c != EOF) {
    }
}

static void limpiar_nueva_linea(char *texto) {
    size_t len = strlen(texto);
    if (len > 0 && texto[len - 1] == '\n') {
        texto[len - 1] = '\0';
    }
}

static void mostrar_banner(void) {
    printf("\n===============================================\n");
    printf("   AUTOMATA DE PILA PURO PARA RPN\n");
    printf("===============================================\n");
}

static void mostrar_menu(void) {
    mostrar_banner();
    printf("[1] Modo consola interactivo (pila en vivo)\n");
    printf("[2] Modo archivo\n");
    printf("[3] Ver ayuda rapida\n");
    printf("[4] Salir\n");
    printf("-----------------------------------------------\n");
}

static void mostrar_ayuda(void) {
    printf("\nAYUDA RAPIDA\n");
    printf("- Ingrese tokens separados por espacios.\n");
    printf("- Operadores validos: +  -  *  /\n");
    printf("- Finalice con '='\n");
    printf("- Ejemplo: 5 3 + 2 * =\n");
    printf("- El APD solo ACEPTA o RECHAZA (no calcula resultado numerico)\n");
    printf("- Se generan archivos 'resultado_*.txt' y 'evolucion_*.txt'\n\n");
}

static int evaluar_tokens(FILE *entrada, int es_consola, FILE *f_res, FILE *f_evo) {
    char transicion[300];
    char descripcion[300];
    char token[50];
    int paso = 0;

    fprintf(f_evo, "%-4s | %-35s | %-25s | %s\n", "PASO", "TRANSICION", "DESCRIPCION", "PILA");
    fprintf(f_evo, "-----|-------------------------------------|---------------------------|------------------\n");
    fprintf(f_evo, "%-4d | %-35s | %-25s | Z0 ", paso, "d(q0, e, Z0) = (q0, Z0)", "INICIO");
    print_stack_file(f_evo);
    fprintf(f_evo, "\n");

    while (1) {
        if (es_consola) {
            printf("> ");
        }

        if (fscanf(entrada, "%49s", token) != 1) {
            break;
        }

        if (strcmp(token, "=") == 0) {
            break;
        }

        paso++;

        if (is_operator(token)) {
            if (get_stack_size() < 2) {
                fprintf(f_evo, "%-4d | %-35s | %-25s | ERROR: Stack Underflow\n", paso, "ERROR", "Faltan operandos");
                fprintf(f_res, "RECHAZADA: faltan operandos para aplicar '%s'.", token);
                return 1;
            }

            pop();
            pop();

            if (strcmp(token, "+") == 0) {
                sprintf(transicion, "d(q0, +, XX) = (q0, X)");
            } else if (strcmp(token, "-") == 0) {
                sprintf(transicion, "d(q0, -, XX) = (q0, X)");
            } else if (strcmp(token, "*") == 0) {
                sprintf(transicion, "d(q0, *, XX) = (q0, X)");
            } else if (strcmp(token, "/") == 0) {
                sprintf(transicion, "d(q0, /, XX) = (q0, X)");
            }

            sprintf(descripcion, "TRANSICION DE OPERADOR");
            push(1.0);
        } else {
            char *endptr;
            strtod(token, &endptr);

            if (*endptr != '\0') {
                fprintf(f_evo, "%-4d | %-35s | %-25s | ERROR: Token invalido\n", paso, "ERROR", "Simbolo no reconocido");
                fprintf(f_res, "RECHAZADA: simbolo invalido '%s'.", token);
                return 1;
            }

            if (get_stack_size() == 0) {
                sprintf(transicion, "d(q0, %s, Z0) = (q0, X Z0)", token);
            } else {
                sprintf(transicion, "d(q0, %s, X) = (q0, XX)", token);
            }

            sprintf(descripcion, "TRANSICION DE OPERANDO");
            push(1.0);
        }

        fprintf(f_evo, "%-4d | %-35s | %-25s | Z0 ", paso, transicion, descripcion);
        print_stack_file(f_evo);
        fprintf(f_evo, "\n");

        if (es_consola) {
            print_stack();
        }
    }

    paso++;
    int size = get_stack_size();

    if (size == 1) {
        fprintf(f_res, "ACEPTADA: la expresion pertenece al lenguaje reconocido por el APD.");
        fprintf(f_evo, "%-4d | %-35s | %-25s | Z0 ", paso, "d(q0, e, X Z0) = (q0, e)", "ACEPTACION");
        print_stack_file(f_evo);
        fprintf(f_evo, "\n");
        return 0;
    }

    if (size == 0) {
        fprintf(f_res, "RECHAZADA: pila vacia al finalizar.");
        fprintf(f_evo, "%-4d | %-35s | %-25s | RECHAZO: Pila vacia\n", paso, "RECHAZO", "Falta Z0");
        return 1;
    }

    fprintf(f_res, "RECHAZADA: expresion incompleta (sobran %d operandos).", size);
    fprintf(f_evo, "%-4d | %-35s | %-25s | RECHAZO: Sobran numeros\n", paso, "RECHAZO", "Pila sucia");
    return 1;
}

int modo_archivo(const char *nombre_entrada) {
    char nombre_res[300];
    char nombre_evo[300];

    sprintf(nombre_res, "resultado_%s", nombre_entrada);
    sprintf(nombre_evo, "evolucion_%s", nombre_entrada);

    FILE *f_entrada = fopen(nombre_entrada, "r");
    if (f_entrada == NULL) {
        printf("ERROR: No se pudo abrir el archivo %s\n", nombre_entrada);
        return 1;
    }

    FILE *f_res = fopen(nombre_res, "w");
    FILE *f_evo = fopen(nombre_evo, "w");

    if (f_res == NULL || f_evo == NULL) {
        printf("ERROR: No se pudieron crear archivos de salida.\n");
        fclose(f_entrada);
        if (f_res != NULL) fclose(f_res);
        if (f_evo != NULL) fclose(f_evo);
        return 1;
    }

    reset_stack();
    int estado = evaluar_tokens(f_entrada, 0, f_res, f_evo);

    if (estado == 0) {
        printf("Exito. Archivos generados:\n -> %s\n -> %s\n", nombre_res, nombre_evo);
    } else {
        printf("Operacion rechazada. Revise:\n -> %s\n -> %s\n", nombre_res, nombre_evo);
    }

    fclose(f_entrada);
    fclose(f_res);
    fclose(f_evo);
    return estado;
}

int modo_consola(void) {
    srand((unsigned int)time(NULL));
    int id = rand() % 10000;

    char nombre_res[100];
    char nombre_evo[100];
    sprintf(nombre_res, "resultado_manual_%d.txt", id);
    sprintf(nombre_evo, "evolucion_manual_%d.txt", id);

    FILE *f_res = fopen(nombre_res, "w");
    FILE *f_evo = fopen(nombre_evo, "w");

    if (f_res == NULL || f_evo == NULL) {
        printf("ERROR: No se pudieron crear archivos de salida.\n");
        if (f_res != NULL) fclose(f_res);
        if (f_evo != NULL) fclose(f_evo);
        return 1;
    }

    printf("\n------ MODO CONSOLA (APD PURO) ------\n");
    printf("Ingrese cadena token por token y '=' para terminar.\n");
    printf("Ejemplo: 5 3 + 2 * =\n");
    printf("--------------------------\n");

    reset_stack();
    int estado = evaluar_tokens(stdin, 1, f_res, f_evo);

    if (estado == 0) {
        printf("\nExito. Archivos generados:\n -> %s\n -> %s\n", nombre_res, nombre_evo);
    } else {
        printf("\nOperacion rechazada. Revise:\n -> %s\n -> %s\n", nombre_res, nombre_evo);
    }

    fclose(f_res);
    fclose(f_evo);
    return estado;
}

int main(int argc, char *argv[]) {
    if (argc > 1) {
        return modo_archivo(argv[1]);
    }

    while (1) {
        int opcion;
        char nombre_entrada[260];

        mostrar_menu();
        printf("Seleccione una opcion: ");

        if (scanf("%d", &opcion) != 1) {
            printf("Entrada invalida. Ingrese un numero.\n");
            limpiar_buffer_entrada();
            continue;
        }

        limpiar_buffer_entrada();

        if (opcion == 1) {
            modo_consola();
        } else if (opcion == 2) {
            printf("Ingrese nombre de archivo de entrada: ");
            if (fgets(nombre_entrada, sizeof(nombre_entrada), stdin) == NULL) {
                printf("No se pudo leer el nombre del archivo.\n");
                continue;
            }

            limpiar_nueva_linea(nombre_entrada);

            if (strlen(nombre_entrada) == 0) {
                printf("Nombre de archivo vacio.\n");
                continue;
            }

            modo_archivo(nombre_entrada);
        } else if (opcion == 3) {
            mostrar_ayuda();
        } else if (opcion == 4) {
            printf("Hasta luego.\n");
            break;
        } else {
            printf("Opcion no valida.\n");
        }
    }

    return 0;
}