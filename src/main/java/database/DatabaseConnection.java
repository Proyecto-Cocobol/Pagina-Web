package database;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {

    public static Connection getConnection() throws SQLException {
        String appUser = System.getenv("DB_APP_USER");
        String appPassword = System.getenv("DB_APP_PASSWORD");
        if (appUser != null || appPassword != null) {
            if (appUser == null || appUser.isBlank() || appPassword == null || appPassword.isBlank()) {
                throw new SQLException("DB_APP_USER y DB_APP_PASSWORD deben configurarse juntos.");
            }
            return connect(requiredSetting("DB_URL"), appUser, appPassword);
        }
        return getAdminConnection();
    }

    /** Solo para aprovisionamiento temporal; elimina estos ajustes tras crear el usuario de aplicación. */
    public static Connection getAdminConnection() throws SQLException {
        return connect(requiredSetting("DB_URL"), requiredSetting("DB_USER"), requiredSetting("DB_PASSWORD"));
    }

    private static Connection connect(String url, String user, String password) throws SQLException {
        try {
            // Registro explícito para diagnosticar y cargar Connector/J en Tomcat.
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new SQLException("No se encontró MySQL Connector/J. Revisa que mysql-connector-j esté dentro de WEB-INF/lib.", e);
        }
        return DriverManager.getConnection(url, user, password);
    }

    private static String requiredSetting(String name) throws SQLException {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new SQLException("Falta el ajuste requerido " + name + " en el entorno de la aplicación.");
        }
        return value;
    }
}
