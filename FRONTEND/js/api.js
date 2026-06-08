// ═══════════════════════════════════════════════════════════════
//  API — HTTP layer con cache en memoria + localStorage
//  GET  → parámetros en query string (sin preflight CORS)
//  POST → body JSON sin Content-Type (evita preflight CORS)
// ═══════════════════════════════════════════════════════════════

// ── Cache config ───────────────────────────────────────────────
var _MC  = {};           // in-memory: key → {ts, d, a}
var _DEF = 3 * 60000;    // 3 min default TTL

// TTL por acción (ms). 0 = nunca cachear.
var _TTL = {
  status:             0,
  login:              0,
  sheetsUrl:          0,
  tipos:              15 * 60000,
  asignacion:         10 * 60000,
  usuariosMaster:     5  * 60000,
  personal:           5  * 60000,
  programados:        3  * 60000,
  registros:          3  * 60000,
  resumen:            3  * 60000,
  estadoProgramacion: 2  * 60000
};

// Acciones que persisten en localStorage (sobreviven refresh)
var _LS_PERSIST = { tipos: 1, asignacion: 1, usuariosMaster: 1 };

// Qué caches invalidar tras cada write
var _BUST = {
  upload:              ['programados', 'registros', 'resumen', 'estadoProgramacion'],
  recalcular:          ['programados', 'registros', 'resumen', 'estadoProgramacion'],
  programarMes:        ['programados', 'estadoProgramacion'],
  programarTodos:      ['programados', 'estadoProgramacion'],
  addTipo:             ['tipos'],
  editTipo:            ['tipos'],
  deleteTipo:          ['tipos'],
  register:            ['usuariosMaster', 'personal'],
  updateUsuario:       ['usuariosMaster'],
  updateCodigoUsuario: ['usuariosMaster']
};

// ── Helpers internos ───────────────────────────────────────────
function _ck(p) {
  // Clave estable: params ordenados
  return Object.keys(p).sort().map(function (k) { return k + '=' + p[k]; }).join('&');
}

function _crd(key, action) {
  // 1. localStorage (para acciones persistidas)
  if (_LS_PERSIST[action]) {
    try {
      var s = localStorage.getItem('_hc_' + key);
      if (s) { var e = JSON.parse(s); if (Date.now() < e.x) return e.d; }
    } catch (_) {}
  }
  // 2. Memoria
  var m = _MC[key];
  var ttl = (_TTL[action] !== undefined) ? _TTL[action] : _DEF;
  if (ttl > 0 && m && (Date.now() - m.ts) < ttl) return m.d;
  return null;
}

function _cwr(key, action, data) {
  var ttl = (_TTL[action] !== undefined) ? _TTL[action] : _DEF;
  if (ttl === 0) return;
  _MC[key] = { ts: Date.now(), d: data, a: action };
  if (_LS_PERSIST[action]) {
    try {
      localStorage.setItem('_hc_' + key, JSON.stringify({ d: data, x: Date.now() + ttl, a: action }));
    } catch (_) {}
  }
}

function _cbust(actions) {
  Object.keys(_MC).forEach(function (k) {
    if (actions.indexOf(_MC[k].a) >= 0) delete _MC[k];
  });
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('_hc_') !== 0) return;
      try {
        var e = JSON.parse(localStorage.getItem(k));
        if (e && actions.indexOf(e.a) >= 0) localStorage.removeItem(k);
      } catch (_) {}
    });
  } catch (_) {}
}

// ── API object ─────────────────────────────────────────────────
var API = {

  bustAll: function () {
    _MC = {};
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf('_hc_') === 0) localStorage.removeItem(k);
      });
    } catch (_) {}
  },

  _get: function (params) {
    var action = params.action || '';
    var key    = _ck(params);
    var hit    = _crd(key, action);
    if (hit !== null) return Promise.resolve(hit);

    var qs = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k] || '');
    }).join('&');
    return fetch(GAS_URL + '?' + qs, { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _cwr(key, action, data);
        return data;
      });
  },

  // Sin Content-Type → text/plain → sin preflight CORS
  _post: function (body) {
    return fetch(GAS_URL, {
      method:   'POST',
      redirect: 'follow',
      body:     JSON.stringify(body)
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var tobust = _BUST[body.action || ''];
      if (tobust && tobust.length) _cbust(tobust);
      return data;
    });
  },

  // ── GET endpoints ──────────────────────────────────────────
  status: function () {
    return API._get({ action: 'status' });
  },

  login: function (dni, pwd) {
    var p = { action: 'login', dni: dni };
    if (pwd) p.pwd = pwd;
    return API._get(p);
  },

  tipos: function () {
    return API._get({ action: 'tipos' });
  },

  resumen: function (dni, anio, mes) {
    var p = { action: 'resumen', dni: dni };
    if (anio) p.anio = anio;
    if (mes)  p.mes  = mes;
    return API._get(p);
  },

  registros: function (dni, filtros) {
    var p = Object.assign({ action: 'registros', dni: dni }, filtros || {});
    return API._get(p);
  },

  sheetsUrl: function () {
    return API._get({ action: 'sheetsUrl' });
  },

  personal: function () {
    return API._get({ action: 'personal' });
  },

  programados: function (dni, anio, mes) {
    var p = { action: 'programados', dni: dni };
    if (anio) p.anio = anio;
    if (mes)  p.mes  = mes;
    return API._get(p);
  },

  usuariosMaster: function () {
    return API._get({ action: 'usuariosMaster' });
  },

  asignacion: function () {
    return API._get({ action: 'asignacion' });
  },

  estadoProgramacion: function (anio, mes) {
    return API._get({ action: 'estadoProgramacion', anio: anio, mes: mes });
  },

  // ── POST endpoints ─────────────────────────────────────────
  saveConfig: function (sheetsUrl, driveUrl, personalUrl) {
    return API._post({ action: 'config', sheetsUrl: sheetsUrl, driveUrl: driveUrl, personalUrl: personalUrl || '' });
  },

  upload: function (filesData, formData) {
    return API._post({ action: 'upload', filesData: filesData, formData: formData });
  },

  addTipo: function (tipo, reqNombre) {
    return API._post({ action: 'addTipo', tipo: tipo, reqNombre: !!reqNombre });
  },

  editTipo: function (old, nuevo, reqNombre) {
    return API._post({ action: 'editTipo', old: old, nuevo: nuevo, reqNombre: !!reqNombre });
  },

  deleteTipo: function (tipo) {
    return API._post({ action: 'deleteTipo', tipo: tipo });
  },

  register: function (dni, apellidos, nombres) {
    return API._post({ action: 'register', dni: dni, apellidos: apellidos, nombres: nombres });
  },

  recalcular: function (anio, mes) {
    return API._post({ action: 'recalcular', anio: anio || '', mes: mes || '' });
  },

  programarMes: function (dni, codigo, anio, mes) {
    return API._post({ action: 'programarMes', dni: dni, codigo: codigo, anio: anio, mes: mes });
  },

  programarTodos: function (anio, mes) {
    return API._post({ action: 'programarTodos', anio: anio, mes: mes });
  },

  updateCodigoUsuario: function (dni, codigo) {
    return API._post({ action: 'updateCodigoUsuario', dni: dni, codigo: codigo });
  },

  updateUsuario: function (dni, data) {
    return API._post({ action: 'updateUsuario', dni: dni,
      nombre: data.nombre, rol: data.rol, activo: data.activo, codigo: data.codigo });
  }
};
