#include <stdio.h>

#define MAXVAL 1000

int currentval = 50;

void say_welcome(void);
void square(int var);


int main(int argc, char *argv[]) {
    int x;
    int y;
    say_welcome();
    printf("\n");
    x = 10;
    y = 10;
    printf("the square of %d is ", y);
    square(y);
    printf("\n");
    x += currentval;
    printf("the current value of x is %d \n", x);
    
}

void say_welcome(void) {
    printf("welcome to the IPA lecture\n");
}

void square(int var){
    var=var*var;
    printf("%d\n", var);
}
