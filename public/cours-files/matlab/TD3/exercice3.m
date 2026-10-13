% Exercice 3 : Somme des entiers et de leurs carrés de 1 à n
n = 1000;

tic;
sum_loop = 0;
sum_sq_loop = 0;
for i = 1:n
    sum_loop = sum_loop + i;
    sum_sq_loop = sum_sq_loop + i^2;
end
t_loop = toc;

tic;
v = 1:n;
sum_vec = sum(v);
sum_sq_vec = sum(v.^2);
t_vec = toc;

fprintf('Somme : %d, Somme carrés : %d\n', sum_loop, sum_sq_loop);
fprintf('Temps boucle : %e s\n', t_loop);
fprintf('Temps vectorisation : %e s\n', t_vec);
