 /* App JS - maneja productos, clientes, ventas y pagos (localStorage + FIFO para pagos) */
document.addEventListener('DOMContentLoaded', () => {

// ======= Storage util =======
const Storage = {
keys: { productos:'app_productos', clientes:'app_clientes', ventas:'app_ventas', pagos:'app_pagos' },
load(key) {
const raw = localStorage.getItem(key);
if (!raw) return [];
try { return JSON.parse(raw); } catch(e){ return []; }
},
save(key,value){ localStorage.setItem(key, JSON.stringify(value)); },
getProductos(){ return this.load(this.keys.productos); },
setProductos(arr){ this.save(this.keys.productos, arr); },
getClientes(){ return this.load(this.keys.clientes); },
setClientes(arr){ this.save(this.keys.clientes, arr); },
getVentas(){ return this.load(this.keys.ventas); },
setVentas(arr){ this.save(this.keys.ventas, arr); },
getPagos(){ return this.load(this.keys.pagos); },
setPagos(arr){ this.save(this.keys.pagos, arr); }
};

// ======= Datos iniciales (si no existen) =======
if(!Storage.getProductos().length){
Storage.setProductos([
{id:'p1', marca:'Nike', modelo:'Air Max', color:'Blanco', talla:42, precioVenta:2000, stock:10},
{id:'p2', marca:'Adidas', modelo:'Superstar', color:'Negro', talla:40, precioVenta:1800, stock:15}
]);
}
if(!Storage.getClientes().length){
Storage.setClientes([
{id:'c1', nombre:'Juan Perez', direccion:'Calle 1', telefono:'123456789'},
{id:'c2', nombre:'Ana Gomez', direccion:'Calle 2', telefono:'987654321'}
]);
}

// ======= Helper =======
function formatMoney(n){ return Number(n).toFixed(2); }
function findClienteById(id){ return Storage.getClientes().find(c=>c.id===id); }
function calcularSaldoCliente(id){
const ventas = Storage.getVentas().filter(v=>v.clienteId===id && v.saldoPendiente>0);
return ventas.reduce((s,v)=>s+Number(v.saldoPendiente),0);
}

// ======= Render Clientes =======
function renderClientes(){
const tabla = document.getElementById('tablaClientes');
if(!tabla) return;
const clientes = Storage.getClientes();
tabla.innerHTML = clientes.map(c => {
const saldo = calcularSaldoCliente(c.id);
return `<tr>       <td>${c.nombre}</td>       <td>${c.direccion}</td>       <td>${c.telefono}</td>       <td>$${formatMoney(saldo)}</td>       <td>         <button class="btn btn-info btn-sm" data-hist="${c.id}">Historial</button>         <button class="btn btn-secondary btn-sm" data-pdf="${c.id}">PDF</button>         <button class="btn btn-danger btn-sm" data-del="${c.id}">Eliminar</button>       </td>     </tr>`;
}).join('');

tabla.querySelectorAll('[data-del]').forEach(btn=>{
btn.addEventListener('click', ()=>{
if(!confirm('Eliminar cliente y sus referencias?')) return;
const id = btn.dataset.del;
const nuevos = Storage.getClientes().filter(c=>c.id!==id);
Storage.setClientes(nuevos);
renderClientes();
renderSelects();
renderPagos();
renderVentas();
});
});

tabla.querySelectorAll('[data-hist]').forEach(btn=>{
btn.addEventListener('click', ()=>verHistorialCliente(btn.dataset.hist));
});

tabla.querySelectorAll('[data-pdf]').forEach(btn=>{
btn.addEventListener('click', ()=>generarEstadoCuenta(btn.dataset.pdf));
});
}

// ======= Render Productos =======
function renderProductos(){
const tabla = document.getElementById('tablaProductos');
if(!tabla) return;
const productos = Storage.getProductos();
tabla.innerHTML = productos.map(p=>`<tr> <td>${p.marca}</td><td>${p.modelo}</td><td>${p.color}</td><td>${p.talla}</td> <td>$${formatMoney(p.precioVenta)}</td><td>${p.stock}</td> <td> <button class="btn btn-danger btn-sm" data-del="${p.id}">Eliminar</button> </td>

  </tr>`).join('');

tabla.querySelectorAll('[data-del]').forEach(btn=>{
btn.addEventListener('click', ()=>{
if(!confirm('Eliminar producto?')) return;
const nuevos = Storage.getProductos().filter(p=>p.id!==btn.dataset.del);
Storage.setProductos(nuevos);
renderProductos();
renderSelects();
});
});
}

// ======= Render Ventas (tabla principal) =======
function renderVentas(){
const tabla = document.getElementById('tablaVentas');
if(!tabla) return;
const ventas = Storage.getVentas();
tabla.innerHTML = ventas.map(v=>`<tr> <td>${v.clienteNombre || 'Contado'}</td> <td>${v.items.map(i=>i.descripcion).join(', ')}</td> <td>${v.items.reduce((s,i)=>s+i.cantidad,0)}</td> <td>${v.fecha}</td> <td>${v.tipoPago}</td> <td>$${formatMoney(v.total)}</td>

  </tr>`).join('');
}

// ======= Render Pagos (tabla) =======
function renderPagos(){
const tabla = document.getElementById('tablaPagos');
if(!tabla) return;
const pagos = Storage.getPagos();
const clientes = Storage.getClientes();
tabla.innerHTML = pagos.map(p=>{
const cliente = clientes.find(c=>c.id===p.clienteId);
return `<tr>       <td>${cliente ? cliente.nombre : '—'}</td>       <td>${p.descripcion || ''}</td>       <td>$${formatMoney(p.monto)}</td>       <td>${p.fecha}</td>       <td>${p.formaPago}</td>     </tr>`;
}).join('');
}

// ======= Selects =======
const ventaProductoSelect = document.getElementById('venta_producto');
const ventaClienteSelect = document.getElementById('venta_cliente');
const clientePagoSelect = document.getElementById('clientePago');

function renderSelects(){
// productos select (ventas)
if(ventaProductoSelect){
const productos = Storage.getProductos();
if(!productos.length){
ventaProductoSelect.innerHTML = '<option value="">No hay productos</option>';
} else {
ventaProductoSelect.innerHTML = productos.map(p => `<option value="${p.id}" data-precio="${p.precioVenta}" data-stock="${p.stock}">
        ${p.marca} ${p.modelo} ${p.color} ${p.talla} - $${p.precioVenta} (${p.stock} disponibles)       </option>`).join('');
const first = productos[0];
const precioInput = document.getElementById('venta_precio');
if(precioInput) precioInput.value = first.precioVenta;
}
}
// clientes select (ventas)
if(ventaClienteSelect){
const clientes = Storage.getClientes();
ventaClienteSelect.innerHTML = `<option value="">-- (Selecciona) --</option>` + clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}
// clientes select (pagos)
if(clientePagoSelect){
const clientes = Storage.getClientes();
clientePagoSelect.innerHTML = `<option value="">-- (Selecciona) --</option>` + clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}
}

// ======= Carrito =======
let cart = [];
const cartDiv = document.getElementById('cart');
function renderCart(){
if(!cartDiv) return;
if(cart.length===0){ cartDiv.innerHTML='<em>Carrito vacío</em>'; return; }
let html = '<table class="table table-sm"><thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Subtotal</th><th></th></tr></thead><tbody>';
cart.forEach((l, idx) => {
html += `<tr>       <td>${l.descripcion}</td>       <td>${l.cantidad}</td>       <td>$${formatMoney(l.precio)}</td>       <td>$${formatMoney(l.subtotal)}</td>       <td><button class="btn btn-sm btn-outline-danger" data-cart-remove="${idx}">X</button></td>     </tr>`;
});
const total = cart.reduce((s,l)=>s+l.subtotal,0);
html += `</tbody></table><div class="text-end"><strong>Total: $${formatMoney(total)}</strong></div>`;
cartDiv.innerHTML = html;

cartDiv.querySelectorAll('[data-cart-remove]').forEach(btn=>{
btn.addEventListener('click', ()=> {
const idx = Number(btn.dataset.cartRemove);
cart.splice(idx,1);
renderCart();
});
});
}

// ======= Eventos: seleccionar producto cambia precio =======
if(ventaProductoSelect){
ventaProductoSelect.addEventListener('change', ()=>{
const opt = ventaProductoSelect.selectedOptions[0];
if(!opt) return;
const precio = opt.dataset.precio;
const precioInput = document.getElementById('venta_precio');
if(precioInput) precioInput.value = precio;
});
}

// ======= Agregar al carrito =======
const formVenta = document.getElementById('ventaForm');
if(formVenta){
formVenta.addEventListener('submit', e=>{
e.preventDefault();
const prodId = ventaProductoSelect.value;
const productos = Storage.getProductos();
const p = productos.find(pr=>pr.id===prodId);
if(!p) return alert('Producto no encontrado');
const cantidad = parseInt(document.getElementById('venta_cantidad').value) || 1;
if(cantidad > p.stock) return alert('No hay suficiente stock');
const precio = parseFloat(document.getElementById('venta_precio').value);
cart.push({
id:'line-'+Date.now(),
productoId: prodId,
descripcion:`${p.marca} ${p.modelo} ${p.color} ${p.talla}`,
cantidad, precio,
subtotal: Number((cantidad*precio).toFixed(2))
});
renderCart();
});
}

// ======= Finalizar venta =======
const btnFinalizar = document.getElementById('btnFinalizarVenta');
if(btnFinalizar){
btnFinalizar.addEventListener('click', ()=>{
if(cart.length===0) return alert('Carrito vacío');
const tipoPago = document.getElementById('venta_tipoPago') ? document.getElementById('venta_tipoPago').value : 'Contado';
const clienteId = document.getElementById('venta_cliente') ? document.getElementById('venta_cliente').value : null;
const cliente = clienteId ? findClienteById(clienteId) : null;
if(tipoPago==='Crédito' && !clienteId) return alert('Selecciona un cliente para crédito');


const total = cart.reduce((s,l)=>s+l.subtotal,0);
const venta = {
  id:'venta-'+Date.now(),
  fecha: new Date().toISOString().slice(0,10),
  tipoPago,
  total: Number(total.toFixed(2)),
  clienteId: tipoPago==='Crédito' ? clienteId : null,
  clienteNombre: tipoPago==='Crédito' ? (cliente ? cliente.nombre : '') : 'Contado',
  items: cart.map(c=>({ ...c })),
  saldoPendiente: tipoPago==='Crédito' ? Number(total.toFixed(2)) : 0
};

// guardar venta
const ventas = Storage.getVentas();
ventas.push(venta);
Storage.setVentas(ventas);

// actualizar stock
const productos = Storage.getProductos();
cart.forEach(l=>{
  const prod = productos.find(p=>p.id===l.productoId);
  if(prod) prod.stock = Number((prod.stock - l.cantidad).toFixed(2));
});
Storage.setProductos(productos);

// limpiar
cart = [];
renderCart();
renderSelects();
renderVentas();
renderClientes();
alert('Venta guardada');


});
}

// ======= Limpiar carrito =======
const btnLimpiar = document.getElementById('btnLimpiarCart');
if(btnLimpiar){
btnLimpiar.addEventListener('click', ()=>{ cart=[]; renderCart(); });
}

// ======= Registrar producto =======
const productoForm = document.getElementById('productoForm');
if(productoForm){
productoForm.addEventListener('submit', e=>{
e.preventDefault();
const marca = document.getElementById('marca').value.trim();
const modelo = document.getElementById('modelo').value.trim();
const color = document.getElementById('color').value.trim();
const talla = Number(document.getElementById('talla').value);
const precio = Number(document.getElementById('precioCompra').value);
const stock = Number(document.getElementById('stock').value);
const id = 'p'+Date.now();
const productos = Storage.getProductos();
productos.push({id, marca, modelo, color, talla, precioCompra:0, precioVenta:precio, stock});
Storage.setProductos(productos);
productoForm.reset();
renderProductos();
renderSelects();
alert('Producto guardado');
});
}

// ======= Registrar cliente =======
const clienteForm = document.getElementById('clienteForm');
if(clienteForm){
clienteForm.addEventListener('submit', e=>{
e.preventDefault();
const nombre = document.getElementById('nombre').value.trim();
const direccion = document.getElementById('direccion').value.trim();
const telefono = document.getElementById('telefono').value.trim();
if(!nombre) return alert('Nombre requerido');
const id = 'c'+Date.now();
const clientes = Storage.getClientes();
clientes.push({id, nombre, direccion, telefono});
Storage.setClientes(clientes);
clienteForm.reset();
renderClientes();
renderSelects();
alert('Cliente guardado');
});
}

// ======= Registrar pago (FIFO) =======
const pagoForm = document.getElementById('pagoForm');
if(pagoForm){
pagoForm.addEventListener('submit', e=>{
e.preventDefault();
const clienteId = document.getElementById('clientePago').value;
const descripcion = document.getElementById('productoPago').value.trim();
const monto = Number(document.getElementById('cantidadPago').value);
const fecha = document.getElementById('fechaPago').value;
const formaPago = document.getElementById('formaPago').value;
if(!clienteId) return alert('Selecciona cliente');
if(monto <= 0) return alert('Monto inválido');


// guardar pago
const pago = { id:'pago-'+Date.now(), clienteId, descripcion, monto: Number(monto.toFixed(2)), fecha, formaPago };
const pagos = Storage.getPagos();
pagos.push(pago);
Storage.setPagos(pagos);

// aplicar FIFO a ventas pendientes del cliente
const ventas = Storage.getVentas();
// ordenar por fecha (más antigua primero) y por id
const pendientes = ventas
  .filter(v=>v.clienteId===clienteId && v.saldoPendiente>0)
  .sort((a,b)=> new Date(a.fecha) - new Date(b.fecha) || a.id.localeCompare(b.id));

let restante = monto;
for(const v of pendientes){
  if(restante <= 0) break;
  const aplicar = Math.min(restante, v.saldoPendiente);
  v.saldoPendiente = Number((v.saldoPendiente - aplicar).toFixed(2));
  restante = Number((restante - aplicar).toFixed(2));
}
Storage.setVentas(ventas);

// actualizar interfaces
renderPagos();
renderVentas();
renderClientes();
alert('Pago registrado y aplicado (FIFO).');
pagoForm.reset();


});
}

// ======= Historial cliente (ventanas simples) =======
function verHistorialCliente(id){
const cliente = findClienteById(id);
if(!cliente) return alert('Cliente no encontrado');
const ventas = Storage.getVentas().filter(v=>v.clienteId===id);
const pagos = Storage.getPagos().filter(p=>p.clienteId===id);
let mensaje = `Cliente: ${cliente.nombre}\n\nVENTAS A CRÉDITO:\n`;
if(ventas.length===0) mensaje += '— ninguna —\n'; else {
ventas.forEach(v=>{
mensaje += `ID:${v.id} Fecha:${v.fecha} Total:$${formatMoney(v.total)} Saldo:$${formatMoney(v.saldoPendiente)}\n`;
});
}
mensaje += `\nPAGOS:\n`;
if(pagos.length===0) mensaje += '— ninguno —\n'; else {
pagos.forEach(p=>{
mensaje += `ID:${p.id} Fecha:${p.fecha} Monto:$${formatMoney(p.monto)} Desc:${p.descripcion}\n`;
});
}
const saldo = calcularSaldoCliente(id);
mensaje += `\nSALDO PENDIENTE: $${formatMoney(saldo)}`;
alert(mensaje);
}

// ======= Generar PDF estado de cuenta =======
function generarEstadoCuenta(id){
const cliente = findClienteById(id);
if(!cliente) return alert('Cliente no encontrado');
const ventas = Storage.getVentas().filter(v=>v.clienteId===id);
const pagos = Storage.getPagos().filter(p=>p.clienteId===id);
const totalVentas = ventas.reduce((s,v)=>s+v.total,0);
const totalPagos = pagos.reduce((s,p)=>s+p.monto,0);
const saldo = totalVentas - totalPagos;

// usar jsPDF si está cargado
if(window.jspdf && window.jspdf.jsPDF){
const { jsPDF } = window.jspdf;
const doc = new jsPDF();
doc.setFontSize(14);
doc.text(`Estado de cuenta - ${cliente.nombre}`, 10, 12);
doc.setFontSize(10);
doc.text(`Dirección: ${cliente.direccion || '-'}`, 10, 20);
doc.text(`Teléfono: ${cliente.telefono || '-'}`, 10, 26);
doc.text(`Fecha: ${new Date().toISOString().slice(0,10)}`, 10, 32);


let y = 42;
doc.text('VENTAS:', 10, y); y += 6;
if(ventas.length===0) { doc.text('- Ninguna -', 10, y); y+=6; }
else {
  ventas.forEach(v=>{
    doc.text(`${v.fecha} | ${v.tipoPago} | Total: $${formatMoney(v.total)} | Saldo: $${formatMoney(v.saldoPendiente)}`, 10, y);
    y += 6;
    if(y > 280){ doc.addPage(); y = 12; }
  });
}
y += 4;
doc.text('PAGOS:', 10, y); y += 6;
if(pagos.length===0) { doc.text('- Ninguno -', 10, y); y+=6; }
else {
  pagos.forEach(p=>{
    doc.text(`${p.fecha} | Monto: $${formatMoney(p.monto)} | ${p.descripcion || ''}`, 10, y);
    y += 6;
    if(y > 280){ doc.addPage(); y = 12; }
  });
}

y += 8;
doc.setFontSize(12);
doc.text(`TOTAL VENTAS: $${formatMoney(totalVentas)}`, 10, y); y+=6;
doc.text(`TOTAL PAGOS: $${formatMoney(totalPagos)}`, 10, y); y+=6;
doc.text(`SALDO PENDIENTE: $${formatMoney(saldo)}`, 10, y);

doc.save(`EstadoCuenta_${cliente.nombre.replace(/\s+/g,'_')}.pdf`);


} else {
alert('jsPDF no está cargado. Asegúrate de incluir la librería en el HTML.');
}
}

// ======= Inicialización =======
renderClientes();
renderProductos();
renderVentas();
renderPagos();
renderSelects();
renderCart();

}); /* end DOMContentLoaded */
