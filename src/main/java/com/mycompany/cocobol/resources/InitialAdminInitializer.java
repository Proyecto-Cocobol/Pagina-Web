package com.mycompany.cocobol.resources;

import database.DatabaseConnection;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.mindrot.jbcrypt.BCrypt;

/** Crea un administrador inicial solo cuando no existe uno y se configuró una clave de un solo uso. */
@WebListener
public class InitialAdminInitializer implements ServletContextListener {
    @Override
    public void contextInitialized(ServletContextEvent event) {
        try {
            provisionApplicationDatabaseUser(event.getServletContext());
            ensureInitialAdmin(event.getServletContext());
        } catch (SQLException e) {
            event.getServletContext().log("No se pudo preparar la cuenta inicial. Revisa MySQL, el esquema y Connector/J.", e);
        }
    }

    private void provisionApplicationDatabaseUser(jakarta.servlet.ServletContext context) throws SQLException {
        if (!Boolean.parseBoolean(System.getenv("DB_BOOTSTRAP_APP_USER"))) return;

        String username = System.getenv("DB_APP_USER");
        String password = System.getenv("DB_APP_PASSWORD");
        if (!"cocobol_app_20261022".equals(username) || password == null || password.length() < 20) {
            throw new SQLException("La configuración temporal de DB_APP_USER no es válida.");
        }

        String account = "'cocobol_app_20261022'@'%'";
        String passwordLiteral = password.replace("\\", "\\\\").replace("'", "''");
        try (Connection c = DatabaseConnection.getAdminConnection(); Statement statement = c.createStatement()) {
            statement.execute("CREATE USER IF NOT EXISTS " + account + " IDENTIFIED BY '" + passwordLiteral + "'");
            statement.execute("GRANT SELECT ON academia_lobos.usuario TO " + account);
            statement.execute("GRANT SELECT ON academia_lobos.rol TO " + account);
            statement.execute("GRANT SELECT ON academia_lobos.alumno TO " + account);
            statement.execute("GRANT SELECT ON academia_lobos.persona TO " + account);
            statement.execute("GRANT INSERT ON academia_lobos.persona TO " + account);
            statement.execute("GRANT INSERT ON academia_lobos.usuario TO " + account);
            statement.execute("GRANT INSERT ON academia_lobos.alumno TO " + account);
            statement.execute("GRANT INSERT ON academia_lobos.personal TO " + account);
            statement.execute("GRANT INSERT ON academia_lobos.responsable TO " + account);
            statement.execute("GRANT UPDATE (contrasena_hash, nombre_usuario, id_rol) ON academia_lobos.usuario TO " + account);
        }
        try (Connection ignored = DatabaseConnection.getConnection()) {
            context.log("Se aprovisionó y verificó el usuario limitado de la aplicación. Desactiva DB_BOOTSTRAP_APP_USER y elimina DB_USER/DB_PASSWORD.");
        }
    }

    private void ensureInitialAdmin(jakarta.servlet.ServletContext context) throws SQLException {
        try (Connection c = DatabaseConnection.getConnection()) {
            c.setAutoCommit(false);
            try {
                if (findActiveAdmin(c) != null) {
                    c.commit();
                    context.log("Se conservó la cuenta administradora existente; no se cambiaron sus credenciales.");
                    return;
                }

                String username = System.getenv("INITIAL_ADMIN_USERNAME");
                String password = System.getenv("INITIAL_ADMIN_PASSWORD");
                if (username == null || username.isBlank() || password == null || password.length() < 10) {
                    c.commit();
                    context.log("No hay administrador activo y no se configuró INITIAL_ADMIN_USERNAME e INITIAL_ADMIN_PASSWORD (mínimo 10 caracteres); no se creó ni modificó ninguna cuenta.");
                    return;
                }

                username = username.trim();
                long adminRoleId = findAdminRole(c);
                try (PreparedStatement ps = c.prepareStatement(
                        "SELECT r.codigo FROM usuario u JOIN rol r ON r.id_rol=u.id_rol WHERE u.nombre_usuario=? FOR UPDATE")) {
                    ps.setString(1, username);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            throw new SQLException("El nombre configurado para el administrador inicial ya existe; no se modificó la cuenta.");
                        }
                    }
                }

                createAdmin(c, adminRoleId, username, BCrypt.hashpw(password, BCrypt.gensalt(12)));
                c.commit();
                context.log("Se creó la cuenta administradora inicial con las credenciales configuradas.");
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

    private static void createAdmin(Connection c, long roleId, String username, String hash) throws SQLException {
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
            ps.setString(3, username);
            ps.setString(4, hash);
            ps.executeUpdate();
        }
    }
}
