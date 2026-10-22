
/* ==================================================
   REFERENCIAS A LOS ELEMENTOS HTML
   ================================================== */

// Obtenemos el formulario y los campos de entrada.
const formulario = document.getElementById("formLogin");
const campoBoleta = document.getElementById("boleta");
const campoPassword = document.getElementById("password");
const mensajeError = document.getElementById("mensajeError");

/* ==================================================
   VALIDACIÓN DEL FORMULARIO
   ================================================== */

// Se ejecuta cuando el usuario pulsa "Ingresar".
formulario.addEventListener("submit", function(event) {

    // Evita que el navegador envíe el formulario y recargue la página.
    event.preventDefault();

    // Quitamos espacios al inicio y al final de la boleta.
    const boleta = campoBoleta.value.trim();

    // La contraseña se conserva tal como fue escrita.
    const password = campoPassword.value;

    // Limpiamos mensajes anteriores.
    mensajeError.textContent = "";

    // Comprobamos que la boleta tenga contenido.
    if (boleta === "") {
        mensajeError.textContent =
            "Ingresa tu número de boleta.";

        campoBoleta.focus();
        return;
    }

    // Comprobamos que la contraseña tenga contenido.
    if (password.trim() === "") {
        mensajeError.textContent =
            "Ingresa tu contraseña.";

        campoPassword.focus();
        return;
    }

    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    boton.textContent = "Verificando…";
    fetch("api/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
        body: new URLSearchParams({boleta, password})
    }).then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
        window.location.assign("admin.html");
    }).catch(error => {
        mensajeError.textContent = error.message;
        campoPassword.value = "";
        campoPassword.focus();
    }).finally(() => {
        boton.disabled = false;
        boton.textContent = "Ingresar";
    });
});

