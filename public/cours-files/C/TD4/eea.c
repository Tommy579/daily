#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int u;
    int v;
    int gcd;
} EEAres;

// Exercise 1: eea2 returning a structure
EEAres eea2(int a, int b) {
    if (a == 0) {
        EEAres res = {0, 1, b};
        return res;
    }
    EEAres res_prev = eea2(b % a, a);
    EEAres res;
    res.gcd = res_prev.gcd;
    res.u = res_prev.v - (b / a) * res_prev.u;
    res.v = res_prev.u;
    return res;
}

// Exercise 2: eea3 using pointers for u and v
int eea3(int a, int b, int *u, int *v) {
    if (a == 0) {
        *u = 0;
        *v = 1;
        return b;
    }
    int u_prev, v_prev;
    int gcd = eea3(b % a, a, &u_prev, &v_prev);
    *u = v_prev - (b / a) * u_prev;
    *v = u_prev;
    return gcd;
}

int main() {
    int a = 254, b = 44;
    
    printf("Testing eea2(%d, %d):\n", a, b);
    EEAres res2 = eea2(a, b);
    printf("u:%d, v:%d, gcd:%d\n", res2.u, res2.v, res2.gcd);
    
    printf("\nTesting eea3(%d, %d):\n", a, b);
    int u3, v3;
    int gcd3 = eea3(a, b, &u3, &v3);
    printf("u:%d, v:%d, gcd:%d\n", u3, v3, gcd3);
    
    return 0;
}
