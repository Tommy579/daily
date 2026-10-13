function [valeur, n, duree] = fibo1()
  tic;
  u_prem=1;
  u_deux=1;
  u_courant=2;
  n=2;
  while u_courant<=1e6
    u_prem=u_deux;
    u_deux=u_courant;
    u_courant=u_prem+u_deux;
    n++;
  endwhile
  duree=toc;
  valeur=u_courant;

  fprintf('Rang n = %d\n', n);
  fprintf('Valeur u_n = %d\n', valeur);
  fprintf('Temps d''execution = %e secondes\n', duree);
end


