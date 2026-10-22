package com.mycompany.cocobol.resources;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebFilter("/admin.html")
public class AuthFilter implements Filter {
    @Override public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        if (req.getSession(false) == null || req.getSession(false).getAttribute("userId") == null) {
            resp.sendRedirect(req.getContextPath() + "/registro.html"); return;
        }
        chain.doFilter(request, response);
    }
}
