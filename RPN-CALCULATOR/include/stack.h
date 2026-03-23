#ifndef STACK_H
#define STACK_H

#include <stdio.h>

void push(double value);
double pop();
void print_stack();
void print_stack_file(FILE *f);
int get_stack_size();
double get_top_value();
void reset_stack();

#endif