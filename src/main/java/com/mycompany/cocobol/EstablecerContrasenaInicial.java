package com.mycompany.cocobol;

import database.DatabaseConnection;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import javax.swing.JPasswordField;
import javax.swing.JOptionPane;
import org.mindrot.jbcrypt.BCrypt;

/** Herramienta local de configuración inicial. Ejecutar una vez desde NetBeans. */
public final class EstablecerContrasenaInicial {
    private EstablecerContrasenaInicial() { }

    public static void main(String[] args) {
        String username = JOptionPane.showInputDialog(null, "Usuario existente al que asignar contraseña:", "admin_demo");
        if (username == null || username.isBlank()) return;
        JPasswordField passwordField = new JPasswordField();
        if (JOptionPane.showConfirmDialog(null, passwordField, "Nueva contraseña (mínimo 10 caracteres)", JOptionPane.OK_CANCEL_OPTION) != JOptionPane.OK_OPTION) return;
        char[] password = passwordField.getPassword();
        if (password.length < 10) { JOptionPane.showMessageDialog(null, "La contraseña debe tener al menos 10 caracteres.", "Dato no válido", JOptionPane.ERROR_MESSAGE); return; }
        JPasswordField confirmationField = new JPasswordField();
        if (JOptionPane.showConfirmDialog(null, confirmationField, "Confirma la nueva contraseña", JOptionPane.OK_CANCEL_OPTION) != JOptionPane.OK_OPTION) return;
        char[] confirmation = confirmationField.getPassword();
        if (!java.util.Arrays.equals(password, confirmation)) { JOptionPane.showMessageDialog(null, "Las contraseñas no coinciden.", "Dato no válido", JOptionPane.ERROR_MESSAGE); return; }
        String hash = BCrypt.hashpw(new String(password), BCrypt.gensalt(12));
        java.util.Arrays.fill(password, '\0'); java.util.Arrays.fill(confirmation, '\0');
        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement update = connection.prepareStatement("UPDATE usuario SET contrasena_hash=? WHERE nombre_usuario=?");) {
            update.setString(1, hash); update.setString(2, username);
            if (update.executeUpdate() != 1) throw new java.sql.SQLException("No existe una cuenta única con ese nombre de usuario.");
            JOptionPane.showMessageDialog(null, "Contraseña BCrypt asignada a " + username + ". Ya puedes iniciar sesión.");
        } catch (Exception e) {
            JOptionPane.showMessageDialog(null, "No se pudo establecer la contraseña: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }
}
