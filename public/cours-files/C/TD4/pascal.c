#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int size;
    int **lines;
} Ptriangle;

int createPascalTriangle(Ptriangle *p, int n) {
    if (n < 1) {
        return -1;
    }
    
    p->size = n;
    p->lines = (int **)malloc(n * sizeof(int *));
    if (p->lines == NULL) {
        return -2;
    }
    
    for (int i = 0; i < n; i++) {
        p->lines[i] = (int *)malloc((i + 1) * sizeof(int));
        if (p->lines[i] == NULL) {
            // Cleanup previous allocations if one fails
            for (int j = 0; j < i; j++) free(p->lines[j]);
            free(p->lines);
            return -2;
        }
        
        // Fill the triangle
        p->lines[i][0] = 1;
        p->lines[i][i] = 1;
        for (int k = 1; k < i; k++) {
            p->lines[i][k] = p->lines[i - 1][k - 1] + p->lines[i - 1][k];
        }
    }
    
    return 0;
}

void showPascalTriangle(Ptriangle p) {
    printf("Size: %d\n", p.size);
    if (p.lines == NULL) return;
    
    for (int i = 0; i < p.size; i++) {
        for (int j = 0; j <= i; j++) {
            printf("%d ", p.lines[i][j]);
        }
        printf("\n");
    }
}

int main() {
    Ptriangle p1;
    p1.size = 0;
    p1.lines = NULL;
    
    // Test with n = 0 (should fail)
    int res = createPascalTriangle(&p1, 0);
    if (res != 0) {
        printf("Triangle not created (n=0)\n");
    }
    
    // Test with n = 5
    int n = 5;
    res = createPascalTriangle(&p1, n);
    if (res == 0) {
        showPascalTriangle(p1);
        
        // Cleanup
        for (int i = 0; i < p1.size; i++) free(p1.lines[i]);
        free(p1.lines);
    } else {
        printf("Error creating triangle: %d\n", res);
    }
    
    return 0;
}
