// ═══════════════════════════════════════════════════════════════
//  TIPOS VIEW — Gestión de tipos de herramienta (solo master)
// ═══════════════════════════════════════════════════════════════

var TIPOS_VIEW = {
  _items: [],
  _editingIdx: null,

  load: function () {
    var el = document.getElementById('tipos-list');
    if (!el) return;
    el.innerHTML =
      '<div class="skel" style="height:52px;border-radius:12px;margin-bottom:8px"></div>'.repeat(4);
    API.tipos().then(function (data) {
      TIPOS_VIEW._items = Array.isArray(data) ? data : [];
      TIPOS_VIEW.render();
    }).catch(function () {
      el.innerHTML = '<div class="empty-state"><span class="material-icons">error_outline</span><p>Error al cargar tipos.</p></div>';
    });
  },

  render: function () {
    var el = document.getElementById('tipos-list');
    if (!el) return;
    TIPOS_VIEW._editingIdx = null;
    if (!TIPOS_VIEW._items.length) {
      el.innerHTML = '<div class="empty-state"><span class="material-icons">category</span><p>Sin tipos registrados.</p></div>';
      return;
    }
    el.innerHTML = '';
    TIPOS_VIEW._items.forEach(function (tipo, idx) {
      var row = document.createElement('div');
      row.id = 'tipo-row-' + idx;
      row.style.cssText = 'display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:8px;transition:box-shadow .15s';
      row.innerHTML =
        '<span class="material-icons" style="color:var(--primary);font-size:1.1rem;flex-shrink:0">build_circle</span>' +
        '<span style="flex:1;font-weight:600;font-size:.9rem">' + tipo + '</span>' +
        '<button onclick="TIPOS_VIEW.startEdit(' + idx + ')" style="background:none;border:none;cursor:pointer;color:var(--primary);padding:4px;display:flex;align-items:center" title="Editar">' +
          '<span class="material-icons" style="font-size:1.1rem">edit</span>' +
        '</button>' +
        '<button onclick="TIPOS_VIEW.confirmDelete(\'' + tipo.replace(/'/g,"\\'") + '\')" style="background:none;border:none;cursor:pointer;color:var(--danger);padding:4px;display:flex;align-items:center" title="Eliminar">' +
          '<span class="material-icons" style="font-size:1.1rem">delete</span>' +
        '</button>';
      el.appendChild(row);
    });
  },

  startEdit: function (idx) {
    var tipo = TIPOS_VIEW._items[idx];
    var row  = document.getElementById('tipo-row-' + idx);
    if (!row) return;
    TIPOS_VIEW._editingIdx = idx;
    row.innerHTML =
      '<span class="material-icons" style="color:var(--primary);font-size:1.1rem;flex-shrink:0">edit</span>' +
      '<input id="tipo-edit-input" type="text" class="form-control" value="' + tipo + '"' +
        ' style="flex:1;min-height:36px;font-size:.88rem;text-transform:uppercase"' +
        ' oninput="this.value=this.value.toUpperCase()"' +
        ' onkeydown="if(event.key===\'Enter\')TIPOS_VIEW.saveEdit(' + idx + ');if(event.key===\'Escape\')TIPOS_VIEW.render()">' +
      '<button onclick="TIPOS_VIEW.saveEdit(' + idx + ')" style="background:none;border:none;cursor:pointer;color:var(--success);padding:4px;display:flex;align-items:center" title="Guardar">' +
        '<span class="material-icons" style="font-size:1.2rem">check_circle</span>' +
      '</button>' +
      '<button onclick="TIPOS_VIEW.render()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;display:flex;align-items:center" title="Cancelar">' +
        '<span class="material-icons" style="font-size:1.2rem">cancel</span>' +
      '</button>';
    var inp = document.getElementById('tipo-edit-input');
    if (inp) { inp.focus(); inp.select(); }
  },

  saveEdit: function (idx) {
    var inp = document.getElementById('tipo-edit-input');
    if (!inp) return;
    var nuevo = inp.value.trim().toUpperCase();
    var old   = TIPOS_VIEW._items[idx];
    if (!nuevo) { toast('El nombre no puede estar vacío', 'error'); return; }
    if (nuevo === old) { TIPOS_VIEW.render(); return; }
    TIPOS_VIEW._setLoading(true);
    API.editTipo(old, nuevo).then(function (res) {
      TIPOS_VIEW._setLoading(false);
      if (res.ok) {
        TIPOS_VIEW._items = res.tipos || TIPOS_VIEW._items;
        TIPOS_VIEW.render();
        toast('Tipo actualizado', 'success');
      } else {
        toast(res.msg || 'Error al editar', 'error');
      }
    }).catch(function () {
      TIPOS_VIEW._setLoading(false);
      toast('Error de conexión', 'error');
    });
  },

  confirmDelete: function (nombre) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:flex-end;justify-content:center';
    ov.innerHTML =
      '<div style="background:#fff;border-radius:20px 20px 0 0;padding:24px 20px;width:100%;max-width:480px">' +
        '<div style="font-weight:700;font-size:1rem;margin-bottom:6px">¿Eliminar tipo?</div>' +
        '<div style="font-size:.88rem;color:var(--text-muted);margin-bottom:20px">Se eliminará <strong>' + nombre + '</strong> de la lista. Los registros existentes no se verán afectados.</div>' +
        '<button id="td-confirm" class="btn" style="background:var(--danger);color:#fff;margin-bottom:8px"><span class="material-icons">delete</span> Eliminar</button>' +
        '<button id="td-cancel" class="btn btn-outline">Cancelar</button>' +
      '</div>';
    document.body.appendChild(ov);
    document.getElementById('td-cancel').onclick = function () { document.body.removeChild(ov); };
    document.getElementById('td-confirm').onclick = function () {
      document.body.removeChild(ov);
      TIPOS_VIEW.doDelete(nombre);
    };
  },

  doDelete: function (nombre) {
    TIPOS_VIEW._setLoading(true);
    API.deleteTipo(nombre).then(function (res) {
      TIPOS_VIEW._setLoading(false);
      if (res.ok) {
        TIPOS_VIEW._items = res.tipos || [];
        TIPOS_VIEW.render();
        toast('Tipo eliminado', 'success');
      } else {
        toast(res.msg || 'Error al eliminar', 'error');
      }
    }).catch(function () {
      TIPOS_VIEW._setLoading(false);
      toast('Error de conexión', 'error');
    });
  },

  addNew: function () {
    var inp = document.getElementById('tipos-new-input');
    if (!inp) return;
    var val = inp.value.trim().toUpperCase();
    if (!val) { toast('Escribe un nombre', 'error'); return; }
    TIPOS_VIEW._setLoading(true);
    API.addTipo(val).then(function (res) {
      TIPOS_VIEW._setLoading(false);
      if (res.ok) {
        TIPOS_VIEW._items = res.tipos || TIPOS_VIEW._items;
        TIPOS_VIEW.render();
        inp.value = '';
        toast('"' + val + '" agregado', 'success');
      } else {
        toast(res.msg || 'Error al agregar', 'error');
      }
    }).catch(function () {
      TIPOS_VIEW._setLoading(false);
      toast('Error de conexión', 'error');
    });
  },

  _setLoading: function (on) {
    var btn = document.getElementById('tipos-add-btn');
    if (btn) btn.disabled = on;
  }
};
