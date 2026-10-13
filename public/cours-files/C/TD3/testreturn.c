#include <stdio.h>

int res = 0;

int findSum(int n){
    for (int i;i<=n;i++){
        res+=i;
    }
    return res;
}

int main(int argc, char *argv[]) {
    int sum = findSum(5);
    printf("La somme est %d \n", sum);
}
