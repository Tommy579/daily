% Exercice 4 : Matrice n x n avec éléments de 1 à n^2
n = 100;

tic;
vec = 1:n^2;
mat_vec = reshape(vec, n, n)';
t_vec = toc;

tic;
mat_loop = zeros(n, n);
count = 1;
for i = 1:n
    for j = 1:n
        mat_loop(i, j) = count;
        count = count + 1;
    end
end
t_loop = toc;

fprintf('Temps reshape : %e s\n', t_vec);
fprintf('Temps boucle : %e s\n', t_loop);
if isequal(mat_vec, mat_loop)
    disp('Les matrices sont identiques.');
else
    disp('Erreur : Les matrices diffèrent.');
end
