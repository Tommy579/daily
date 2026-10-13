% Exercice 6 : Matrice avec 1 sur 1ère ligne, dernière ligne et 2ème diagonale
n = 10;
M = zeros(n, n);

M(1, :) = 1;
M(n, :) = 1;
for i = 1:n
    M(i, n - i + 1) = 1;
end

disp(M);
