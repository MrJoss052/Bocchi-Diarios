const bocchis = {
    inicio: {
        title: "Inicio",
        description: [
            "Bocchi Diarios es un formato de video en el que los creadores de contenido, conocidos como Bocchis, narran su día a día a través de imágenes acompañadas de un texto, con la figura de un personaje de fondo."
        ]
    },
    bocchis: {
        title: "Lista de Bocchis",
        description: [
            "Aquí encontrarás una lista de los Bocchis que forman parte de la comunidad de los Bocchi Diarios.",
            "Cada Bocchi tiene su propia página con información detallada sobre su vida, intereses y curiosidades."
        ]
    },
    buzon: {
        title: "Buzón",
        description: [
            "¿Tenés una opinión, sugerencia, o querés proponer un nuevo Bocchi para la comunidad? Dejanos tu mensaje acá abajo.",
            "También podés escribir para consultar sobre agregar, modificar o eliminar la información de algún Bocchi.",
            "Tu mensaje es completamente privado: solo lo puede ver el equipo de Bocchi Diarios, nunca se publica en la página."
        ]
    },
    creditos: {
        title: "Créditos",
        description: [
            "Equipo de Bocchi Diarios"
        ]
    }
};

async function cargarBocchis() {
    try {
        const resLista = await fetch("bocchis/lista.json");
        const claves = await resLista.json();

        const datos = await Promise.all(
            claves.map(clave => fetch(`bocchis/${clave}.json`).then(res => res.json()))
        );

        claves.forEach((clave, i) => {
            bocchis[clave] = datos[i];
        });
    } catch {
        console.error("No se pudo cargar la lista de Bocchis.");
    }
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const BANDERAS = {
    argentina: "🇦🇷",
    bolivia: "🇧🇴",
    brasil: "🇧🇷",
    chile: "🇨🇱",
    colombia: "🇨🇴",
    "costa rica": "🇨🇷",
    cuba: "🇨🇺",
    ecuador: "🇪🇨",
    "el salvador": "🇸🇻",
    espana: "🇪🇸",
    "estados unidos": "🇺🇸",
    guatemala: "🇬🇹",
    honduras: "🇭🇳",
    mexico: "🇲🇽",
    nicaragua: "🇳🇮",
    panama: "🇵🇦",
    paraguay: "🇵🇾",
    peru: "🇵🇪",
    "puerto rico": "🇵🇷",
    "republica dominicana": "🇩🇴",
    uruguay: "🇺🇾",
    venezuela: "🇻🇪"
};

function obtenerBandera(pais) {
    const normal = pais.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return BANDERAS[normal] || "";
}

function formatearFecha(fecha) {
    const [dia, mes, anio] = fecha.split("/").map(Number);
    const hoy = new Date();
    let edad = hoy.getFullYear() - anio;
    const cumpleEsteAnio = new Date(hoy.getFullYear(), mes - 1, dia);
    if (hoy < cumpleEsteAnio) edad--;
    return `${dia} de ${MESES[mes - 1]} de ${anio} (${edad} años)`;
}

function buscarBocchi(nombre) {
    const normal = nombre.trim().toLowerCase();
    return Object.entries(bocchis).find(([clave, valor]) => {
        return clave.toLowerCase() === normal || (valor.title && valor.title.toLowerCase() === normal);
    });
}

function procesarTexto(texto) {
    return texto.replace(/\{\{([^}]+)\}\}/g, (coincidencia, nombre) => {
        const encontrado = buscarBocchi(nombre);
        if (encontrado) {
            const [clave] = encontrado;
            return `<a href="#${clave}" class="bocchi-mencion valida">${nombre}</a>`;
        }
        return `<span class="bocchi-mencion invalida" title="Bocchi no encontrado">${nombre}</span>`;
    });
}

function renderLista(items, titulo, icono) {
    if (!items || !items.length) return "";
    return `
      <div class="card-stats">
        <h3>${icono} ${titulo}</h3>
        <ul>
          ${items.map(item => `<li>${procesarTexto(item)}</li>`).join("")}
        </ul>
      </div>
    `;
}

const SUPABASE_URL = "https://cmazyixgizxearvzeopj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtYXp5aXhnaXp4ZWFydnplb3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDA0NjAsImV4cCI6MjEwMjIxNjQ2MH0.romiA-uowC11exJLPen-9cRrZrP-9LIgo4yscnRMM5c";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NO_LISTABLES = ["inicio", "bocchis", "buzon", "creditos"];

let visitas = {};

async function cargarVisitas() {
    try {
        const { data, error } = await db.from("visitas").select("*");
        if (error) throw error;
        visitas = {};
        data.forEach(fila => { visitas[fila.bocchi] = fila.cantidad; });
    } catch {
        console.error("No se pudieron cargar las visitas.");
    }
}

async function registrarVisita(clave) {
    const { data, error } = await db.rpc("incrementar_visita", { clave });
    if (error) return;
    visitas[clave] = data;
    const el = document.getElementById("visitas-num");
    if (el) el.textContent = data;
}

function renderIcono(clave, data, numero) {
    const handle = data.atributos && data.atributos.Tiktok ? data.atributos.Tiktok.replace("@", "") : null;
    const avatar = handle ? `https://unavatar.io/tiktok/${handle}` : "";
    const badge = numero ? `<span class="bocchi-rank">#${numero}</span>` : "";
    return `
      <a href="#${clave}" class="bocchi-icono">
        ${badge}
        <img src="${avatar}" alt="${data.title}">
        <span>${data.title}</span>
      </a>
    `;
}

function renderIconos(conNumeros) {
    let items = Object.entries(bocchis).filter(([clave]) => !NO_LISTABLES.includes(clave));
    if (conNumeros) {
        items = [...items]
            .sort((a, b) => (visitas[b[0]] || 0) - (visitas[a[0]] || 0))
            .slice(0, 3);
    }
    return items.map(([clave, valor], i) => renderIcono(clave, valor, conNumeros ? i + 1 : null)).join("");
}

function renderCreditoPersona(nombre, rol) {
    const encontrado = buscarBocchi(nombre);

    if (encontrado) {
        const [clave, data] = encontrado;
        const handle = data.atributos && data.atributos.Tiktok ? data.atributos.Tiktok.replace("@", "") : null;
        const avatar = handle
            ? `https://unavatar.io/tiktok/${handle}`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.title)}&background=44244c&color=fff&size=128&rounded=true&bold=true`;

        return `
          <a href="#${clave}" class="bocchi-icono creditos-persona">
            <img src="${avatar}" alt="${data.title}">
            <span>${data.title}</span>
            <small>${rol}</small>
          </a>
        `;
    }

    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=44244c&color=fff&size=128&rounded=true&bold=true`;
    return `
      <div class="bocchi-icono creditos-persona creditos-generico">
        <img src="${avatar}" alt="${nombre}">
        <span>${nombre}</span>
        <small>${rol}</small>
      </div>
    `;
}

function renderCreditos() {
    return `
      <div class="card-stats">
        <h3>👥 Equipo</h3>
        <div class="creditos-grid">
          ${renderCreditoPersona("Joss", "Creador y programador de la wiki")}
        </div>
      </div>
    `;
}

function renderFormularioBuzon() {
    return `
      <form id="form-buzon" class="card-stats buzon-form">
        <label>
          Nombre (opcional)
          <input type="text" id="buzon-nombre" placeholder="Tu nombre, o dejalo vacío" maxlength="60">
        </label>
        <label>
          Mensaje
          <textarea id="buzon-mensaje" placeholder="Escribí tu opinión, sugerencia o Bocchi a proponer..." maxlength="500" rows="5" required></textarea>
        </label>
        <button type="submit">Enviar</button>
        <p id="buzon-estado" class="buzon-estado"></p>
      </form>
    `;
}

function initBuzon() {
    const form = document.getElementById("form-buzon");
    if (!form) return;

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const nombre = document.getElementById("buzon-nombre").value.trim() || "Desconocido";
        const mensaje = document.getElementById("buzon-mensaje").value.trim();
        const estado = document.getElementById("buzon-estado");
        const boton = form.querySelector("button");

        boton.disabled = true;
        estado.className = "buzon-estado";
        estado.textContent = "Enviando...";

        const { error } = await db.from("Buzón").insert({ nombre, mensaje });

        boton.disabled = false;

        if (error) {
            estado.classList.add("error");
            estado.textContent = "Ocurrió un error, intentá de nuevo.";
        } else {
            estado.classList.add("exito");
            estado.textContent = "¡Gracias! Tu mensaje fue enviado.";
            form.reset();
        }
    });
}

function loadPage() {
    window.scrollTo(0, 0);

    const hash = window.location.hash.replace("#", "");
    const pageCurr = hash || "inicio";

    const data = bocchis[pageCurr] || bocchis["inicio"];
    const content = document.getElementById("wiki-content");

    const activeHandle = data.atributos && data.atributos.Tiktok
        ? data.atributos.Tiktok.replace("@", "")
        : null;

    const avatarHTML = activeHandle
        ? `<img src="https://unavatar.io/tiktok/${activeHandle}" alt="${data.title}" class="bocchi-avatar">`
        : "";

    const visitasHTML = data.atributos
        ? `<span class="visitas-contador">visitas: <span id="visitas-num">${visitas[pageCurr] ?? 0}</span></span>`
        : "";

    let descHTML = "";
    if (Array.isArray(data.description)) {
        descHTML = data.description.map(p => `<p class="wiki-desc-p">${procesarTexto(p)}</p>`).join("");
    } else {
        descHTML = `<p class="wiki-desc-p">${procesarTexto(data.description)}</p>`;
    }

    let atributosHTML = "";
    if (data.atributos) {
        const nuevosAtributos = {};

        Object.entries(data.atributos).forEach(([clave, valor]) => {
            nuevosAtributos[clave] = valor;

            if (clave === "Nacionalidad") {
                const linkVideo = data.video_mas_popular || (data.atributos.Tiktok ? `https://www.tiktok.com/${data.atributos.Tiktok}` : "#");
                nuevosAtributos["Video más popular"] = `<a href="${linkVideo}" target="_blank" rel="noopener noreferrer" class="wiki-link">Ver Video 🎬</a>`;
            }
        });

        atributosHTML = `
      <div class="card-stats">
        <h3>📊 Información</h3>
        <ul>
          ${Object.entries(nuevosAtributos).map(([clave, valor]) => {
            let valorFinal = valor === null ? "???" : valor;

            if (clave === "Tiktok" && typeof valorFinal === "string" && valorFinal.startsWith("@")) {
                valorFinal = `<a href="https://www.tiktok.com/${valorFinal}" target="_blank" rel="noopener noreferrer" class="wiki-link">${valorFinal}</a>`;
            }

            if (clave === "Seguidores") {
                valorFinal = `<span class="seguidores-info" data-tooltip="Actualizado manualmente, espera un momento">${valorFinal}</span>`;
            }

            if (clave === "Nacimiento" && typeof valorFinal === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(valorFinal)) {
                valorFinal = formatearFecha(valorFinal);
            }

            if (clave === "Nacionalidad" && typeof valorFinal === "string") {
                const bandera = obtenerBandera(valorFinal);
                if (bandera) valorFinal = `${valorFinal} ${bandera}`;
            }

            return `<li><strong>${clave}:</strong> ${valorFinal}</li>`;
        }).join("")}
        </ul>
      </div>
    `;
    }

    const iniciosHTML = renderLista(data.inicios, "Inicios", "🌱");
    const curiosidadesHTML = renderLista(data.curiosidades, "Curiosidades", "✨");

    const showcaseHTML = pageCurr === "inicio" ? `
      <div class="inicio-showcase">
        <h3 class="inicio-showcase-title">Top 3 Bocchis más visitados</h3>
        <div class="inicio-showcase-grid">${renderIconos(true)}</div>
      </div>
    ` : "";
    const bocchisGridHTML = pageCurr === "bocchis" ? `<div class="bocchis-grid">${renderIconos(false)}</div>` : "";
    const buzonHTML = pageCurr === "buzon" ? renderFormularioBuzon() : "";
    const creditosHTML = pageCurr === "creditos" ? renderCreditos() : "";

    content.innerHTML = `
    <article class="wiki-article">
      <div class="article-header">
        ${avatarHTML}
        <div class="article-heading">
          <h1>${data.title}</h1>
          ${visitasHTML}
        </div>
      </div>
      <div class="wiki-desc-container">
        ${descHTML}
      </div>
      ${showcaseHTML}
      ${bocchisGridHTML}
      ${buzonHTML}
      ${creditosHTML}
      ${atributosHTML}
      ${iniciosHTML}
      ${curiosidadesHTML}
    </article>
  `;

    document.querySelectorAll(".wiki-nav a").forEach(link => {
        const href = link.getAttribute("href");
        if ((href === "#" && pageCurr === "inicio") || href === `#${pageCurr}`) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });

    if (data.atributos) registrarVisita(pageCurr);

    initBuzon();
}

function initBuscador() {
    const input = document.querySelector(".search-box input");
    const lista = document.getElementById("search-results");
    if (!input || !lista) return;

    function mostrarTop3() {
        const items = Object.entries(bocchis)
            .filter(([clave]) => !NO_LISTABLES.includes(clave))
            .sort((a, b) => (visitas[b[0]] || 0) - (visitas[a[0]] || 0))
            .slice(0, 3);

        lista.innerHTML = items.length
            ? `<li class="search-top-label">Más visitados</li>` + items.map(([clave, valor]) => `<li><a href="#${clave}">${valor.title}</a></li>`).join("")
            : `<li class="no-result">Todavía no hay Bocchis</li>`;

        lista.classList.add("show");
    }

    input.addEventListener("input", () => {
        const texto = input.value.trim().toLowerCase();

        if (!texto) {
            mostrarTop3();
            return;
        }

        const resultados = Object.entries(bocchis).filter(([clave, valor]) => {
            return !NO_LISTABLES.includes(clave) && valor.title.toLowerCase().includes(texto);
        });

        lista.innerHTML = resultados.length
            ? resultados.map(([clave, valor]) => `<li><a href="#${clave}">${valor.title}</a></li>`).join("")
            : `<li class="no-result">Sin resultados</li>`;

        lista.classList.add("show");
    });

    input.addEventListener("focus", () => {
        if (input.value.trim()) {
            lista.classList.add("show");
        } else {
            mostrarTop3();
        }
    });

    document.addEventListener("click", (evento) => {
        if (!evento.target.closest(".search-box")) {
            lista.classList.remove("show");
        }
    });

    lista.addEventListener("click", (evento) => {
        if (evento.target.closest("a")) {
            input.value = "";
            lista.classList.remove("show");
        }
    });
}

window.addEventListener("hashchange", loadPage);
window.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([cargarBocchis(), cargarVisitas()]);
    loadPage();
    initBuscador();
});