package com.mycompany.cocobol.resources;

import database.DatabaseConnection;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.mindrot.jbcrypt.BCrypt;

/** Crea la cuenta inicial una sola vez al desplegar, usando el esquema existente. */
@WebListener
public class InitialAdminInitializer implements ServletContextListener {
    private static final String INITIAL_USERNAME = "academia_lobos";
    private static final String INITIAL_PASSWORD = "0123456789";

    @Override
    public void contextInitialized(ServletContextEvent event) {
        try {
            ensureInitialAdmin();
            event.getServletContext().log("Cuenta inicial de administrador comprobada.");
        } catch (SQLException e) {
            event.getServletContext().log("No se pudo preparar la cuenta inicial. Revisa MySQL, el esquema y Connector/J.", e);
        }
    }

    private void ensureInitialAdmin() throws SQLException {
        try (Connection c = DatabaseConnection.getConnection()) {
            c.setAutoCommit(false);
            try {
                long adminRoleId = findAdminRole(c);
                String hash = BCrypt.hashpw(INITIAL_PASSWORD, BCrypt.gensalt(12));

                try (PreparedStatement ps = c.prepareStatement(
                        "SELECT u.id_usuario,u.contrasena_hash,r.codigo FROM usuario u JOIN rol r ON r.id_rol=u.id_rol WHERE u.nombre_usuario=? FOR UPDATE")) {
                    ps.setString(1, INITIAL_USERNAME);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            if (!"ADMINISTRADOR".equals(rs.getString("codigo"))) {
                                throw new SQLException("El usuario academia_lobos ya existe y no tiene el rol Administrador.");
                            }
                            if (rs.getString("contrasena_hash") == null || rs.getString("contrasena_hash").isBlank()) {
                                updatePassword(c, rs.getLong("id_usuario"), hash);
                            }
                            c.commit();
                            return;
                        }
                    }
                }

                Long activeAdminId = findActiveAdmin(c);
                if (activeAdminId != null) {
                    try (PreparedStatement ps = c.prepareStatement(
                            "UPDATE usuario SET nombre_usuario=?,contrasena_hash=? WHERE id_usuario=?")) {
                        ps.setString(1, INITIAL_USERNAME);
                        ps.setString(2, hash);
                        ps.setLong(3, activeAdminId);
                        ps.executeUpdate();
                    }
                } else {
                    createAdmin(c, adminRoleId, hash);
                }
                c.commit();
            } catch (SQLException | RuntimeException e) {
                c.rollback();
                if (e instanceof SQLException sqlException) throw sqlException;
                throw e;
            }
        }
    }

    private static long findAdminRole(Connection c) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT id_rol FROM rol WHERE codigo='ADMINISTRADOR' AND estado='ACTIVO'");
             ResultSet rs = ps.executeQuery()) {
            if (!rs.next()) throw new SQLException("No existe el rol activo ADMINISTRADOR en la tabla rol.");
            return rs.getLong(1);
        }
    }

    private static Long findActiveAdmin(Connection c) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT u.id_usuario FROM usuario u JOIN rol r ON r.id_rol=u.id_rol WHERE r.codigo='ADMINISTRADOR' AND u.estado='ACTIVO' LIMIT 1 FOR UPDATE");
             ResultSet rs = ps.executeQuery()) {
            return rs.next() ? rs.getLong(1) : null;
        }
    }

    private static void updatePassword(Connection c, long userId, String hash) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("UPDATE usuario SET contrasena_hash=? WHERE id_usuario=?")) {
            ps.setString(1, hash);
            ps.setLong(2, userId);
            ps.executeUpdate();
        }
    }

    private static void createAdmin(Connection c, long roleId, String hash) throws SQLException {
        long personId;
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO persona(nombre,apellido_paterno,estado) VALUES('Administrador','Academia','ACTIVO')",
                java.sql.Statement.RETURN_GENERATED_KEYS)) {
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (!keys.next()) throw new SQLException("MySQL no devolvió el id de la persona inicial.");
                personId = keys.getLong(1);
            }
        }
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO usuario(id_persona,id_rol,nombre_usuario,contrasena_hash,estado) VALUES(?,?,?,?,'ACTIVO')")) {
            ps.setLong(1, personId);
            ps.setLong(2, roleId);
            ps.setString(3, INITIAL_USERNAME);
            ps.setString(4, hash);
            ps.executeUpdate();
        }
    }
}
