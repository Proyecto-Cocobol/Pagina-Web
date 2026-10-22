/* =========================================================
   ACADEMIA LOBOS
   ADMINISTRADOR
   NAVEGACIÓN Y VISTAS
   ========================================================= */


/* =========================================================
   ELEMENTOS PRINCIPALES
   ========================================================= */

const appContent = document.getElementById("appContent");
const mainNav = document.getElementById("mainNav");
const menuToggle = document.getElementById("menuToggle");

fetch("api/auth").then(async response => {
    if (!response.ok) { window.location.replace("registro.html"); return; }
    const account = await response.json();
    document.getElementById("userRole").textContent = account.role;
    document.getElementById("accountsButton").hidden = !account.isAdmin;
}).catch(() => window.location.replace("registro.html"));

const accountsButton = document.getElementById("accountsButton");
accountsButton.addEventListener("click", renderAccounts);

async function renderAccounts() {
    appContent.innerHTML = '<section class="accounts-panel"><div class="accounts-heading"><div><h1>Cuentas de acceso</h1><p>Usuarios, roles y estado de las cuentas.</p></div><button class="btn btn-primary" id="newAccountButton">Crear cuenta</button></div><p id="accountsMessage" role="alert"></p><div class="table-container"><table class="data-table"><thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="accountsRows"></tbody></table></div><p class="account-security-note">Las contraseñas se guardan cifradas como hashes, por lo que no se muestran. Puedes asignar una nueva con “Restablecer contraseña”.</p></section>';
    document.getElementById("newAccountButton").addEventListener("click", () => openAccountDialog());
    try {
        const response = await fetch("api/auth/accounts");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudieron cargar las cuentas.");
        const rows = document.getElementById("accountsRows");
        result.accounts.forEach(account => {
            const row = document.createElement("tr");
            [account.username, account.name, account.email, account.role, account.status].forEach(value => {
                const cell = document.createElement("td"); cell.textContent = value || "—"; row.appendChild(cell);
            });
            const actions = document.createElement("td");
            const edit = document.createElement("button"); edit.className = "btn btn-outline btn-small"; edit.textContent = "Editar";
            edit.addEventListener("click", () => openAccountDialog(account));
            const reset = document.createElement("button"); reset.className = "btn btn-outline btn-small"; reset.textContent = "Restablecer contraseña";
            reset.addEventListener("click", () => openResetAccountPassword(account));
            actions.append(edit, document.createTextNode(" "), reset); row.appendChild(actions); rows.appendChild(row);
        });
    } catch (error) { document.getElementById("accountsMessage").textContent = error.message; }
}

const accountDialog = document.getElementById("accountDialog");
function openAccountDialog(account = null) {
    const form = document.getElementById("accountForm");
    form.reset();
    document.getElementById("accountMessage").textContent = "";
    document.getElementById("accountDialogTitle").textContent = account ? "Editar cuenta" : "Crear cuenta";
    form.elements.id.value = account ? account.id : "";
    document.getElementById("createPasswordField").hidden = Boolean(account);
    form.elements.password.required = !account;
    form.elements.name.required = !account;
    form.elements.paternalSurname.required = !account;
    form.elements.email.required = false;
    form.elements.username.value = account ? account.username : "";
    form.elements.roleCode.value = account ? account.roleCode : "ALUMNO";
    form.elements.username.readOnly = false;
    ["name", "paternalSurname", "maternalSurname", "email"].forEach(key => { form.elements[key].disabled = Boolean(account); });
    form.elements.phone.disabled = Boolean(account);
    accountDialog.showModal();
}
document.getElementById("cancelAccount").addEventListener("click", () => accountDialog.close());
document.getElementById("accountForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const editing = Boolean(form.elements.id.value);
    const message = document.getElementById("accountMessage");
    const data = Object.fromEntries(new FormData(form));
    try {
        const response = await fetch(`api/auth/accounts/${editing ? "update" : "create"}`, {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}, body: new URLSearchParams(data)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo guardar la cuenta.");
        accountDialog.close(); renderAccounts(); showToast(editing ? "Cuenta actualizada." : "Cuenta creada.");
    } catch (error) { message.textContent = error.message; }
});

const resetAccountPasswordDialog = document.getElementById("resetAccountPasswordDialog");
function openResetAccountPassword(account) {
    const form = document.getElementById("resetAccountPasswordForm"); form.reset();
    form.elements.id.value = account.id;
    document.getElementById("resetAccountPasswordMessage").textContent = "";
    resetAccountPasswordDialog.showModal();
}
document.getElementById("cancelResetAccountPassword").addEventListener("click", () => resetAccountPasswordDialog.close());
document.getElementById("resetAccountPasswordForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget, message = document.getElementById("resetAccountPasswordMessage");
    if (form.elements.password.value !== form.elements.confirmation.value) { message.textContent = "La confirmación no coincide."; return; }
    try {
        const response = await fetch("api/auth/accounts/reset-password", {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}, body: new URLSearchParams({id: form.elements.id.value, password: form.elements.password.value})});
        const result = await response.json(); if (!response.ok) throw new Error(result.error || "No se pudo restablecer la contraseña.");
        resetAccountPasswordDialog.close(); showToast("Contraseña restablecida.");
    } catch (error) { message.textContent = error.message; }
});

const passwordDialog = document.getElementById("passwordDialog");
document.getElementById("changePasswordButton").addEventListener("click", () => {
    document.getElementById("passwordMessage").textContent = "";
    document.getElementById("changePasswordForm").reset();
    passwordDialog.showModal();
});
document.getElementById("cancelPassword").addEventListener("click", () => passwordDialog.close());
document.getElementById("changePasswordForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById("passwordMessage");
    const submit = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form));
    if (values.newPassword !== values.confirmPassword) { message.textContent = "La confirmación no coincide."; return; }
    submit.disabled = true;
    try {
        const response = await fetch("api/auth/change-password", {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}, body: new URLSearchParams(values)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No se pudo cambiar la contraseña.");
        passwordDialog.close();
        showToast("Contraseña actualizada.");
    } catch (error) { message.textContent = error.message; }
    finally { submit.disabled = false; }
});
document.getElementById("logoutButton").addEventListener("click", async () => {
    await fetch("api/auth/logout", {method: "POST"});
    window.location.replace("registro.html");
});


/* =========================================================
   UTILIDADES
   ========================================================= */

function initials(name) {

    return name
        .split(" ")
        .slice(0, 2)
        .map(word => word.charAt(0))
        .join("")
        .toUpperCase();

}


function showToast(message) {

    const existingToast = document.querySelector(".toast");

    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");

    toast.className = "toast";
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.remove();

    }, 2500);
}


/* =========================================================
   COMPONENTES
   ========================================================= */

function pageHeader(title, description = "") {

    return `
        <div class="page-header">

            <div>

                <h1>${title}</h1>

                ${
                    description
                        ? `<p>${description}</p>`
                        : ""
                }

                <div class="page-title-line"></div>

            </div>

        </div>
    `;
}


function filters(type = "default") {

    if (type === "personal") {

        return `
            <div class="filter-bar">

                <div class="filter-group">
                    <label>Edad</label>

                    <select class="filter-select">
                        <option>Todos</option>
                        <option>18 - 25</option>
                        <option>26 - 35</option>
                        <option>36 - 45</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Orden</label>

                    <select class="filter-select">
                        <option>Alfabético</option>
                        <option>Más recientes</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Rol</label>

                    <select class="filter-select">
                        <option>Todos</option>
                        <option>Director</option>
                        <option>Administrativo</option>
                    </select>
                </div>

                <div class="filter-group search-box">

                    <input
                        type="text"
                        class="filter-input"
                        placeholder="Búsqueda..."
                    >

                </div>

            </div>
        `;
    }


    if (type === "documents") {

        return `
            <div class="filter-bar">

                <div class="filter-group">
                    <label>Tipo de usuario</label>

                    <select class="filter-select">
                        <option>Todos</option>
                        <option>Alumno</option>
                        <option>Profesor</option>
                        <option>Personal</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Por alumno</label>

                    <select class="filter-select">
                        <option>Todos</option>
                        <option>Juan Pérez</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Orden</label>

                    <select class="filter-select">
                        <option>Más recientes</option>
                        <option>Más antiguos</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Documento</label>

                    <select class="filter-select">
                        <option>Todos</option>
                        <option>CURP</option>
                        <option>Acta</option>
                        <option>Credencial</option>
                    </select>
                </div>

                <div class="filter-group search-box">

                    <input
                        type="text"
                        class="filter-input"
                        placeholder="Búsqueda..."
                    >

                </div>

            </div>
        `;
    }


    return `
        <div class="filter-bar">

            <div class="filter-group">

                <label>Edad</label>

                <select class="filter-select">
                    <option>Todos</option>
                    <option>6 - 10</option>
                    <option>11 - 15</option>
                    <option>16 - 18</option>
                </select>

            </div>


            <div class="filter-group">

                <label>Orden</label>

                <select class="filter-select">
                    <option>Alfabético</option>
                    <option>Más recientes</option>
                </select>

            </div>


            <div class="filter-group">

                <label>Playera</label>

                <select class="filter-select">
                    <option>Todas</option>
                    <option>#10</option>
                    <option>#14</option>
                </select>

            </div>


            <div class="filter-group">

                <label>Adeudos</label>

                <select class="filter-select">
                    <option>Todos</option>
                    <option>Con adeudo</option>
                    <option>Sin adeudo</option>
                </select>

            </div>


            <div class="filter-group search-box">

                <input
                    type="text"
                    class="filter-input"
                    placeholder="Buscar alumno..."
                >

            </div>

        </div>
    `;
}


function studentHeader() {

    return `
        <div class="student-header">

            <div class="student-header-info">

                <div class="student-avatar-large">
                    JP
                </div>

                <div>

                    <h2>Juan Pérez</h2>

                    <p>
                        Alumno · 16 años · Categoría 2009-2012
                    </p>

                </div>

            </div>

            <button
                class="btn btn-primary"
                onclick="goTo('alumnos')"
            >
                ← Regresar
            </button>

        </div>
    `;
}


function studentTabs(active) {

    return `
        <div class="tabs">

            <button
                class="tab ${active === "personal" ? "active" : ""}"
                onclick="goTo('alumno-personal')"
            >
                Información Personal
            </button>

            <button
                class="tab ${active === "deportiva" ? "active" : ""}"
                onclick="goTo('alumno-deportiva')"
            >
                Información Deportiva
            </button>

            <button
                class="tab ${active === "financiera" ? "active" : ""}"
                onclick="goTo('alumno-financiera')"
            >
                Información Financiera
            </button>

            <button
                class="tab ${active === "administrativa" ? "active" : ""}"
                onclick="goTo('alumno-administrativa')"
            >
                Información Administrativa
            </button>

        </div>
    `;
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function dashboardView() {

    return `

        <div class="welcome">

            <h1>
                Bienvenido de nuevo administrador
            </h1>

            <p>
                Lunes 16 de septiembre de 2026
            </p>

            <div class="page-title-line"></div>

        </div>


        <div class="dashboard-grid">


            <!-- ACTIVIDADES -->

            <section class="card">

                <div class="card-title">

                    <span>Próximas actividades</span>

                    <small>Septiembre 2026</small>

                </div>


                <div class="activity-list">

                    <div class="activity-item">

                        <div class="activity-date">

                            <strong>23</strong>

                            <span>Miércoles</span>

                        </div>

                        <div class="activity-info">

                            <strong>Entrenamiento</strong>

                            <span>Categoría 2009-2012</span>

                        </div>

                    </div>


                    <div class="activity-item">

                        <div class="activity-date">

                            <strong>25</strong>

                            <span>Viernes</span>

                        </div>

                        <div class="activity-info">

                            <strong>Entrenamiento</strong>

                            <span>Categoría 2009-2012</span>

                        </div>

                    </div>


                    <div class="activity-item">

                        <div class="activity-date">

                            <strong>28</strong>

                            <span>Lunes</span>

                        </div>

                        <div class="activity-info">

                            <strong>Entrenamiento</strong>

                            <span>Categoría 2009-2012</span>

                        </div>

                    </div>

                </div>

            </section>


            <!-- BITÁCORA -->

            <section class="card">

                <div class="card-title">

                    <span>Actividad reciente</span>

                    <small>Bitácora</small>

                </div>


                <div class="log-list">

                    <div class="log-item payment">

                        <strong>Tema: Pagos</strong>

                        <span>
                            Alumno: Juan
                        </span>

                        <span>
                            Concepto: Uniforme
                        </span>

                        <span>
                            Total: $500
                        </span>

                    </div>


                    <div class="log-item student">

                        <strong>Tema: Alumno Nuevo</strong>

                        <span>
                            Alumno: Luis
                        </span>

                        <span>
                            Solicitud: muestraLuis.pdf
                        </span>

                    </div>

                </div>

            </section>


            <!-- CALENDARIO -->

            <section class="calendar">

                <div class="calendar-header">

                    <h3>
                        Septiembre 2026
                    </h3>

                    <div class="calendar-nav">

                        <button>‹</button>
                        <button>›</button>

                    </div>

                </div>


                ${calendarHTML()}

            </section>


            <!-- CONTACTO -->

            <section class="card">

                <div class="card-title">
                    Academia Lobos
                </div>

                <p style="color:#777;font-size:13px;">
                    Información general de la Academia Lobos.
                </p>

                <br>

                <button
                    class="btn btn-primary"
                    onclick="showToast('Sección de contacto visual')"
                >
                    Contáctanos
                </button>

            </section>

        </div>

    `;
}


/* =========================================================
   CALENDARIO
   ========================================================= */

function calendarHTML() {

    const days = [
        "",
        "",
        "1",
        "2",
        "3",
        "4",
        "5",

        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",

        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",

        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",

        "27",
        "28",
        "29",
        "30",
        "",
        "",
        ""
    ];


    const names = [
        "Dom",
        "Lun",
        "Mar",
        "Mié",
        "Jue",
        "Vie",
        "Sáb"
    ];


    let html = `
        <div class="calendar-grid">
    `;


    names.forEach(day => {

        html += `
            <div class="calendar-day-name">
                ${day}
            </div>
        `;

    });


    days.forEach(day => {

        if (!day) {

            html += `
                <div class="calendar-cell empty"></div>
            `;

            return;
        }


        let event = "";


        if (day === "23") {

            event = `
                <div class="calendar-event">
                    Entreno
                </div>
            `;

        }


        if (day === "25") {

            event = `
                <div class="calendar-event">
                    Entreno
                </div>
            `;

        }


        if (day === "28") {

            event = `
                <div class="calendar-event">
                    Entreno
                </div>
            `;

        }


        html += `
            <div class="calendar-cell">

                <div class="calendar-number">
                    ${day}
                </div>

                ${event}

            </div>
        `;

    });


    html += `</div>`;


    return html;
}


/* =========================================================
   ALUMNOS
   ========================================================= */

function alumnosView() {

    return `

        ${pageHeader(
            "Alumnos",
            "Administración y consulta de alumnos."
        )}


        ${filters()}


        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>

                        <th>Alumno</th>
                        <th>Edad</th>
                        <th>Fecha nacimiento</th>
                        <th>Playera</th>
                        <th>Ingreso</th>
                        <th>Adeudo</th>

                    </tr>

                </thead>


                <tbody>

                    <tr
                        class="clickable"
                        onclick="goTo('alumno-personal')"
                    >

                        <td>

                            <div class="student-cell">

                                <div class="avatar">
                                    JP
                                </div>

                                <div>

                                    <div class="student-name">
                                        Juan Pérez
                                    </div>

                                    <div class="student-meta">
                                        Alumno
                                    </div>

                                </div>

                            </div>

                        </td>

                        <td>16</td>

                        <td>10/10/2010</td>

                        <td>#10</td>

                        <td>20/07/2025</td>

                        <td>

                            <span class="status danger">
                                -$2000
                            </span>

                        </td>

                    </tr>


                    <tr
                        class="clickable"
                        onclick="goTo('alumno-personal')"
                    >

                        <td>

                            <div class="student-cell">

                                <div class="avatar">
                                    LM
                                </div>

                                <div>

                                    <div class="student-name">
                                        Luis Martínez
                                    </div>

                                    <div class="student-meta">
                                        Alumno
                                    </div>

                                </div>

                            </div>

                        </td>

                        <td>14</td>

                        <td>12/04/2012</td>

                        <td>#14</td>

                        <td>01/08/2025</td>

                        <td>

                            <span class="status success">
                                Sin adeudo
                            </span>

                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;
}


/* =========================================================
   INFORMACIÓN PERSONAL
   ========================================================= */

function alumnoPersonalView() {

    return `

        ${pageHeader(
            "Información del alumno",
            "Información personal, médica y familiar."
        )}


        ${studentHeader()}

        ${studentTabs("personal")}


        <div class="info-grid">


            <div class="info-card">

                <h3>
                    Información personal
                </h3>

                ${infoRow("Nombre", "Juan Pérez")}

                ${infoRow("Fecha de nacimiento", "10/09/2009")}

                ${infoRow("Edad", "16 años")}

                ${infoRow("Escuela", "Escuelita")}

                ${infoRow("Dirección", "Calle 14")}

                ${infoRow("Fecha de ingreso", "01/10/2025")}

                ${infoRow("CURP", "XXXXXXXXXXXXXX")}

            </div>


            <div class="info-card">

                <h3>
                    Información médica
                </h3>

                ${infoRow("Tipo de sangre", "O+")}

                ${infoRow("Alergias", "Ninguna")}

                ${infoRow("Seguro", "Ninguno")}

            </div>


            <div class="info-card">

                <h3>
                    Familia / Tutor
                </h3>

                ${infoRow("Padre", "Juan Pérez")}

                ${infoRow("Teléfono", "XXXXXXXXXX")}

                ${infoRow("Madre", "María Pérez")}

                ${infoRow("Teléfono", "XXXXXXXXXX")}

                ${infoRow("Tutor", "Tutor registrado")}

                ${infoRow("Teléfono", "XXXXXXXXXX")}

                ${infoRow("Dirección", "Calle 14")}

            </div>

        </div>

    `;
}


function infoRow(label, value) {

    return `
        <div class="info-row">

            <span class="info-label">
                ${label}
            </span>

            <span class="info-value">
                ${value}
            </span>

        </div>
    `;
}


/* =========================================================
   INFORMACIÓN DEPORTIVA
   ========================================================= */

function alumnoDeportivaView() {

    return `

        ${pageHeader(
            "Información deportiva",
            "Información deportiva y estadística del alumno."
        )}


        ${studentHeader()}

        ${studentTabs("deportiva")}


        <div class="info-grid">


            <div class="info-card">

                <h3>
                    Información deportiva
                </h3>

                ${infoRow("Alumno", "Juan Pérez")}

                ${infoRow("Fecha de nacimiento", "10/09/2009")}

                ${infoRow("Edad", "16 años")}

                ${infoRow("Número", "#14")}

                ${infoRow("Nombre playera", "Juan")}

                ${infoRow("Categoría", "2009-2012")}

            </div>


            <div class="info-card">

                <h3>
                    Estadísticas
                </h3>

                ${infoRow("Partidos", "4")}

                ${infoRow("Goles", "0")}

            </div>


            <div class="info-card">

                <h3>
                    Evaluación
                </h3>

                ${infoRow("Estado", "Pendiente")}

                <button
                    class="btn btn-primary"
                    onclick="showToast('Evaluación disponible posteriormente')"
                >
                    Consultar evaluación
                </button>

            </div>

        </div>

    `;
}


/* =========================================================
   INFORMACIÓN FINANCIERA DEL ALUMNO
   ========================================================= */

function alumnoFinancieraView() {

    return `

        ${pageHeader(
            "Información financiera",
            "Balance e historial de pagos del alumno."
        )}


        ${studentHeader()}

        ${studentTabs("financiera")}


        <div class="balance-card">

            <div class="balance-label">
                Saldo actual
            </div>

            <div class="balance-value">
                -$2500
            </div>

        </div>


        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>Concepto</th>
                        <th>Periodo</th>
                        <th>Monto</th>
                        <th>Estado</th>
                    </tr>

                </thead>

                <tbody>

                    <tr>

                        <td>Mensualidad</td>

                        <td>Septiembre</td>

                        <td>$500</td>

                        <td>
                            <span class="status success">
                                Pagado
                            </span>
                        </td>

                    </tr>


                    <tr>

                        <td>Mensualidad</td>

                        <td>Agosto</td>

                        <td>$0</td>

                        <td>
                            <span class="status danger">
                                Adeudo
                            </span>
                        </td>

                    </tr>


                    <tr>

                        <td>Torneo</td>

                        <td>Periodo actual</td>

                        <td>$100</td>

                        <td>
                            <span class="status success">
                                Pagado
                            </span>
                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;
}


/* =========================================================
   INFORMACIÓN ADMINISTRATIVA DEL ALUMNO
   ========================================================= */

function alumnoAdministrativaView() {

    return `

        ${pageHeader(
            "Información administrativa",
            "Estado de la documentación del alumno."
        )}


        ${studentHeader()}

        ${studentTabs("administrativa")}


        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>Documento</th>
                        <th>Estado</th>
                        <th>Acción</th>
                    </tr>

                </thead>

                <tbody>

                    <tr>

                        <td>CURP</td>

                        <td>
                            <span class="status success">
                                Listo
                            </span>
                        </td>

                        <td>
                            <button
                                class="btn btn-outline btn-small"
                                onclick="showToast('Vista de documento')"
                            >
                                Ver
                            </button>
                        </td>

                    </tr>


                    <tr>

                        <td>Acta</td>

                        <td>
                            <span class="status success">
                                Listo
                            </span>
                        </td>

                        <td>
                            <button
                                class="btn btn-outline btn-small"
                                onclick="showToast('Vista de documento')"
                            >
                                Ver
                            </button>
                        </td>

                    </tr>


                    <tr>

                        <td>Credencial</td>

                        <td>
                            <span class="status danger">
                                No listo
                            </span>
                        </td>

                        <td>
                            <button
                                class="btn btn-primary btn-small"
                                onclick="showToast('Carga de documento próximamente')"
                            >
                                Cargar
                            </button>
                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;
}


/* =========================================================
   PERSONAL
   ========================================================= */

function personalView() {

    return `

        ${pageHeader(
            "Personal",
            "Administración de profesores y personal administrativo."
        )}


        <div class="module-options">


            <div
                class="module-card"
                onclick="goTo('profesores')"
            >

                <div class="module-icon">
                    P
                </div>

                <h2>
                    Administrar Profesores
                </h2>

                <p>
                    Consulta y administración de profesores
                    de la Academia.
                </p>

            </div>


            <div
                class="module-card"
                onclick="goTo('administrativo')"
            >

                <div class="module-icon">
                    A
                </div>

                <h2>
                    Administrar Personal
                </h2>

                <p>
                    Consulta y administración del personal
                    administrativo.
                </p>

            </div>


        </div>

    `;
}


/* =========================================================
   PROFESORES
   ========================================================= */

function profesoresView() {

    return `

        ${pageHeader(
            "Profesores",
            "Administrar profesores de la Academia Lobos."
        )}


        <div class="filter-bar">

            <div class="filter-group">
                <label>Edad</label>

                <select class="filter-select">
                    <option>Todos</option>
                    <option>18 - 30</option>
                    <option>31 - 45</option>
                    <option>46+</option>
                </select>
            </div>


            <div class="filter-group">
                <label>Orden</label>

                <select class="filter-select">
                    <option>Alfabético</option>
                    <option>Más recientes</option>
                </select>
            </div>


            <div class="filter-group">
                <label>Categoría</label>

                <select class="filter-select">
                    <option>Todas</option>
                    <option>2009-2012</option>
                </select>
            </div>


            <div class="filter-group search-box">

                <input
                    class="filter-input"
                    placeholder="Búsqueda..."
                >

            </div>

        </div>


        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>Profesor</th>
                        <th>Edad</th>
                        <th>Fecha nacimiento</th>
                        <th>Categoría</th>
                        <th>Acción</th>
                    </tr>

                </thead>


                <tbody>

                    <tr>

                        <td>

                            <div class="student-cell">

                                <div class="avatar">
                                    JP
                                </div>

                                <div>
                                    <div class="student-name">
                                        Juan Pérez
                                    </div>

                                    <div class="student-meta">
                                        Profesor
                                    </div>
                                </div>

                            </div>

                        </td>

                        <td>40</td>

                        <td>10/10/1986</td>

                        <td>2009-2012</td>

                        <td>

                            <button
                                class="btn btn-primary btn-small"
                                onclick="goTo('planeacion')"
                            >
                                Planeación
                            </button>

                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;
}


/* =========================================================
   PLANEACIÓN
   ========================================================= */

function planeacionView() {

    return `

        ${pageHeader(
            "Planeación",
            "Planeación de entrenamiento del profesor."
        )}


        <div class="planning-layout">


            <div class="card">

                <div class="card-title">

                    <span>
                        Miércoles 23 de Septiembre
                    </span>

                    <span class="status success">
                        Entrenamiento
                    </span>

                </div>


                <div class="exercise-list">

                    <div class="exercise">

                        <div class="exercise-number">
                            1
                        </div>

                        <div>

                            <strong>
                                Calentamiento Clásico
                            </strong>

                            <span>
                                Ejercicio 1
                            </span>

                        </div>

                    </div>


                    <div class="exercise">

                        <div class="exercise-number">
                            2
                        </div>

                        <div>

                            <strong>
                                Rutina Tren Inferior 2
                            </strong>

                            <span>
                                Ejercicio 2
                            </span>

                        </div>

                    </div>


                    <div class="exercise">

                        <div class="exercise-number">
                            3
                        </div>

                        <div>

                            <strong>
                                Rondo de Pases 3
                            </strong>

                            <span>
                                Ejercicio 3
                            </span>

                        </div>

                    </div>

                </div>


                <br>


                ${infoRow(
                    "Objetivo de sesión",
                    "XXXXXXXXX"
                )}

                ${infoRow(
                    "Observaciones",
                    "XXXXXXXX"
                )}

                ${infoRow(
                    "Profesor",
                    "Juanito"
                )}

            </div>


            <div class="card">

                <div class="card-title">
                    Próximos entrenos
                </div>


                <div class="upcoming-item">

                    <strong>
                        Miércoles 23
                    </strong>

                    <span>
                        Entrenamiento
                    </span>

                </div>


                <div class="upcoming-item">

                    <strong>
                        Viernes 25
                    </strong>

                    <span>
                        Entrenamiento
                    </span>

                </div>


                <div class="upcoming-item">

                    <strong>
                        Lunes 28
                    </strong>

                    <span>
                        Entrenamiento
                    </span>

                </div>

            </div>

        </div>

    `;
}


/* =========================================================
   PERSONAL ADMINISTRATIVO
   ========================================================= */

function administrativoView() {

    return `

        ${pageHeader(
            "Personal administrativo",
            "Administrar personal de la Academia."
        )}


        ${filters("personal")}


        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>Personal</th>
                        <th>Edad</th>
                        <th>Fecha nacimiento</th>
                        <th>Categoría</th>
                        <th>Rol</th>
                    </tr>

                </thead>


                <tbody>

                    <tr>

                        <td>

                            <div class="student-cell">

                                <div class="avatar">
                                    JP
                                </div>

                                <div>

                                    <div class="student-name">
                                        Juan Pérez
                                    </div>

                                    <div class="student-meta">
                                        Personal administrativo
                                    </div>

                                </div>

                            </div>

                        </td>

                        <td>40</td>

                        <td>10/10/1986</td>

                        <td>2009-1012</td>

                        <td>

                            <span class="status neutral">
                                Director
                            </span>

                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;
}


/* =========================================================
   FINANZAS
   ========================================================= */

function finanzasView() {

    return `

        ${pageHeader(
            "Finanzas",
            "Consulta y administración financiera de alumnos."
        )}


        ${filters()}


        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>

                        <th>Alumno</th>
                        <th>DOB</th>
                        <th>Agosto</th>
                        <th>Septiembre</th>
                        <th>Octubre</th>
                        <th>Arbitraje</th>
                        <th>Uniforme</th>
                        <th>Saldo</th>
                        <th>Añadir pago</th>
                        <th>Estado</th>

                    </tr>

                </thead>


                <tbody>

                    <tr>

                        <td>Juan López</td>

                        <td>10/09/2009</td>

                        <td>$700</td>

                        <td>$700</td>

                        <td>$700</td>

                        <td>$0</td>

                        <td>$500</td>

                        <td>
                            <span class="status danger">
                                -$250
                            </span>
                        </td>

                        <td>

                            <button
                                class="btn btn-primary btn-small"
                                onclick="showToast('Módulo de pagos próximamente')"
                            >
                                + Pago
                            </button>

                        </td>

                        <td>

                            <button
                                class="btn btn-outline btn-small"
                                onclick="showToast('Estado de cuenta')"
                            >
                                Ver
                            </button>

                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;
}


/* =========================================================
   EQUIPOS
   ========================================================= */

function equiposView() {

    return `

        ${pageHeader(
            "Equipos",
            "Administración de categorías y evaluaciones."
        )}


        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>Categoría</th>
                        <th>Edad</th>
                        <th>Profesor</th>
                        <th>Torneo</th>
                        <th>Administrar</th>
                        <th>Evaluaciones</th>
                    </tr>

                </thead>


                <tbody>

                    <tr>

                        <td>2009-2012</td>

                        <td>16</td>

                        <td>Profe Juan</td>

                        <td>Torneo X</td>

                        <td>

                            <button
                                class="btn btn-primary btn-small"
                                onclick="goTo('categorias')"
                            >
                                Administrar
                            </button>

                        </td>

                        <td>

                            <button
                                class="btn btn-outline btn-small"
                                onclick="goTo('evaluaciones')"
                            >
                                Evaluaciones
                            </button>

                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;
}


/* =========================================================
   ADMINISTRAR CATEGORÍA
   ========================================================= */

function categoriasView() {

    return `

        ${pageHeader(
            "Administrar categoría",
            "Categoría 2009-2012."
        )}


        <div class="info-grid">


            <div class="info-card">

                <h3>
                    Categoría
                </h3>

                ${infoRow("Categoría", "2009-2012")}

                ${infoRow("Edad", "16")}

                ${infoRow("Profesor", "Profe Juan")}

                ${infoRow("Torneo", "Torneo X")}

            </div>


            <div class="info-card">

                <h3>
                    Profesor
                </h3>

                ${infoRow("Nombre", "Juan")}

                ${infoRow("Edad", "40")}

                ${infoRow("Fecha nacimiento", "10/10/2000")}

            </div>

        </div>


        <br>


        <div class="card">

            <div class="card-title">

                <span>
                    Jugadores
                </span>

                <button
                    class="btn btn-primary"
                    onclick="showToast('Agregar jugador próximamente')"
                >
                    + Agregar jugador
                </button>

            </div>


            <div class="table-container">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>Jugador</th>
                            <th>Edad</th>
                            <th>Fecha nacimiento</th>
                            <th>Número</th>
                            <th>Ingreso</th>
                        </tr>

                    </thead>


                    <tbody>

                        <tr>

                            <td>Juan Pérez</td>

                            <td>16</td>

                            <td>10/10/2010</td>

                            <td>#10</td>

                            <td>20/07/2025</td>

                        </tr>

                    </tbody>

                </table>

            </div>

        </div>

    `;
}


/* =========================================================
   EVALUACIONES
   ========================================================= */

function evaluacionesView() {

    return `

        ${pageHeader(
            "Evaluaciones",
            "Evaluación deportiva de los jugadores."
        )}


        <div class="evaluation-header">

            <div class="student-cell">

                <div class="avatar">
                    JP
                </div>

                <div>

                    <div class="student-name">
                        Juan Pérez
                    </div>

                    <div class="student-meta">
                        16 años · #10 · Categoría 2009-2012
                    </div>

                </div>

            </div>


            <br>


            ${infoRow(
                "Profesor",
                "Profesor Pedro"
            )}

            ${infoRow(
                "Periodo",
                "10 junio - 10 julio"
            )}


            <div class="evaluation-categories">

                <div class="evaluation-category active">
                    Técnico
                </div>

                <div class="evaluation-category">
                    Táctico
                </div>

                <div class="evaluation-category">
                    Físico
                </div>

                <div class="evaluation-category">
                    Mental
                </div>

                <div class="evaluation-category">
                    General
                </div>

            </div>

        </div>


        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>

                        <th>Aspecto</th>
                        <th>Evaluación</th>
                        <th>Observaciones</th>

                    </tr>

                </thead>


                <tbody>

                    <tr>
                        <td>Pase</td>
                        <td>XXXXXXXX</td>
                        <td>XXXXXXXX</td>
                    </tr>

                    <tr>
                        <td>Tiro</td>
                        <td>XXXXXXXX</td>
                        <td>XXXXXXXX</td>
                    </tr>

                    <tr>
                        <td>Cabeceo</td>
                        <td>XXXXXXXX</td>
                        <td>XXXXXXXX</td>
                    </tr>

                    <tr>
                        <td>Control</td>
                        <td>XXXXXXXX</td>
                        <td>XXXXXXXX</td>
                    </tr>

                </tbody>

            </table>

        </div>

    `;
}


/* =========================================================
   CALENDARIO
   ========================================================= */

function calendarioView() {

    return `

        ${pageHeader(
            "Calendario",
            "Agenda y actividades de la Academia."
        )}


        <div class="filter-bar">

            <div class="filter-group">

                <label>Vista</label>

                <select class="filter-select">

                    <option>Mes</option>
                    <option>Semana</option>
                    <option>Año</option>

                </select>

            </div>


            <div class="filter-group">

                <label>Bitácora</label>

                <select class="filter-select">

                    <option>Mostrar</option>
                    <option>Ocultar</option>

                </select>

            </div>


            <div class="filter-group">

                <label>Solo entreno</label>

                <select class="filter-select">

                    <option>No</option>
                    <option>Sí</option>

                </select>

            </div>


            <button
                class="btn btn-dark"
                onclick="goTo('bitacora')"
            >
                Ver bitácora
            </button>

        </div>


        <div class="calendar-module">


            <section class="calendar">

                <div class="calendar-header">

                    <h3>
                        Septiembre 2026
                    </h3>

                    <div class="calendar-nav">

                        <button>‹</button>
                        <button>›</button>

                    </div>

                </div>


                ${calendarHTML()}

            </section>


            <aside class="upcoming">

                <div class="card-title">
                    Próximos eventos
                </div>


                <div class="upcoming-item">

                    <strong>
                        19/09/2026
                    </strong>

                    <span>
                        Entreno
                    </span>

                </div>


                <div class="upcoming-item">

                    <strong>
                        20/09/2026
                    </strong>

                    <span>
                        Partido
                    </span>

                </div>


                <div class="upcoming-item">

                    <strong>
                        Lunes 21
                    </strong>

                    <span>
                        Junta
                    </span>

                </div>


                <div class="upcoming-item">

                    <strong>
                        Miércoles 23
                    </strong>

                    <span>
                        Entreno
                    </span>

                </div>


                <div class="upcoming-item">

                    <strong>
                        Viernes 25
                    </strong>

                    <span>
                        Entreno
                    </span>

                </div>

            </aside>

        </div>

    `;
}


/* =========================================================
   BITÁCORA
   ========================================================= */

function bitacoraView() {

    return `

        ${pageHeader(
            "Bitácora",
            "Registro de actividad administrativa."
        )}


        <div class="dashboard-grid">


            <section class="card">

                <div class="card-title">
                    Lunes 16 de septiembre de 2026
                </div>


                <div class="log-list">


                    <div class="log-item payment">

                        <strong>
                            Tema: Pagos
                        </strong>

                        <span>
                            Alumno: Juan
                        </span>

                        <span>
                            Concepto: Uniforme
                        </span>

                        <span>
                            Total: $500
                        </span>

                    </div>


                    <div class="log-item student">

                        <strong>
                            Tema: Alumno Nuevo
                        </strong>

                        <span>
                            Alumno: Luis
                        </span>

                        <span>
                            Solicitud: muestraLuis.pdf
                        </span>

                    </div>


                </div>

            </section>


            <aside class="upcoming">

                <div class="card-title">
                    Próximas fechas
                </div>


                <div class="upcoming-item">

                    <strong>
                        19/09/2026
                    </strong>

                </div>


                <div class="upcoming-item">

                    <strong>
                        20/09/2026
                    </strong>

                </div>


                <div class="upcoming-item">

                    <strong>
                        Lunes 21
                    </strong>

                </div>


                <div class="upcoming-item">

                    <strong>
                        Miércoles 23
                    </strong>

                </div>


                <div class="upcoming-item">

                    <strong>
                        Viernes 25
                    </strong>

                </div>

            </aside>

        </div>

    `;
}


/* =========================================================
   DOCUMENTOS
   ========================================================= */

function documentosView() {

    return `

        ${pageHeader(
            "Documentos",
            "Consulta de documentación registrada."
        )}


        ${filters("documents")}


        <div class="table-container">

            <table class="data-table">

                <thead>

                    <tr>
                        <th>Documento</th>
                        <th>Alumno</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                        <th>Acción</th>
                    </tr>

                </thead>


                <tbody>

                    <tr>

                        <td>

                            <div class="student-cell">

                                <div class="document-icon">
                                    PDF
                                </div>

                                <div>
                                    CURP
                                </div>

                            </div>

                        </td>

                        <td>
                            Juan Pérez
                        </td>

                        <td>
                            CURP
                        </td>

                        <td>
                            11/09/2001
                        </td>

                        <td>

                            <button
                                class="btn btn-outline btn-small"
                                onclick="showToast('Vista previa del documento')"
                            >
                                Ver
                            </button>

                        </td>

                    </tr>


                    <tr>

                        <td>

                            <div class="student-cell">

                                <div class="document-icon">
                                    PDF
                                </div>

                                <div>
                                    Acta
                                </div>

                            </div>

                        </td>

                        <td>
                            Juan Pérez
                        </td>

                        <td>
                            Acta
                        </td>

                        <td>
                            12/09/2001
                        </td>

                        <td>

                            <button
                                class="btn btn-outline btn-small"
                                onclick="showToast('Vista previa del documento')"
                            >
                                Ver
                            </button>

                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;
}


/* =========================================================
   UNIFORMES
   ========================================================= */

function uniformesView() {

    return `

        ${pageHeader(
            "Uniformes",
            "Administración de pedidos y uniformes."
        )}


        <div class="uniform-layout">


            <div class="order-list">


                <div class="order-item active">

                    <strong>
                        Pedido Visitas
                    </strong>

                    <span>
                        Cantidad: 40
                    </span>

                    <span>
                        Fecha: 10/10/2020
                    </span>

                    <span>
                        Fábrica: Fábrica Alve
                    </span>

                </div>


                <div class="order-item">

                    <strong>
                        Pedido Local
                    </strong>

                    <span>
                        Cantidad: 30
                    </span>

                    <span>
                        Fecha: XX/XX/XXXX
                    </span>

                    <span>
                        Fábrica: Fábrica Zublima
                    </span>

                </div>


            </div>


            <div class="table-container">

                <table class="data-table">

                    <thead>

                        <tr>

                            <th>Tipo</th>
                            <th>Talla</th>
                            <th>Nombre</th>
                            <th>Número</th>
                            <th>Alumno</th>

                        </tr>

                    </thead>


                    <tbody>

                        <tr>

                            <td>
                                Visita
                            </td>

                            <td>
                                M
                            </td>

                            <td>
                                Juanito
                            </td>

                            <td>
                                69
                            </td>

                            <td>
                                Juan López
                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>

        </div>

    `;
}


/* =========================================================
   RUTAS
   ========================================================= */

const routes = {

    dashboard: dashboardView,

    alumnos: alumnosView,

    "alumno-personal": alumnoPersonalView,

    "alumno-deportiva": alumnoDeportivaView,

    "alumno-financiera": alumnoFinancieraView,

    "alumno-administrativa": alumnoAdministrativaView,

    personal: personalView,

    profesores: profesoresView,

    planeacion: planeacionView,

    administrativo: administrativoView,

    finanzas: finanzasView,

    equipos: equiposView,

    categorias: categoriasView,

    evaluaciones: evaluacionesView,

    calendario: calendarioView,

    bitacora: bitacoraView,

    documentos: documentosView,

    uniformes: uniformesView

};


/* =========================================================
   MÓDULOS PARA EL ACTIVE DEL MENÚ
   ========================================================= */

const moduleRoutes = {

    alumnos: [
        "alumnos",
        "alumno-personal",
        "alumno-deportiva",
        "alumno-financiera",
        "alumno-administrativa"
    ],

    personal: [
        "personal",
        "profesores",
        "planeacion",
        "administrativo"
    ],

    finanzas: [
        "finanzas"
    ],

    equipos: [
        "equipos",
        "categorias",
        "evaluaciones"
    ],

    calendario: [
        "calendario",
        "bitacora"
    ],

    documentos: [
        "documentos"
    ],

    uniformes: [
        "uniformes"
    ]

};


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function goTo(route) {

    window.location.hash = route;

}


function getCurrentRoute() {

    const hash = window.location.hash.replace("#", "");

    if (!hash) {

        return "dashboard";

    }

    return routes[hash]
        ? hash
        : "dashboard";
}


function updateActiveNavigation(route) {

    const links = mainNav.querySelectorAll("a[data-route]");

    links.forEach(link => {

        link.classList.remove("active");

    });


    Object.keys(moduleRoutes).forEach(module => {

        if (moduleRoutes[module].includes(route)) {

            const link = mainNav.querySelector(
                `[data-route="${module}"]`
            );

            if (link) {

                link.classList.add("active");

            }

        }

    });

}


function render() {

    const route = getCurrentRoute();

    const view = routes[route];

    if (!view) {

        appContent.innerHTML = dashboardView();

        return;

    }


    appContent.innerHTML = view();


    updateActiveNavigation(route);


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    // Cierra menú móvil
    mainNav.classList.remove("open");

}


/* =========================================================
   MENÚ MÓVIL
   ========================================================= */

menuToggle.addEventListener("click", () => {

    mainNav.classList.toggle("open");

});


/* =========================================================
   EVENTOS
   ========================================================= */

window.addEventListener("hashchange", render);


/* =========================================================
   INICIO
   ========================================================= */

if (!window.location.hash) {

    window.location.hash = "dashboard";

} else {

    render();

}
