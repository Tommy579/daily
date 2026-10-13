#include <stdio.h>

// Exercise 3: Testing the prototype int main(int argc, char argv[][])
// Note: In C, char argv[][] is usually invalid as the second dimension must be specified.
// The standard is int main(int argc, char *argv[]) or int main(int argc, char **argv).
int main(int argc, char argv[][]) {
    printf("This program compiled with the requested prototype!\n");
    printf("Argc: %d\n", argc);
    return 0;
}
