function M = MaToeplitz(n)
    M = zeros(n, n);
    for i = 1:n
        for j = 1:n
            M(i,j) = n - abs(i-j);
        end
    end
end
