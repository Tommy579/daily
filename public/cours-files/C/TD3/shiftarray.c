#include <stdio.h>
#include <string.h>

void shiftArray(char str[], int m){
    int l=strlen(str);
    if (l==0) return;

    char tmp[m];

    for (int i=0 ; i<m ; i++){
        tmp[i]=str[i];
    }


    for (int i=0;i<l;i++){
        str[i]=str[i+m];
    }

    for (int i=0 ; i<m ; i++){
        str[l-m+i]=tmp[i];
    }

    //printf("%s\n", str);
}




int main(int argc, char *argv[]){
    char str1[] = "IPA is amazing\0";
    printf("%s\n", str1);
    shiftArray(str1, 3);
    printf("%s\n",str1); 

}


