function [res] = fibo(n)
  if n == 0 || n == 1
        res = 1;
        return;
  end


  u=zeros(1,n+1);
  u(1)=1;
  u(2)=1;
  for i = 3:n+1
    u(i)=u(i-2)+u(i-1);
  endfor
  res=u(n+1);
end

