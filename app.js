import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsztog3aptTAs1FLq5UlfOwERtScEOxik",
  authDomain: "wishlist-navidad-60032.firebaseapp.com",
  projectId: "wishlist-navidad-60032",
  storageBucket: "wishlist-navidad-60032.firebasestorage.app",
  messagingSenderId: "996022231424",
  appId: "1:996022231424:web:98157b5602e6e5e6e06165",
  measurementId: "G-XC3MJG7B6G"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias del DOM
const vistaCarpetas = document.getElementById("vista-carpetas");
const vistaProductos = document.getElementById("vista-productos");
const gridCarpetas = document.getElementById("grid-carpetas");
const gridProductos = document.getElementById("grid-productos");
const inputNombreCarpeta = document.getElementById("input-nombre-carpeta");
const btnCrearCarpeta = document.getElementById("btn-crear-carpeta");
const btnVolver = document.getElementById("btn-volver");
const tituloCarpetaActual = document.getElementById("titulo-carpeta-actual");
const inputLinkMl = document.getElementById("input-link-ml");
const inputTitulo = document.getElementById("input-titulo");
const inputPrecio = document.getElementById("input-precio");
const inputImagen = document.getElementById("input-imagen");
const previewImg = document.getElementById("preview-img");
const btnAutocompletar = document.getElementById("btn-autocompletar");
const btnAgregarProducto = document.getElementById("btn-agregar-producto");
const estadoCarga = document.getElementById("estado-carga");

const PLACEHOLDER_IMG = "https://placehold.co/300x300?text=Regalo";

let carpetaActualId = null;
let desuscribirProductos = null;

// Evita que un texto con < o & rompa el HTML
function esc(texto) {
  const d = document.createElement("div");
  d.textContent = texto ?? "";
  return d.innerHTML;
}

// 1. CARGAR CARPETAS EN TIEMPO REAL
const qCarpetas = query(collection(db, "carpetas"), orderBy("creado", "asc"));
onSnapshot(qCarpetas, (snapshot) => {
  gridCarpetas.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.className = "carpeta-card";
    card.innerHTML = `
      <div class="carpeta-icono">📁</div>
      <div class="carpeta-nombre">${esc(data.nombre)}</div>
    `;
    card.onclick = () => abrirCarpeta(docSnap.id, data.nombre);
    gridCarpetas.appendChild(card);
  });
});

// 2. CREAR UNA CARPETA NUEVA
btnCrearCarpeta.onclick = async () => {
  const nombre = inputNombreCarpeta.value.trim();
  if (!nombre) return alert("Escribí un nombre para la carpeta (ej: WishList Mari)");

  inputNombreCarpeta.value = "";
  await addDoc(collection(db, "carpetas"), {
    nombre: nombre,
    creado: Date.now()
  });
};

// 3. ENTRAR A UNA CARPETA Y VER SUS REGALOS
function abrirCarpeta(id, nombre) {
  carpetaActualId = id;
  tituloCarpetaActual.textContent = nombre;
  vistaCarpetas.classList.add("oculto");
  vistaProductos.classList.remove("oculto");
  limpiarFormulario();

  if (desuscribirProductos) desuscribirProductos();

  const qProductos = query(
    collection(db, "productos"),
    where("carpetaId", "==", carpetaActualId)
  );

  desuscribirProductos = onSnapshot(qProductos, (snapshot) => {
    gridProductos.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const prod = docSnap.data();
      const prodId = docSnap.id;

      const card = document.createElement("div");
      card.className = `producto-card ${prod.comprado ? "comprado" : ""}`;

      card.innerHTML = `
        <img src="${esc(prod.imagen || PLACEHOLDER_IMG)}" alt="Producto" class="producto-img">
        <div class="producto-info">
          <div class="producto-titulo">${esc(prod.titulo)}</div>
          <div class="producto-precio">${esc(prod.precio)}</div>
        </div>
        <div class="producto-acciones">
          <a href="${esc(prod.link)}" target="_blank" rel="noopener" class="btn-ml">Ver en Mercado Libre</a>
          <button class="btn-comprar ${prod.comprado ? "ya-comprado" : ""}">
            ${prod.comprado ? "✅ Ya lo compraron" : "🎁 Marcar como comprado"}
          </button>
          <button class="btn-borrar">Eliminar</button>
        </div>
      `;

      // Si la foto no carga, mostrar placeholder
      card.querySelector(".producto-img").onerror = (e) => {
        e.target.onerror = null;
        e.target.src = PLACEHOLDER_IMG;
      };

      card.querySelector(".btn-comprar").onclick = async () => {
        await updateDoc(doc(db, "productos", prodId), { comprado: !prod.comprado });
      };

      card.querySelector(".btn-borrar").onclick = async () => {
        if (confirm("¿Seguro que querés borrar este regalo?")) {
          await deleteDoc(doc(db, "productos", prodId));
        }
      };

      gridProductos.appendChild(card);
    });
  });
}

// 4. VOLVER A LA LISTA DE CARPETAS
btnVolver.onclick = () => {
  carpetaActualId = null;
  vistaProductos.classList.add("oculto");
  vistaCarpetas.classList.remove("oculto");
  estadoCarga.textContent = "";
};

function limpiarFormulario() {
  inputLinkMl.value = "";
  inputTitulo.value = "";
  inputPrecio.value = "";
  inputImagen.value = "";
  previewImg.classList.add("oculto");
  previewImg.removeAttribute("src");
}

// Vista previa de la foto mientras se edita el campo
inputImagen.addEventListener("input", () => {
  const src = inputImagen.value.trim();
  if (src) {
    previewImg.src = src;
    previewImg.classList.remove("oculto");
  } else {
    previewImg.classList.add("oculto");
  }
});
previewImg.onerror = () => previewImg.classList.add("oculto");

// 5. AUTOCOMPLETAR DESDE EL LINK (servicio de previsualización Microlink)
function formatearPrecio(valor) {
  if (!valor) return "";
  const limpio = String(valor).trim();
  // Número puro (ej: "129999" o "129999.00") -> formato argentino
  if (/^\d+(\.\d+)?$/.test(limpio)) {
    return `$ ${Number(limpio).toLocaleString("es-AR")}`;
  }
  // Ya viene formateado (ej: "129.999")
  return `$ ${limpio}`;
}

function limpiarTitulo(titulo) {
  if (!titulo) return "";
  return titulo
    .split(" | ")[0]
    .replace(/\s*-\s*(Mercado\s?Libre|MercadoLibre).*$/i, "")
    .trim();
}

btnAutocompletar.onclick = async () => {
  const url = inputLinkMl.value.trim();
  if (!url) return alert("Pegá primero el link de Mercado Libre");

  estadoCarga.textContent = "Buscando información del producto...";
  btnAutocompletar.disabled = true;

  try {
    const params = new URLSearchParams({ url });
    params.set("data.precioMeta.selector", 'meta[itemprop="price"]');
    params.set("data.precioMeta.attr", "content");
    params.set("data.precioTexto.selector", ".andes-money-amount__fraction");

    const res = await fetch(`https://api.microlink.io/?${params.toString()}`);
    const json = await res.json();

    if (json.status !== "success") throw new Error("Sin datos");
    const d = json.data;

    const titulo = limpiarTitulo(d.title);
    const precio = formatearPrecio(d.precioMeta || d.precioTexto);
    const imagen = d.image?.url || "";

    if (titulo) inputTitulo.value = titulo;
    if (precio) inputPrecio.value = precio;
    if (imagen) {
      inputImagen.value = imagen;
      inputImagen.dispatchEvent(new Event("input"));
    }

    const faltan = [!titulo && "nombre", !precio && "precio", !imagen && "foto"].filter(Boolean);
    estadoCarga.textContent = faltan.length
      ? `Listo, pero no pude traer: ${faltan.join(", ")}. Completalo a mano y agregá el regalo.`
      : "¡Datos cargados! Revisá y tocá Agregar Regalo.";
  } catch (error) {
    estadoCarga.textContent = "No pude leer el link automáticamente. Completá nombre, precio y foto a mano.";
  }

  btnAutocompletar.disabled = false;
};

// 6. GUARDAR EL REGALO
btnAgregarProducto.onclick = async () => {
  const link = inputLinkMl.value.trim();
  const titulo = inputTitulo.value.trim();
  if (!link) return alert("Pegá el link de Mercado Libre primero");
  if (!titulo) return alert("Poné el nombre del producto (o usá Autocompletar)");

  btnAgregarProducto.disabled = true;

  await addDoc(collection(db, "productos"), {
    carpetaId: carpetaActualId,
    titulo: titulo,
    precio: inputPrecio.value.trim() || "Ver precio en el link",
    imagen: inputImagen.value.trim() || PLACEHOLDER_IMG,
    link: link,
    comprado: false,
    creado: Date.now()
  });

  limpiarFormulario();
  estadoCarga.textContent = "¡Regalo agregado!";
  btnAgregarProducto.disabled = false;
  setTimeout(() => { estadoCarga.textContent = ""; }, 2500);
};
