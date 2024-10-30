(async function() {
    try {
        const VERSION = 4;
        const EVENTO = "dgm141c";
        const NUM_FECHA = 2;
        const TIPO_TICKET_ID_MIN = 10;
        const TIPO_TICKET_ID_MAX = 12;
        const BASE_FETCH_PARAMS = {
            headers: { "content-type": "application/json" },
            method: "POST",
            credentials: "include"
        };

        const crearDiv = contenido => {
            const div = document.createElement("div");
            div.style = "position: fixed; z-index: 1000; left: 20px; top: 20px; right: 20px; bottom: 20px; background: blue; color: white; text-align: center; padding: 20px;";
            const container = document.createElement("div");
            container.appendChild(contenido);
            const button = document.createElement("button");
            button.style = "background: black; color: white;";
            button.innerText = "OK";
            div.appendChild(container);
            div.appendChild(button);
            document.body.appendChild(div);
            return new Promise(resolve => {
                button.onclick = () => {
                    document.body.removeChild(div);
                    resolve();
                };
            });
        };

        const mostrarMensaje = async mensaje => {
            const span = document.createElement("span");
            span.innerText = mensaje;
            console.log(mensaje); // Agregamos un log para el diagnóstico
            return await crearDiv(span);
        };

        const seleccionar = async (titulo, opciones, generarValue, generarTexto) => {
            const main = document.createElement("div");
            const divTitulo = document.createElement("div");
            divTitulo.innerText = titulo;
            const select = document.createElement("select");
            select.style = "background: black; color: white;";
            for (const opcion of opciones) {
                const optionElement = document.createElement("option");
                optionElement.style = "background: black; color: white";
                optionElement.innerText = generarTexto(opcion);
                optionElement.setAttribute("value", generarValue(opcion));
                select.appendChild(optionElement);
            }
            main.appendChild(divTitulo);
            main.appendChild(select);
            await crearDiv(main);
            return select.value;
        };

        await mostrarMensaje("Iniciando Mala Queue versión " + VERSION);

        // Paso 1: Esperar hasta que el botón de "Entrar" esté disponible
        const waitForQueueToFinish = async () => {
            return new Promise(resolve => {
                const interval = setInterval(() => {
                    const buttonConfirmRedirect = document.getElementById("buttonConfirmRedirect");
                    if (buttonConfirmRedirect && !buttonConfirmRedirect.disabled) {
                        buttonConfirmRedirect.click();
                        clearInterval(interval);
                        resolve();
                    }
                }, 2000); // Revisamos cada 2 segundos para reducir la carga
            });
        };

        await mostrarMensaje("Esperando para entrar en el sitio...");
        await waitForQueueToFinish();
        await mostrarMensaje("Accediendo a la página de tickets...");

        // Paso 2: Verificar disponibilidad de tickets
        const response1 = await fetch("/Compra/TraerTipoTicketsSectores", {
            ...BASE_FETCH_PARAMS,
            body: JSON.stringify({ eventoID: EVENTO, eventoCalendarioID: NUM_FECHA })
        });

        if (response1.redirected || response1.url.includes("Account/SignIn")) {
            await mostrarMensaje("Necesitas iniciar sesión. Redirigiendo...");
            window.location.href = "https://www.puntoticket.com/Account/SignIn";
            return;
        }

        const body1 = await response1.json();
        const available = body1.TipoTickets
            .filter(x => x.Disponible === 1)
            .filter(x => x.TipoTicketID >= TIPO_TICKET_ID_MIN)
            .filter(x => x.TipoTicketID <= TIPO_TICKET_ID_MAX);

        if (!available.length) {
            await mostrarMensaje("No quedan tickets no numerados disponibles");
            return;
        }

        await mostrarMensaje(`Hay ${available.length} secciones con tickets no numerados disponibles`);
        
        // Paso 3: Selección de sección y cantidad de tickets
        const jcTipoTicket = await seleccionar("Sección", available, seccion => seccion.TipoTicketID, seccion => `${seccion.TipoTicket} (${seccion.Precio})`);
        const jcCantidadTickets = await seleccionar("Cantidad de entradas", [1, 2], x => x.toString(), x => x.toString());

        await mostrarMensaje("Seleccionando y agregando al carrito...");

        // Paso 4: Agregar tickets al carrito
        const response2 = await fetch("/Compra/AgregarMultipleTickets", {
            ...BASE_FETCH_PARAMS,
            body: JSON.stringify({
                EventoID: EVENTO,
                EventoCalendarioID: NUM_FECHA,
                CategoriaTicketID: "1",
                Tickets: [{ TipoTicketID: jcTipoTicket, Cantidad: jcCantidadTickets }]
            })
        });

        const body2 = await response2.json();
        if (!body2.Success) {
            await mostrarMensaje("Error al agregar al carrito: " + body2.ErrorList.join(", "));
            return;
        }

        await mostrarMensaje("Tickets añadidos al carrito. Redirigiendo al pago.");
        window.location.href = "/Compra/Pago";

    } catch (e) {
        console.error("Error:", e);
        await mostrarMensaje("Ocurrió un error: " + e.message);
    }
})();
