// ═══════════════════════════════════════════════════════════════
//  APP — SPA Shell: navegación, sesión, helpers globales
// ═══════════════════════════════════════════════════════════════

var APP = {
  user:       null,
  tipos:      [],
  _current:   null,
  _transit:   false,

  tipoReqNombre: function (nombre) {
    for (var i = 0; i < APP.tipos.length; i++) {
      var t = APP.tipos[i];
      var n = typeof t === 'object' ? t.nombre : t;
      if (n === nombre) return typeof t === 'object' ? !!t.reqNombre : false;
    }
    return false;
  },

  init: function () {
    API.status()
      .then(function (res) {
        APP.hideSplash();
        if (!res.configured) {
          APP.showView('config');
          return;
        }
        API.tipos()
          .then(function (t) { APP.tipos = Array.isArray(t) ? t : []; })
          .catch(function () {})
          .then(function () {
            var saved = localStorage.getItem('hs_session');
            if (saved) {
              try {
                var user = JSON.parse(saved);
                if (user && user.dni) { APP.afterLogin(user); return; }
              } catch (e) { localStorage.removeItem('hs_session'); }
            }
            APP.showView('login');
          });
      })
      .catch(function () {
        APP.hideSplash();
        APP.showView('login');
      });
  },

  hideSplash: function () {
    var el = document.getElementById('splash');
    el.classList.add('fade-out');
    setTimeout(function () { el.style.display = 'none'; }, 500);
  },

  showView: function (name) {
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.remove('active', 'slide-in');
    });
    var target = document.getElementById('view-' + name);
    if (!target) return;
    target.classList.add('active');
    requestAnimationFrame(function () { target.classList.add('slide-in'); });
  },

  nav: function (name) {
    if (APP.user && APP.user.master !== true && name !== 'upload' && name !== 'progress') return;
    APP.closeSidebar();
    if (APP.user && APP.user.master === true && name === 'tipos' && typeof TIPOS_VIEW !== 'undefined') {
      // carga diferida al entrar a la vista tipos
    }
    if (APP._transit) return;
    // Guardia: avisar si hay datos sin guardar al salir del upload
    if (name !== 'upload' && APP._current === 'upload' && typeof UP !== 'undefined' && UP.hasUnsavedData && UP.hasUnsavedData()) {
      if (!confirm('Hay herramientas sin guardar. ¿Salir de todas formas?')) return;
    }
    APP._transit = true;

    var cur = document.querySelector('.view.active');
    var tgt = document.getElementById('view-' + name);
    if (!tgt || cur === tgt) { APP._transit = false; return; }

    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === name);
    });

    var doTransition = function () {
      tgt.classList.add('active');
      requestAnimationFrame(function () {
        tgt.classList.add('slide-in');
        APP._transit  = false;
        APP._current  = name;
        // hooks de vista
        if (name === 'dashboard')  DASH.load();
        if (name === 'records')    REC.load();
        if (name === 'upload')     UP.reset();
        if (name === 'progress')   PROG.load();
        if (name === 'tipos')      TIPOS_VIEW.load();
        if (name === 'scheduling')       SCHED.load();
        if (name === 'users')           USERS_VIEW.load();
        if (name === 'personas-avance') PERSONAS_VIEW.load();
        // Actualizar sidebar active
        document.querySelectorAll('.sidebar-item[data-view]').forEach(function(b){
          b.classList.toggle('sb-active', b.dataset.view === name);
        });
      });
    };

    if (cur) {
      cur.classList.add('exit');
      setTimeout(function () {
        cur.classList.remove('active', 'slide-in', 'exit');
        doTransition();
      }, 220);
    } else {
      doTransition();
    }
  },

  afterLogin: function (user) {
    APP.user = user;
    localStorage.setItem('hs_session', JSON.stringify(user));
    var sbName = document.getElementById('sb-user-name');
    var sbRole = document.getElementById('sb-user-role');
    if (sbName) sbName.textContent = user.nombre || 'Usuario';
    if (sbRole) sbRole.textContent = user.cargo || user.rol || '';
    if (user.master === true) {
      document.getElementById('bottom-nav').style.display = 'flex';
      APP.nav('dashboard');
    } else {
      document.getElementById('bottom-nav').style.display = 'none';
      document.getElementById('up-logout-btn').style.display = 'none';
      document.getElementById('operario-nav').style.display = 'flex';
      APP.nav('upload');
    }
  },

  logout: function () {
    API.bustAll();
    APP.user = null;
    localStorage.removeItem('hs_session');
    closeModal('modal-settings');
    document.getElementById('bottom-nav').style.display      = 'none';
    document.getElementById('operario-nav').style.display    = 'none';
    document.getElementById('up-logout-btn').style.display   = 'none';
    document.getElementById('dash-logout-btn').style.display = 'none';
    document.getElementById('dash-recalc-btn').style.display = 'none';
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.remove('active', 'slide-in', 'exit');
    });
    APP.showView('login');
    LOGIN.reset();
  },

  openSidebar: function () {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
  },

  closeSidebar: function () {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  },

  openSettings: function () {
    if (!APP.user || !APP.user.master) return APP.logout();
    document.getElementById('modal-settings').classList.add('open');
  },

  goConfig: function () {
    closeModal('modal-settings');
    document.getElementById('bottom-nav').style.display = 'none';
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active','slide-in','exit'); });
    APP.showView('config');
  },

  openSheets: function () {
    closeModal('modal-settings');
    API.sheetsUrl().then(function (res) { if (res.url) window.open(res.url, '_blank'); });
  }
};

// ── Toast ──────────────────────────────────────────────────────
function toast(msg, type, ms) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'show ' + (type || '');
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.className = ''; }, ms || 3000);
}

// ── Modal ──────────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ── Button loading ─────────────────────────────────────────────
function setLoading(btn, on) {
  if (!btn) return;
  if (on) { btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span class="btn-spinner"></span>'; btn.disabled = true; }
  else     { btn.innerHTML = btn.dataset.orig || btn.innerHTML; btn.disabled = false; }
}

// ── Count-up ───────────────────────────────────────────────────
function countUp(el, target, ms) {
  var t0 = null; target = parseInt(target) || 0; ms = ms || 800;
  (function step(ts) {
    if (!t0) t0 = ts;
    var p = Math.min((ts - t0) / ms, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
    if (p < 1) requestAnimationFrame(step); else el.textContent = target;
  })(performance.now());
}

// ── Vibrate ────────────────────────────────────────────────────
function vibrate(p) { if (navigator.vibrate) navigator.vibrate(p || 40); }

// ── File helpers ───────────────────────────────────────────────
function fmtSize(b) {
  if (b < 1024)    return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function fileIcon(file) {
  var ext = (file.name.split('.').pop() || '').toLowerCase();
  var map = { pdf: 'picture_as_pdf', doc: 'description', docx: 'description', xls: 'table_chart', xlsx: 'table_chart' };
  return '<span class="material-icons" style="color:var(--primary-light)">' + (map[ext] || 'insert_drive_file') + '</span>';
}

// ── Debounce ───────────────────────────────────────────────────
function debounce(fn, ms) {
  var t;
  return function () {
    var ctx = this, args = arguments;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(ctx, args); }, ms || 300);
  };
}

// ── Render por lotes (listas grandes sin bloquear el hilo UI) ──
function renderChunked(container, items, renderOne, chunkSize) {
  container.innerHTML = '';
  if (!items || !items.length) return;
  chunkSize = chunkSize || 25;
  var i = 0;
  function next() {
    var frag = document.createDocumentFragment();
    var end  = Math.min(i + chunkSize, items.length);
    for (; i < end; i++) {
      var tmp = document.createElement('div');
      tmp.innerHTML = renderOne(items[i], i);
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
    }
    container.appendChild(frag);
    if (i < items.length) requestAnimationFrame(next);
  }
  requestAnimationFrame(next);
}

// ── Init ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function () { APP.init(); });
