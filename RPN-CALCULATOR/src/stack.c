#include <stdio.h>
#include <stdlib.h>
#include "../include/stack.h"
#include "../include/utils.h"

#define MAX_STACK_SIZE 100

static double stack[MAX_STACK_SIZE];
static int top = -1;

void push(double value) {
    if (top >= MAX_STACK_SIZE - 1) {
        printf("ERROR FATAL: Desbordamiento de pila.\n");
        exit(1);
    }
    top++;
    stack[top] = value;
}

double pop() {
    if (top < 0) {
        printf("ERROR FATAL: Faltan operandos en la pila.\n");
        exit(1);
    }
    double value = stack[top];
    top--;
    return value;
}

void print_stack() {
    printf("   [ Pila: ");
    if (top == -1) {
        printf("vacia ");
    } else {
        for (int j = 0; j <= top; j++) {
            printf("X ");
        }
    }
    printf("] <\n");
}

void print_stack_file(FILE *f) {
    fprintf(f, "[ ");
    if (top == -1) {
        fprintf(f, "vacia ");
    } else {
        for (int j = 0; j <= top; j++) {
            fprintf(f, "X ");
        }
    }
    fprintf(f, "]");
}

int get_stack_size() {
    return top + 1;
}

double get_top_value() {
    if (top >= 0) return stack[top];
    return 0.0;
}

void reset_stack() {
    top = -1;
}