const API_URL = 'https://mystikaboutique.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
  cargarDisfraces();

  // Sidebar Móvil Toggle
  const toggleBtn = document.getElementById('toggle-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const open = document.getElementById('sidebar').classList.toggle('active');
      if (backdrop) backdrop.classList.toggle('show', open);
    });
  }
  if (backdrop) backdrop.addEventListener('click', cerrarSidebarMovil);

  // Cerrar modales con Escape o clic en el fondo
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(m => { if (m.style.display === 'flex') closeModal(m.id); });
    }
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) closeModal(m.id); });
  });

  // Guardar Nuevo Disfraz
  const formNuevo = document.getElementById('form-nuevo-disfraz');
  if (formNuevo) {
    formNuevo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      // Limpiar puntos del campo precio por si ingresaron 75.000
    let precio = formData.get('precioAlquiler');
    if (precio) {
      formData.set('precioAlquiler', precio.toString().replace(/\./g, ''));
    }
    try{
      const res = await fetch(`${API_URL}/disfraces`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        cancelarAgregarDisfraz(); // Limpia formulario, imagen y cierra modal
        showToast('Disfraz agregado al catálogo', 'success');
        cargarDisfraces();
      } else {
        const errData = await res.json();
        showToast(`Error al guardar: ${errData.error || 'Verifica la consola'}`, 'error');
      }
    } catch (err) {
      showToast('No se pudo conectar con el servidor', 'error');
    }
    });
  }

  // Procesar Alquiler
  const formAlquilar = document.getElementById('form-alquilar');
  if (formAlquilar) {
    formAlquilar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        disfrazId: document.getElementById('alquiler-disfraz-id').value,
        cedulaCliente: document.getElementById('alq-cedula').value,
        nombreCliente: document.getElementById('alq-nombre').value,
        telefonoCliente: document.getElementById('alq-telefono').value,
        fechaDevolucionProgramada: document.getElementById('alq-fecha-dev').value,
        pin: document.getElementById('alq-pin').value
      };

      const res = await fetch(`${API_URL}/alquileres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        showToast('¡Alquiler registrado exitosamente!', 'success');
        closeModal('modal-alquilar');
        e.target.reset();
        cargarDisfraces();
      } else {
        showToast(`Error: ${data.error}`, 'error');
      }
    });
  }

  // Previsualización de la imagen seleccionada
  const inputImagen = document.getElementById('input-imagen-disfraz');
  if (inputImagen) {
    inputImagen.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const previewImg = document.getElementById('preview-imagen');
          const previewContainer = document.getElementById('container-preview-imagen');
          if (previewImg && previewContainer) {
            previewImg.src = event.target.result;
            previewContainer.classList.add('show');
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
});


// 1. Abrir modal para eliminar un único disfraz
function abrirModalEliminar(id) {
  document.getElementById('eliminar-disfraz-id').value = id;
  openModal('modal-eliminar-disfraz');
}

// 2. Event listener para procesar la eliminación con PIN
document.getElementById('form-eliminar-disfraz').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('eliminar-disfraz-id').value;
  const pin = document.getElementById('eliminar-pin').value;

  const res = await fetch(`${API_URL}/disfraces/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });

  if (res.ok) {
    closeModal('modal-eliminar-disfraz');
    e.target.reset();
    showToast('Disfraz eliminado', 'success');
    cargarDisfraces();
  } else {
    const data = await res.json();
    showToast(`Error: ${data.error}`, 'error');
  }
});

//funcion para cargar Disfraces
async function cargarDisfraces() {
  const res = await fetch(`${API_URL}/disfraces`);
  const disfraces = await res.json();
  const grid = document.getElementById('costumes-grid');
  if (!grid) return;
  if (!disfraces.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-mask"></i>
        <h3>No hay disfraces aún</h3>
        <p>Usa “Agregar Disfraz” para crear el primero.</p>
      </div>`;
    return;
  }

  grid.innerHTML = disfraces.map(item => {
    const isAvailable = item.stockDisponible > 0;
    const isLow = isAvailable && item.stockDisponible <= Math.max(1, Math.floor(item.stockTotal * 0.25));
    const stockClass = !isAvailable ? 'empty' : (isLow ? 'warning' : 'available');

    return `
      <article class="card costume-card">
        <div class="card-media">
          <span class="category-badge">${item.categoria}</span>
          <div class="card-actions">
            <button class="icon-btn discount" title="Aplicar descuento"
              onclick="abrirModalPrecio('${item._id}', ${item.precioAlquiler})">
              <i class="fa-solid fa-tag"></i>
            </button>
            <button class="icon-btn delete" title="Eliminar disfraz"
              onclick="abrirModalEliminar('${item._id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
          <img src="${item.imagenUrl}" class="card-img" alt="${item.nombre}" loading="lazy">
        </div>
        <div class="card-body">
          <h3 class="card-title">${item.nombre}</h3>
          <div class="card-price">$${item.precioAlquiler.toLocaleString('es-CO')} <small>/ alquiler</small></div>
          <div class="chip-row">
            <span class="chip"><i class="fa-solid fa-ruler"></i> Talla ${item.talla}</span>
            <span class="stock-badge ${stockClass}">${item.stockDisponible} / ${item.stockTotal} disp.</span>
          </div>
          <div class="card-footer">
            <button class="btn ${isAvailable ? 'btn-primary' : ''} btn-block"
              ${!isAvailable ? 'disabled' : ''}
              onclick="abrirModalAlquilar('${item._id}')">
              ${isAvailable ? 'Alquilar <i class="fa-solid fa-arrow-right"></i>' : 'Agotado'}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function abrirModalAlquilar(disfrazId) {
  document.getElementById('alquiler-disfraz-id').value = disfrazId;
  openModal('modal-alquilar');
}

async function cargarAlquileres() {
  const cedulaInput = document.getElementById('search-cedula');
  const cedula = cedulaInput ? cedulaInput.value : '';
  const url = cedula ? `${API_URL}/alquileres?cedula=${cedula}` : `${API_URL}/alquileres`;
  
  const res = await fetch(url);
  const alquileres = await res.json();
  const tbody = document.getElementById('alquileres-table-body');
  if (!tbody) return;
  if (!alquileres.length) {
    tbody.innerHTML = `
      <tr class="empty-row"><td colspan="7">
        <i class="fa-solid fa-receipt"></i>&nbsp; No se encontraron alquileres${cedula ? ` para la cédula ${cedula}` : ''}.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = alquileres.map(a => {
    const fAlquiler = formatearFechaLocal(a.fechaAlquiler || a.createdAt);
    const fDevolucion = formatearFechaLocal(a.fechaDevolucionProgramada);
    const isActivo = a.estado === 'ACTIVO';

    return `
      <tr>
        <td><strong>${a.cedulaCliente}</strong></td>
        <td>${a.nombreCliente}</td>
        <td>${a.disfrazId ? a.disfrazId.nombre : 'N/A'}</td>
        <td>${fAlquiler}</td>
        <td>${fDevolucion}</td>
        <td><span class="stock-badge ${isActivo ? 'warning' : 'available'}">${a.estado}</span></td>
        <td>
          ${isActivo ? `
            <button class="btn btn-success btn-sm" onclick="devolverDisfraz('${a._id}')">
              <i class="fa-solid fa-rotate-left"></i> Devolver
            </button>
          ` : '<span style="color: var(--text-dim)">—</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.style.display = 'flex';
  const firstInput = modal.querySelector('input:not([type="hidden"])');
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function cerrarSidebarMovil() {
  document.getElementById('sidebar').classList.remove('active');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.classList.remove('show');
}

// Notificaciones tipo toast (reemplaza alert)
function showToast(mensaje, tipo = 'info', duracion = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const iconos = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<i class="fa-solid ${iconos[tipo] || iconos.info}"></i><span></span>`;
  toast.querySelector('span').textContent = mensaje;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duracion);
}

// Función para eliminar solo la imagen seleccionada
function quitarImagenCargada() {
  const inputImagen = document.getElementById('input-imagen-disfraz');
  const previewImg = document.getElementById('preview-imagen');
  const previewContainer = document.getElementById('container-preview-imagen');

  if (inputImagen) inputImagen.value = '';
  if (previewImg) previewImg.src = '';
  if (previewContainer) previewContainer.classList.remove('show');
}

// Función para resetear todo el formulario y cerrar el modal al cancelar
function cancelarAgregarDisfraz() {
  const form = document.getElementById('form-nuevo-disfraz');
  if (form) form.reset();
  quitarImagenCargada();
  closeModal('modal-nuevo-disfraz');
}

// 1. Solución de Fecha de Devolución exacta (evita mostrar el día anterior por zona horaria UTC)
function formatearFechaLocal(fechaIso) {
  if (!fechaIso) return 'N/A';
  const dateObj = new Date(fechaIso);
  // Usar getUTCDate() / getUTCMonth() si se guardó como ISO String YYYY-MM-DD
  const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
  const fechaAjustada = new Date(dateObj.getTime() + userTimezoneOffset);
  return fechaAjustada.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function devolverDisfraz(alquilerId) {
  document.getElementById('devolver-alquiler-id').value = alquilerId;
  openModal('modal-devolver');
}

document.getElementById('form-devolver').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alquilerId = document.getElementById('devolver-alquiler-id').value;
  const pin = document.getElementById('devolver-pin').value;

  const res = await fetch(`${API_URL}/alquileres/${alquilerId}/devolver`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });

  const data = await res.json();
  if (res.ok) {
    closeModal('modal-devolver');
    e.target.reset();
    showToast('Disfraz devuelto con éxito', 'success');
    cargarAlquileres();
  } else {
    showToast(`Error: ${data.error}`, 'error');
  }
});

// 4. Cambiar Precio / Descuento
function abrirModalPrecio(disfrazId, precioActual) {
  document.getElementById('precio-disfraz-id').value = disfrazId;
  document.getElementById('nuevo-precio-val').value = precioActual;
  openModal('modal-cambiar-precio');
}

document.getElementById('form-cambiar-precio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('precio-disfraz-id').value;
  const precioAlquiler = document.getElementById('nuevo-precio-val').value;
  const pin = document.getElementById('precio-pin').value;

  const res = await fetch(`${API_URL}/disfraces/${id}/precio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ precioAlquiler, pin })
  });

  if (res.ok) {
    closeModal('modal-cambiar-precio');
    document.getElementById('precio-pin').value = '';
    showToast('Precio actualizado', 'success');
    cargarDisfraces();
  } else {
    const data = await res.json();
    showToast(`Error: ${data.error}`, 'error');
  }
});


// 5. Vaciar Inventario Completo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
document.getElementById('form-vaciar-todo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pin = document.getElementById('vaciar-pin').value;

  const res = await fetch(`${API_URL}/disfraces/vaciar/todo`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });

  if (res.ok) {
    showToast('Inventario y alquileres eliminados por completo', 'success');
    closeModal('modal-vaciar-todo');
    e.target.reset();
    cargarDisfraces();
  } else {
    const data = await res.json();
    showToast(`Error: ${data.error}`, 'error');
  }
});

// 6. Cargar Métricas Diarias
async function cargarMetricas() {
  const [resAlq, resDisf] = await Promise.all([
    fetch(`${API_URL}/alquileres`),
    fetch(`${API_URL}/disfraces`)
  ]);
  const alquileres = await resAlq.json();
  const disfraces = await resDisf.json();

  const hoyStr = new Date().toISOString().split('T')[0];
  let totalHoy = 0;
  let acumuladoTotal = 0;
  let activos = 0;

  alquileres.forEach(a => {
    const precio = a.disfrazId ? a.disfrazId.precioAlquiler : 0;
    acumuladoTotal += precio;
    if (a.estado === 'ACTIVO') activos++;

    const fechaAlqStr = new Date(a.fechaAlquiler || a.createdAt).toISOString().split('T')[0];
    if (fechaAlqStr === hoyStr) {
      totalHoy += precio;
    }
  });

  const agotados = disfraces.filter(d => d.stockDisponible === 0).length;

  document.getElementById('ingresos-hoy').textContent = `$${totalHoy.toLocaleString('es-CO')}`;
  document.getElementById('ingresos-totales').textContent = `$${acumuladoTotal.toLocaleString('es-CO')}`;
  document.getElementById('alquileres-activos').textContent = activos;
  document.getElementById('disfraces-agotados').textContent = agotados;
}

// 7. Navegación entre Pestañas
const SECCIONES = {
  catalogo:   { titulo: 'Catálogo de Disfraces',  subtitulo: 'Gestiona tu inventario y registra alquileres', cargar: () => cargarDisfraces() },
  alquileres: { titulo: 'Historial de Alquileres', subtitulo: 'Consulta y gestiona las devoluciones',        cargar: () => cargarAlquileres() },
  metricas:   { titulo: 'Métricas y Conteo Diario', subtitulo: 'Resumen de ingresos e inventario',           cargar: () => cargarMetricas() }
};

function switchSection(section) {
  const cfg = SECCIONES[section];
  if (!cfg) return;

  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-menu a').forEach(a =>
    a.classList.toggle('active', a.dataset.section === section)
  );

  document.getElementById(`sec-${section}`).classList.add('active');
  document.getElementById('section-title').textContent = cfg.titulo;
  document.getElementById('section-subtitle').textContent = cfg.subtitulo;
  cerrarSidebarMovil();
  cfg.cargar();
}