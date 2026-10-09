```javascript
/* =========================================================
   OBTENER USUARIO ACTUAL
   ========================================================= */

/*
 * Recuperamos del localStorage al usuario que inició sesión.
 */

const usuarioActual = JSON.parse(
    localStorage.getItem("usuarioActual")
);


/* =========================================================
   VALIDAR SESIÓN
   ========================================================= */

if (!usuarioActual) {

    /*
     * Si alguien intenta entrar directamente a admin.html
     * sin iniciar sesión, lo mandamos al login.
     */

    alert(
        "Debes iniciar sesión para acceder."
    );

    window.location.href = "login.html";
}


/* =========================================================
   VALIDAR ROL
   ========================================================= */

if (
    usuarioActual &&
    usuarioActual.rol !== "administrador"
) {

    /*
     * Solamente los administradores pueden acceder
     * actualmente a este módulo.
     */

    alert(
        "No tienes permisos para acceder a este módulo."
    );

    window.location.href = "login.html";
}


/* =========================================================
   MOSTRAR CORREO
   ========================================================= */

if (usuarioActual) {

    const elementoCorreo =
        document.getElementById(
            "correoAdministrador"
        );


    elementoCorreo.textContent =
        "Correo: " + usuarioActual.correo;

}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

/*
 * Por ahora los botones solamente muestran un mensaje,
 * porque todavía no hemos desarrollado los módulos.
 */

const enlaces =
    document.querySelectorAll(
        ".barra-navegacion a"
    );


enlaces.forEach(function(enlace) {

    enlace.addEventListener(
        "click",
        function(event) {

            /*
             * Evitamos que el enlace cambie de página.
             */

            event.preventDefault();


            /*
             * Obtenemos el nombre del módulo.
             */

            const modulo =
                enlace.textContent.trim();


            /*
             * Alumnos todavía será el siguiente módulo
             * que podremos desarrollar.
             */

            alert(
                "El módulo de " +
                modulo +
                " se encuentra en desarrollo."
            );

        }
    );

});
```
