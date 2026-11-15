import { initializeApp } from "https://gstatic.com";
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, orderBy 
} from "https://gstatic.com";

// =========================================================================
// REEMPLAZÁ ESTOS DATOS CON LOS DE TU PROYECTO GRATUITO EN FIREBASE
// =========================================================================
  const firebaseConfig = {
    apiKey: "AIzaSyDsztog3aptTAs1FLq5UlfOwERtScEOxik",
    authDomain: "wishlist-navidad-60032.firebaseapp.com",
    projectId: "wishlist-navidad-60032",
    storageBucket: "wishlist-navidad-60032.firebasestorage.app",
    messagingSenderId: "996022231424",
    appId: "1:996022231424:web:98157b5602e6e5e6e06165",
    measurementId: "G-XC3MJG7B6G"
  };

// Inicializar Firebase
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
const btnAgregarProducto = document.getElementById("btn-agregar-producto");
const estadoCarga = document.getElementById("estado-carga");

let carpetaActualId = null;
let desuscribirProductos = null;

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
      <div class="carpeta-nombre">${data.nombre}</div>
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
        <img src="${prod.imagen}" alt="Producto" class="producto-img">
        <div class="producto-info">
          <div class="producto-titulo">${prod.titulo}</div>
          <div class="producto-precio">${prod.precio}</div>
        </div>
        <div class="producto-acciones">
          <a href="${prod.link}" target="_blank" class="btn-ml">Ver en Mercado Libre</a>
          <button class="btn-comprar ${prod.comprado ? "ya-comprado" : ""}">
            ${prod.comprado ? "✅ Ya lo compraron" : "🎁 Marcar como comprado"}
          </button>
          <button class="btn-borrar">Eliminar</button>
        </div>
      `;

      // Botón marcar como comprado / disponible
      card.querySelector(".btn-comprar").onclick = async () => {
        await updateDoc(doc(db, "productos", prodId), {
          comprado: !prod.comprado
        });
      };

      // Botón eliminar
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

// 5. OBTENER DATOS DE MERCADO LIBRE Y GUARDAR REGALO
btnAgregarProducto.onclick = async () => {
  const url = inputLinkMl.value.trim();
  if (!url) return alert("Pegá el link de Mercado Libre primero");

  estadoCarga.textContent = "Buscando información del producto...";
  btnAgregarProducto.disabled = true;

  let titulo = "Regalo de Mercado Libre";
  let precio = "Ver precio en el link";
  let imagen = "https://mlstatic.com";

  // Buscar el código MLA seguido de números en el link
  const match = url.match(/MLA-?(\d+)/i);

  if (match && match[1]) {
    const itemId = `MLA${match[1]}`;
    try {
      const res = await fetch(`https://mercadolibre.com{itemId}`);
      if (res.ok) {
        const data = await res.json();
        titulo = data.title;
        precio = `$ ${data.price.toLocaleString("es-AR")}`;
        // Usar imagen de alta calidad
        imagen = data.pictures && data.pictures[0] ? data.pictures[0].secure_url : data.thumbnail;
      }
    } catch (error) {
      console.log("No se pudo leer la API automáticamente, se guarda con datos por defecto.");
    }
  }

  await addDoc(collection(db, "productos"), {
    carpetaId: carpetaActualId,
    titulo: titulo,
    precio: precio,
    imagen: imagen,
    link: url,
    comprado: false,
    creado: Date.now()
  });

  inputLinkMl.value = "";
  estadoCarga.textContent = "¡Regalo agregado!";
  btnAgregarProducto.disabled = false;
  setTimeout(() => { estadoCarga.textContent = ""; }, 2500);
};
