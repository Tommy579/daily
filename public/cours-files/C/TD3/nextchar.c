#include <stdio.h>

char nextChar(char c){
    return c + 1;
}

int main(int argc, char *argv[]) {
    char depart = 'A';
    char next = nextChar(depart);

    printf("En char, le caractère suivant %c est %c \n", depart, next);
    printf("En deci, le caractère suivant %d est %d \n", depart, next);


    short int nombre = 67;

    printf("En char, le caractère %d est %c \n", nombre, nombre);
    printf("En deci, le caractère %d est %d \n", nombre, nombre);
}
