// ═══════════════════════════════════════════════════════════════
//  USERS VIEW — Gestión de Usuarios Master
// ═══════════════════════════════════════════════════════════════

var USERS_VIEW = {
  _data: [],

  load: function () {
    document.getElementById('users-list').innerHTML =
      '<div class="skel" style="height:90px;border-radius:14px;margin-bottom:8px"></div>'.repeat(5);
    API.usuariosMaster()
      .then(function (data) {
        USERS_VIEW._data = Array.isArray(data) ? data : [];
        USERS_VIEW._render();
      })
      .catch(function () { toast('Error al cargar usuarios', 'error'); });
  },

  _render: function () {
    var data = USERS_VIEW._data;
    var el = document.getElementById('users-list');
    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><span class="material-icons">group</span><p>No hay usuarios.</p></div>';
      return;
    }

    el.innerHTML = data.map(function (u, idx) {
      var ini = (u.nombre || '').split(' ').slice(0, 2).map(function (w) { return w[0] || ''; }).join('');
      var rolUpper = (u.rol || '').toUpperCase();
      var isAdmin  = rolUpper === 'ADMIN';
      var rolColor = isAdmin ? '#b71c1c' : 'var(--primary)';
      var activoHtml = u.activo
        ? '<span style="color:var(--success);font-size:.62rem;font-weight:700;background:#e8f5e9;padding:2px 7px;border-radius:20px">ACTIVO</span>'
        : '<span style="color:#9e9e9e;font-size:.62rem;font-weight:700;background:#f5f5f5;padding:2px 7px;border-radius:20px">INACTIVO</span>';

      return '<div class="card" style="margin-bottom:8px;padding:12px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div class="user-avatar" style="width:40px;height:40px;font-size:.82rem;background:' + rolColor + ';flex-shrink:0">' + ini + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">' +
              '<span style="font-weight:700;font-size:.84rem">' + (u.nombre || '—') + '</span>' +
              '<span style="background:' + rolColor + ';color:#fff;font-size:.58rem;font-weight:800;padding:2px 7px;border-radius:20px">' + (u.rol || '?') + '</span>' +
              activoHtml +
            '</div>' +
            '<div style="font-size:.7rem;color:var(--text-muted);margin-bottom:6px">DNI: ' + u.dni + '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
              '<span style="font-size:.7rem;color:var(--text-muted);font-weight:600;flex-shrink:0">Código:</span>' +
              '<div id="uv-display-' + idx + '" style="display:flex;align-items:center;gap:5px">' +
                (u.codigo
                  ? '<span style="background:var(--primary);color:#fff;font-size:.65rem;font-weight:800;padding:2px 9px;border-radius:20px">' + u.codigo + '</span>'
                  : '<span style="color:#bdbdbd;font-size:.72rem;font-style:italic">Sin código</span>') +
                '<button onclick="USERS_VIEW._showEdit(' + idx + ',\'' + (u.codigo || '') + '\')" ' +
                  'style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;align-items:center">' +
                  '<span class="material-icons" style="font-size:1rem">edit</span></button>' +
              '</div>' +
              '<div id="uv-edit-' + idx + '" style="display:none;align-items:center;gap:5px">' +
                '<input id="uv-input-' + idx + '" type="text" value="' + (u.codigo || '') + '" ' +
                  'style="width:72px;padding:4px 8px;border:1.5px solid var(--primary);border-radius:7px;font-size:.78rem;text-transform:uppercase;font-weight:700" ' +
                  'oninput="this.value=this.value.toUpperCase()" ' +
                  'onkeydown="if(event.key===\'Enter\')USERS_VIEW._saveCodigo(' + idx + ',\'' + u.dni + '\')">' +
                '<button onclick="USERS_VIEW._saveCodigo(' + idx + ',\'' + u.dni + '\')" ' +
                  'style="background:var(--primary);color:#fff;border:none;border-radius:7px;padding:4px 10px;font-size:.73rem;font-weight:700;cursor:pointer">OK</button>' +
                '<button onclick="USERS_VIEW._cancelEdit(' + idx + ')" ' +
                  'style="background:none;border:1px solid var(--border);border-radius:7px;padding:4px 8px;cursor:pointer;display:flex;align-items:center">' +
                  '<span class="material-icons" style="font-size:.9rem">close</span></button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  },

  _showEdit: function (idx, current) {
    document.getElementById('uv-display-' + idx).style.display = 'none';
    var editDiv = document.getElementById('uv-edit-' + idx);
    editDiv.style.display = 'flex';
    var input = document.getElementById('uv-input-' + idx);
    input.value = current || '';
    input.focus();
    input.select();
  },

  _cancelEdit: function (idx) {
    document.getElementById('uv-display-' + idx).style.display = 'flex';
    document.getElementById('uv-edit-' + idx).style.display = 'none';
  },

  _saveCodigo: function (idx, dni) {
    var input = document.getElementById('uv-input-' + idx);
    var codigo = (input.value || '').trim().toUpperCase();
    API.updateCodigoUsuario(dni, codigo)
      .then(function (res) {
        if (res.ok) {
          toast('Código actualizado', 'success', 2000);
          if (USERS_VIEW._data[idx]) USERS_VIEW._data[idx].codigo = codigo;
          USERS_VIEW._render();
        } else {
          toast(res.msg || 'Error', 'error');
          USERS_VIEW._cancelEdit(idx);
        }
      })
      .catch(function () {
        toast('Error de conexión', 'error');
        USERS_VIEW._cancelEdit(idx);
      });
  }
};
