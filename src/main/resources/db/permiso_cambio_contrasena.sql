-- Ejecutar una vez en MySQL con una cuenta administradora.
-- Permisos mínimos para iniciar sesión, cambiar la contraseña propia
-- y administrar personas/cuentas desde el panel de administrador.
GRANT UPDATE (contrasena_hash, nombre_usuario, id_rol)
ON academia_lobos.usuario TO 'lobos_login_demo'@'localhost';
GRANT INSERT ON academia_lobos.persona TO 'lobos_login_demo'@'localhost';
GRANT INSERT ON academia_lobos.usuario TO 'lobos_login_demo'@'localhost';
GRANT INSERT ON academia_lobos.alumno TO 'lobos_login_demo'@'localhost';
GRANT INSERT ON academia_lobos.personal TO 'lobos_login_demo'@'localhost';
GRANT INSERT ON academia_lobos.responsable TO 'lobos_login_demo'@'localhost';
