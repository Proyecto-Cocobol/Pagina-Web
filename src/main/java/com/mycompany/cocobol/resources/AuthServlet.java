package com.mycompany.cocobol.resources;

import database.DatabaseConnection;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.mindrot.jbcrypt.BCrypt;

@WebServlet("/api/auth/*")
public class AuthServlet extends HttpServlet {
    private static final String FIND_USER = "SELECT u.id_usuario, u.nombre_usuario, u.contrasena_hash, r.nombre AS rol,r.codigo AS codigo_rol "
            + "FROM usuario u JOIN rol r ON r.id_rol=u.id_rol "
            + "LEFT JOIN alumno a ON a.id_persona=u.id_persona "
            + "WHERE (u.nombre_usuario=? OR a.numero_boleta=?) AND u.estado='ACTIVO' AND r.estado='ACTIVO'";

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        req.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json;charset=UTF-8");
        String action = req.getPathInfo();
        if ("/login".equals(action)) login(req, resp);
        else if ("/logout".equals(action)) logout(req, resp);
        else if ("/change-password".equals(action)) changePassword(req, resp);
        else if ("/accounts/create".equals(action)) createAccount(req, resp);
        else if ("/accounts/update".equals(action)) updateAccount(req, resp);
        else if ("/accounts/reset-password".equals(action)) resetAccountPassword(req, resp);
        else send(resp, 404, "{\"error\":\"Solicitud no válida.\"}");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("application/json;charset=UTF-8");
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            send(resp, 401, "{\"error\":\"Inicia sesión para continuar.\"}");
            return;
        }
        if ("/accounts".equals(req.getPathInfo())) {
            if (!isAdmin(session)) { send(resp, 403, "{\"error\":\"Solo el administrador puede consultar las cuentas.\"}"); return; }
            listAccounts(resp); return;
        }
        send(resp, 200, "{\"username\":" + json((String) session.getAttribute("username"))
                + ",\"role\":" + json((String) session.getAttribute("role"))
                + ",\"isAdmin\":" + isAdmin(session) + "}");
    }

    private void login(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String identity = value(req, "boleta");
        String password = value(req, "password");
        if (identity.isBlank() || password.isEmpty()) {
            send(resp, 400, "{\"error\":\"Ingresa tu usuario y contraseña.\"}"); return;
        }
        try (Connection c = DatabaseConnection.getConnection(); PreparedStatement ps = c.prepareStatement(FIND_USER)) {
            ps.setString(1, identity); ps.setString(2, identity);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) { send(resp, 401, "{\"error\":\"Usuario o contraseña incorrectos.\"}"); return; }
                String hash = rs.getString("contrasena_hash");
                if (!validPassword(password, hash)) { send(resp, 401, "{\"error\":\"Usuario o contraseña incorrectos.\"}"); return; }
                HttpSession old = req.getSession(false); if (old != null) old.invalidate();
                HttpSession session = req.getSession(true);
                session.setAttribute("userId", rs.getLong("id_usuario"));
                session.setAttribute("username", rs.getString("nombre_usuario"));
                session.setAttribute("role", rs.getString("rol"));
                session.setAttribute("roleCode", rs.getString("codigo_rol"));
                session.setMaxInactiveInterval(30 * 60);
                send(resp, 200, "{\"ok\":true}");
            }
        } catch (SQLException e) { getServletContext().log("Error en login", e); send(resp, 500, "{\"error\":\"No fue posible conectar con el servicio de acceso.\"}"); }
    }

    private void logout(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false); if (s != null) s.invalidate();
        send(resp, 200, "{\"ok\":true}");
    }

    private void changePassword(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) { send(resp, 401, "{\"error\":\"Tu sesión terminó. Inicia sesión de nuevo.\"}"); return; }
        String current = value(req, "currentPassword"), next = value(req, "newPassword"), confirmation = value(req, "confirmPassword");
        if (current.isEmpty() || next.isEmpty() || confirmation.isEmpty()) { send(resp, 400, "{\"error\":\"Completa todos los campos.\"}"); return; }
        if (!next.equals(confirmation)) { send(resp, 400, "{\"error\":\"La confirmación no coincide.\"}"); return; }
        if (next.length() < 10) { send(resp, 400, "{\"error\":\"La nueva contraseña debe tener al menos 10 caracteres.\"}"); return; }
        long id = (Long) session.getAttribute("userId");
        try (Connection c = DatabaseConnection.getConnection()) {
            c.setAutoCommit(false);
            try (PreparedStatement get = c.prepareStatement("SELECT contrasena_hash FROM usuario WHERE id_usuario=? AND estado='ACTIVO' FOR UPDATE")) {
                get.setLong(1, id);
                try (ResultSet rs = get.executeQuery()) {
                    if (!rs.next() || !validPassword(current, rs.getString(1))) { c.rollback(); send(resp, 401, "{\"error\":\"La contraseña actual es incorrecta.\"}"); return; }
                }
            }
            try (PreparedStatement update = c.prepareStatement("UPDATE usuario SET contrasena_hash=? WHERE id_usuario=?")) {
                update.setString(1, BCrypt.hashpw(next, BCrypt.gensalt(12))); update.setLong(2, id); update.executeUpdate();
            }
            c.commit(); send(resp, 200, "{\"ok\":true}");
        } catch (SQLException e) { getServletContext().log("Error al cambiar contraseña", e); send(resp, 500, "{\"error\":\"No fue posible actualizar la contraseña.\"}"); }
    }

    private void listAccounts(HttpServletResponse resp) throws IOException {
        StringBuilder body = new StringBuilder("{\"accounts\":[");
        try (Connection c = DatabaseConnection.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT u.id_usuario,u.nombre_usuario,r.nombre AS rol,r.codigo AS role_code,u.estado,p.nombre,p.apellido_paterno,p.apellido_materno,p.correo FROM usuario u JOIN rol r ON r.id_rol=u.id_rol JOIN persona p ON p.id_persona=u.id_persona ORDER BY u.id_usuario");
             ResultSet rs = ps.executeQuery()) {
            boolean first = true;
            while (rs.next()) {
                if (!first) body.append(',');
                first = false;
                String fullName = rs.getString("nombre") + " " + rs.getString("apellido_paterno")
                        + (rs.getString("apellido_materno") == null ? "" : " " + rs.getString("apellido_materno"));
                body.append("{\"id\":").append(rs.getLong("id_usuario"))
                        .append(",\"username\":").append(json(rs.getString("nombre_usuario")))
                        .append(",\"role\":").append(json(rs.getString("rol")))
                        .append(",\"roleCode\":").append(json(rs.getString("role_code")))
                        .append(",\"status\":").append(json(rs.getString("estado")))
                        .append(",\"name\":").append(json(fullName))
                        .append(",\"email\":").append(json(rs.getString("correo") == null ? "" : rs.getString("correo"))).append('}');
            }
            send(resp, 200, body.append("]}").toString());
        } catch (SQLException e) {
            getServletContext().log("Error al consultar cuentas", e);
            send(resp, 500, "{\"error\":\"No fue posible consultar las cuentas.\"}");
        }
    }

    private void createAccount(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (!requireAdmin(req, resp)) return;
        String username = value(req, "username").trim(), name = value(req, "name").trim();
        String paternal = value(req, "paternalSurname").trim(), maternal = value(req, "maternalSurname").trim();
        String email = value(req, "email").trim(), phone = value(req, "phone").trim();
        String roleCode = value(req, "roleCode"), password = value(req, "password");
        String boleta = value(req, "boleta").trim(), puesto = value(req, "puesto").trim();
        String parentesco = value(req, "parentesco");
        if (username.isBlank() || name.isBlank() || paternal.isBlank() || password.length() < 10) {
            send(resp, 400, "{\"error\":\"Usuario, nombre, apellido paterno y contraseña de 10 caracteres son obligatorios.\"}"); return;
        }
        if ("ALUMNO".equals(roleCode) && boleta.isBlank()) { send(resp, 400, "{\"error\":\"El número de boleta es obligatorio para alumnos.\"}"); return; }
        try (Connection c = DatabaseConnection.getConnection()) {
            c.setAutoCommit(false);
            long roleId;
            try (PreparedStatement ps = c.prepareStatement("SELECT id_rol FROM rol WHERE codigo=? AND estado='ACTIVO'")) {
                ps.setString(1, roleCode);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) { c.rollback(); send(resp, 400, "{\"error\":\"El rol seleccionado no es válido.\"}"); return; }
                    roleId = rs.getLong(1);
                }
            }
            long personId;
            try (PreparedStatement ps = c.prepareStatement("INSERT INTO persona(nombre,apellido_paterno,apellido_materno,correo,telefono) VALUES(?,?,?,?,?)", java.sql.Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, name); ps.setString(2, paternal); ps.setString(3, maternal.isBlank() ? null : maternal);
                ps.setString(4, email.isBlank() ? null : email); ps.setString(5, phone.isBlank() ? null : phone); ps.executeUpdate();
                try (ResultSet keys = ps.getGeneratedKeys()) { if (!keys.next()) throw new SQLException("No se generó el identificador de persona."); personId = keys.getLong(1); }
            }
            try (PreparedStatement ps = c.prepareStatement("INSERT INTO usuario(id_persona,id_rol,nombre_usuario,contrasena_hash,estado) VALUES(?,?,?,?, 'ACTIVO')")) {
                ps.setLong(1, personId); ps.setLong(2, roleId); ps.setString(3, username);
                ps.setString(4, BCrypt.hashpw(password, BCrypt.gensalt(12))); ps.executeUpdate();
            }
            if ("ALUMNO".equals(roleCode)) {
                try (PreparedStatement ps = c.prepareStatement("INSERT INTO alumno(id_persona,numero_boleta,fecha_ingreso) VALUES(?,?,CURRENT_DATE)")) { ps.setLong(1, personId); ps.setString(2, boleta); ps.executeUpdate(); }
            } else if ("PROFESOR".equals(roleCode)) {
                try (PreparedStatement ps = c.prepareStatement("INSERT INTO personal(id_persona,puesto,fecha_ingreso) VALUES(?,?,CURRENT_DATE)")) { ps.setLong(1, personId); ps.setString(2, puesto.isBlank() ? "Profesor" : puesto); ps.executeUpdate(); }
            } else if ("RESPONSABLE".equals(roleCode)) {
                if (!java.util.Set.of("PADRE", "MADRE", "TUTOR").contains(parentesco)) parentesco = "TUTOR";
                try (PreparedStatement ps = c.prepareStatement("INSERT INTO responsable(id_persona,parentesco_principal) VALUES(?,?)")) { ps.setLong(1, personId); ps.setString(2, parentesco); ps.executeUpdate(); }
            }
            c.commit(); send(resp, 201, "{\"ok\":true}");
        } catch (SQLException e) {
            getServletContext().log("Error al crear cuenta", e);
            send(resp, 409, "{\"error\":\"No se pudo crear la cuenta. Verifica que usuario, correo y boleta no estén repetidos y que no exista ya un administrador activo.\"}");
        }
    }

    private void updateAccount(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (!requireAdmin(req, resp)) return;
        try {
            long id = Long.parseLong(value(req, "id"));
            String username = value(req, "username").trim(), roleCode = value(req, "roleCode");
            if (username.isBlank()) { send(resp, 400, "{\"error\":\"El usuario no puede estar vacío.\"}"); return; }
            try (Connection c = DatabaseConnection.getConnection(); PreparedStatement ps = c.prepareStatement("UPDATE usuario u JOIN rol r ON r.codigo=? AND r.estado='ACTIVO' SET u.nombre_usuario=?,u.id_rol=r.id_rol WHERE u.id_usuario=?")) {
                ps.setString(1, roleCode); ps.setString(2, username); ps.setLong(3, id);
                if (ps.executeUpdate() != 1) { send(resp, 400, "{\"error\":\"No se actualizó la cuenta. Verifica el rol y el usuario.\"}"); return; }
            }
            send(resp, 200, "{\"ok\":true}");
        } catch (NumberFormatException e) { send(resp, 400, "{\"error\":\"Cuenta no válida.\"}"); }
        catch (SQLException e) { getServletContext().log("Error al editar cuenta", e); send(resp, 409, "{\"error\":\"No se pudo guardar. El usuario puede estar duplicado o el cambio viola una regla de la base.\"}"); }
    }

    private void resetAccountPassword(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (!requireAdmin(req, resp)) return;
        try {
            long id = Long.parseLong(value(req, "id"));
            String password = value(req, "password");
            if (password.length() < 10) { send(resp, 400, "{\"error\":\"La contraseña debe tener al menos 10 caracteres.\"}"); return; }
            try (Connection c = DatabaseConnection.getConnection(); PreparedStatement ps = c.prepareStatement("UPDATE usuario SET contrasena_hash=? WHERE id_usuario=?")) {
                ps.setString(1, BCrypt.hashpw(password, BCrypt.gensalt(12))); ps.setLong(2, id);
                if (ps.executeUpdate() != 1) { send(resp, 404, "{\"error\":\"No existe esa cuenta.\"}"); return; }
            }
            send(resp, 200, "{\"ok\":true}");
        } catch (NumberFormatException e) { send(resp, 400, "{\"error\":\"Cuenta no válida.\"}"); }
        catch (SQLException e) { getServletContext().log("Error al restablecer contraseña", e); send(resp, 500, "{\"error\":\"No se pudo actualizar la contraseña.\"}"); }
    }

    private static boolean isAdmin(HttpSession session) { return "ADMINISTRADOR".equals(session.getAttribute("roleCode")); }
    private boolean requireAdmin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) { send(resp, 401, "{\"error\":\"Inicia sesión para continuar.\"}"); return false; }
        if (!isAdmin(session)) { send(resp, 403, "{\"error\":\"Solo el administrador puede gestionar cuentas.\"}"); return false; }
        return true;
    }

    private static boolean validPassword(String raw, String hash) {
        if (hash == null || hash.isBlank()) return false;
        try {
            if (hash.startsWith("{bcrypt}")) hash = hash.substring(8);
            if (hash.startsWith("$2b$") || hash.startsWith("$2y$")) hash = "$2a$" + hash.substring(4);
            if (hash.startsWith("$2a$")) return BCrypt.checkpw(raw, hash);
            return false;
        } catch (IllegalArgumentException ex) { return false; }
    }
    private static String value(HttpServletRequest req, String name) { String v = req.getParameter(name); return v == null ? "" : v; }
    private static String json(String value) {
        StringBuilder escaped = new StringBuilder("\"");
        for (char ch : value.toCharArray()) {
            switch (ch) {
                case '"' -> escaped.append("\\\"");
                case '\\' -> escaped.append("\\\\");
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                case '\b' -> escaped.append("\\b");
                case '\f' -> escaped.append("\\f");
                default -> { if (ch < 0x20) escaped.append(String.format("\\u%04x", (int) ch)); else escaped.append(ch); }
            }
        }
        return escaped.append('"').toString();
    }
    private static void send(HttpServletResponse resp, int status, String body) throws IOException { resp.setStatus(status); resp.getWriter().write(body); }
}
