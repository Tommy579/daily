function M = MatriceX(n)
    M = zeros(n, n);
    for i = 1:n
        M(i, i) = 1;
        M(i, n - i + 1) = 1;
    end
end
