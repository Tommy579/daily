#include <stdio.h>
#include <string.h>

int main(int argc, char *argv[]) {
    printf("%d arguments were provided\n", argc);
    
    int reverse = 0;
    int i = 0;
    
    while (i < argc) {
        printf("Arg[%d]: %s\n", i, argv[i]);
        
        if (strcmp(argv[i], "-r") == 0) {
            reverse = !reverse;
            if (reverse) {
                printf(" ==> Reversing display\n");
                
                // Find the end of the current reverse block
                int j = i + 1;
                while (j < argc && strcmp(argv[j], "-r") != 0) {
                    j++;
                }
                
                // Print from j-1 down to i+1
                for (int k = j - 1; k > i; k--) {
                    printf("Arg[%d]: %s\n", k, argv[k]);
                }
                
                i = j - 1; // Move index to the end of the block
            }
        }
        i++;
    }
    
    return 0;
}
