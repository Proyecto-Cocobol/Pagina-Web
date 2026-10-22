package database;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {

    // Credenciales locales del usuario MySQL que usa la aplicación.
    // Si cambiaste los datos de MySQL, actualiza estos tres valores.
    private static final String URL = "jdbc:mysql://localhost:3306/academia_lobos"
            + "?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
    private static final String USER = "root";
    private static final String PASSWORD = "SegoProgra29";

    public static Connection getConnection() throws SQLException {
        try {
            // Registro explícito para diagnosticar y cargar Connector/J en Tomcat.
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new SQLException("No se encontró MySQL Connector/J. Revisa que mysql-connector-j esté dentro de WEB-INF/lib.", e);
        }
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
}
