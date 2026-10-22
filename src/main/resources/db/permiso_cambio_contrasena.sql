-- Ejecutar con una cuenta administradora después de crear 'cocobol_app_20261022'@'%'.
-- Configura DB_APP_USER y DB_APP_PASSWORD con el secreto de esa cuenta en Azure App Service.
-- No guardes la contraseña en este archivo ni en Git.
GRANT SELECT ON academia_lobos.usuario TO 'cocobol_app_20261022'@'%';
GRANT SELECT ON academia_lobos.rol TO 'cocobol_app_20261022'@'%';
GRANT SELECT ON academia_lobos.alumno TO 'cocobol_app_20261022'@'%';
GRANT SELECT ON academia_lobos.persona TO 'cocobol_app_20261022'@'%';
GRANT INSERT ON academia_lobos.persona TO 'cocobol_app_20261022'@'%';
GRANT INSERT ON academia_lobos.usuario TO 'cocobol_app_20261022'@'%';
GRANT INSERT ON academia_lobos.alumno TO 'cocobol_app_20261022'@'%';
GRANT INSERT ON academia_lobos.personal TO 'cocobol_app_20261022'@'%';
GRANT INSERT ON academia_lobos.responsable TO 'cocobol_app_20261022'@'%';
GRANT UPDATE (contrasena_hash, nombre_usuario, id_rol)
ON academia_lobos.usuario TO 'cocobol_app_20261022'@'%';
