% Exercice 7 : Inverser un vecteur
x = [1, 2, 3, 4, 5];
x_inv = x(end:-1:1);

fprintf('Original : [%s]\n', num2str(x));
fprintf('Inversé  : [%s]\n', num2str(x_inv));
