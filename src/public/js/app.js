// Небольшой «SDK» для UI
const API = {
    token: localStorage.getItem('token') || null,
    setToken(t) {
        this.token = t;
        localStorage.setItem('token', t || '');
    },
    async req(path, opts = {}) {
        const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        const res = await fetch(path, { ...opts, headers });
        const raw = await res.text();
        let payload = {};
        if (raw) {
            try {
                payload = JSON.parse(raw);
            } catch (_e) {
                payload = { raw };
            }
        }
        if (!res.ok) {
            const error = new Error(payload?.error || res.statusText || 'Request failed');
            error.status = res.status;
            error.payload = payload;
            throw error;
        }
        return payload;
    }
};

const showAlert = (el, type, message, opts = {}) => {
    if (!el) return;
    if (!message && !opts.html) {
        el.style.display = 'none';
        el.textContent = '';
        el.innerHTML = '';
        return;
    }
    el.className = `alert alert-${type}`;
    if (opts.html) {
        el.innerHTML = opts.html;
    } else {
        el.textContent = message;
    }
    el.style.display = 'block';
};

const queryParams = new URLSearchParams(window.location.search);
const prefillInput = (id, value) => {
    if (!value) return;
    const el = document.getElementById(id);
    if (el && !el.value) el.value = value;
};

prefillInput('forgot_email', queryParams.get('email'));
prefillInput('reset_email', queryParams.get('email'));
prefillInput('reset_code', queryParams.get('code'));

const initialResetInfo = document.getElementById('resetInfo');
if (initialResetInfo && (queryParams.get('email') || queryParams.get('code'))) {
    showAlert(initialResetInfo, 'info', '', {
        html: 'Мы подставили полученные данные автоматически. Проверьте их и нажмите «Сменить пароль».'
    });
}

// Выход
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        API.setToken(null);
        fetch('/_session/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
            .then(() => location.href = '/');
    });
}

// Главная: поиск + рекомендации
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
    searchBtn.onclick = async () => {
        const q = document.getElementById('q').value.trim();
        const categoryId = document.getElementById('categoryId').value.trim();
        const sort = document.getElementById('sort').value;
        const url = new URL('/api/products', location.origin);
        if (q) url.searchParams.set('q', q);
        if (categoryId) url.searchParams.set('categoryId', categoryId);
        if (sort) url.searchParams.set('sort', sort);
        const { data } = await API.req(url.pathname + url.search);
        const box = document.getElementById('products');
        box.innerHTML = data.map(p => `
      <div class="col-md-3">
        <div class="card h-100">
          <div class="card-body">
            <h6 class="card-title">${p.name}</h6>
            <div class="small text-muted">${p.brand || ''}</div>
            <div class="fw-bold mt-2">$${p.price}</div>
            <a href="/product/${p._id}" class="btn btn-sm btn-primary mt-2">Подробнее</a>
          </div>
        </div>
      </div>
    `).join('');
    };

    searchBtn.click();

    if (window.__USER_ID__) {
        API.req(`/api/recommendations/${window.__USER_ID__}`).then(({ data }) => {
            const box = document.getElementById('reco');
            box.innerHTML = data.map(x => `
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body">
              <div class="small text-muted">score ${x.score?.toFixed?.(2) || ''}</div>
              <h6>${x.product?.name || x.product?._id}</h6>
              <div class="fw-bold mt-2">$${x.product?.price ?? ''}</div>
              <a href="/product/${x.product?._id}" class="btn btn-sm btn-outline-primary mt-2">Подробнее</a>
            </div>
          </div>
        </div>
      `).join('');
        }).catch(console.warn);
    }
}

// Страница товара
if (window.__PRODUCT_ID__) {
    (async () => {
        const prod = await API.req(`/api/products/${window.__PRODUCT_ID__}`);
        const p = prod.data;
        document.getElementById('productCard').innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5>${p.name}</h5>
          <div class="small text-muted">${p.brand || ''} - ${p.categoryName || ''}</div>
          <div class="mt-2">${p.description || ''}</div>
          <div class="fw-bold mt-2">$${p.price}</div>
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-outline-danger" id="likeBtn">❤ Нравится</button>
            <button class="btn btn-outline-primary" id="cartBtn">В корзину</button>
            <button class="btn btn-success" id="buyBtn">Купить</button>
          </div>
        </div>
      </div>
    `;

        const sim = await API.req(`/api/products/${p._id}/similar`);
        const sbox = document.getElementById('similar');
        sbox.innerHTML = sim.data.map(x => `
      <div class="col-md-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="small text-muted">sim ${x.sim}</div>
            <h6>${x.product?.name || x.product?._id}</h6>
            <div class="fw-bold mt-2">$${x.product?.price ?? ''}</div>
            <a href="/product/${x.product?._id}" class="btn btn-sm btn-outline-primary mt-2">Подробнее</a>
          </div>
        </div>
      </div>
    `).join('');

        const ensureAuth = () => {
            if (window.__USER_ID__) return true;
            alert('Нужно войти');
            location.href = '/login';
            return false;
        };

        if (window.__USER_ID__) {
            API.req('/api/interactions', {
                method: 'POST', body: JSON.stringify({
                    userId: window.__USER_ID__, productId: p._id, type: 'view'
                })
            }).catch(() => { });
        }

        document.getElementById('likeBtn').onclick = () => {
            if (!ensureAuth()) return;
            API.req('/api/interactions', {
                method: 'POST', body: JSON.stringify({
                    userId: window.__USER_ID__, productId: p._id, type: 'like'
                })
            });
        };
        document.getElementById('cartBtn').onclick = () => {
            if (!ensureAuth()) return;
            API.req('/api/interactions', {
                method: 'POST', body: JSON.stringify({
                    userId: window.__USER_ID__, productId: p._id, type: 'add_to_cart'
                })
            });
            alert('Добавлено (демо)');
        };
        document.getElementById('buyBtn').onclick = async () => {
            if (!ensureAuth()) return;
            await API.req('/api/orders/checkout', {
                method: 'POST', body: JSON.stringify({
                    userId: window.__USER_ID__,
                    items: [{ productId: p._id, qty: 1, price: p.price }]
                })
            });
            alert('Заказ оформлен');
        };
    })();
}

// Вход
const loginBtn = document.getElementById('loginBtn');
const loginInfo = document.getElementById('loginInfo');
if (loginBtn) {
    loginBtn.onclick = async () => {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        if (!email || !password) {
            showAlert(loginInfo, 'danger', 'Введите email и пароль');
            return;
        }
        loginBtn.disabled = true;
        showAlert(loginInfo, 'info', 'Выполняем вход...');
        try {
            const { ok, token, user } = await API.req('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (!ok || !token || !user) throw new Error('Login failed');
            API.setToken(token);
            await fetch('/_session/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id, email: user.email }) });
            location.href = '/';
        } catch (e) {
            showAlert(loginInfo, 'danger', e.message || 'Ошибка входа');
        } finally {
            loginBtn.disabled = false;
        }
    };
}

// Регистрация
const regBtn = document.getElementById('regBtn');
const registerInfo = document.getElementById('registerInfo');
if (regBtn) {
    regBtn.onclick = async () => {
        const email = document.getElementById('reg_email').value.trim();
        const name = document.getElementById('reg_name').value.trim();
        const password = document.getElementById('reg_password').value.trim();
        const segmentsRaw = document.getElementById('reg_segments').value.trim();
        const segments = segmentsRaw ? segmentsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        if (!email || !name || !password) {
            showAlert(registerInfo, 'danger', 'Заполните email, имя и пароль');
            return;
        }

        regBtn.disabled = true;
        showAlert(registerInfo, 'info', 'Создаём аккаунт...');
        try {
            const { ok, token, user } = await API.req('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, name, password, segments })
            });
            if (!ok || !token || !user) throw new Error('Register failed');
            API.setToken(token);
            await fetch('/_session/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, email: user.email })
            });
            showAlert(registerInfo, 'success', 'Готово! Перенаправляем...');
            setTimeout(() => location.href = '/', 600);
        } catch (e) {
            showAlert(registerInfo, 'danger', e.message || 'Ошибка регистрации');
        } finally {
            regBtn.disabled = false;
        }
    };
}

// Forgot password
const forgotBtn = document.getElementById('forgotBtn');
const forgotInfo = document.getElementById('forgotInfo');
if (forgotBtn) {
    forgotBtn.onclick = async () => {
        const email = document.getElementById('forgot_email').value.trim();
        if (!email) {
            showAlert(forgotInfo, 'danger', 'Введите email');
            return;
        }
        forgotBtn.disabled = true;
        showAlert(forgotInfo, 'info', 'Отправляем код...');
        try {
            const res = await API.req('/auth/forgot', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            if (res.demoCode) {
                console.info('[reset demoCode]', res.demoCode, res.expiresAt);
            }
            showAlert(forgotInfo, 'success', '', {
                html: 'Если такой email существует, письмо с кодом уже в пути. После получения перейдите на <a class="alert-link" href="/reset">страницу сброса</a> и введите код.'
            });
        } catch (e) {
            showAlert(forgotInfo, 'danger', e.message || 'Ошибка запроса');
        } finally {
            forgotBtn.disabled = false;
        }
    };
}

// Reset password
const resetBtn = document.getElementById('resetBtn');
const resetInfo = document.getElementById('resetInfo');
if (resetBtn) {
    resetBtn.onclick = async () => {
        const email = document.getElementById('reset_email').value.trim();
        const code = document.getElementById('reset_code').value.trim();
        const newPassword = document.getElementById('reset_new_password').value.trim();
        if (!email || !code || !newPassword) {
            showAlert(resetInfo, 'danger', 'Введите email, код и новый пароль');
            return;
        }
        resetBtn.disabled = true;
        showAlert(resetInfo, 'info', 'Проверяем код...');
        try {
            await API.req('/auth/reset', {
                method: 'POST',
                body: JSON.stringify({ email, code, newPassword })
            });
            showAlert(resetInfo, 'success', 'Пароль обновлён. Теперь можно войти.');
        } catch (e) {
            showAlert(resetInfo, 'danger', e.message || 'Ошибка сброса');
        } finally {
            resetBtn.disabled = false;
        }
    };
}

// История
if (window.__USER_ID__ && document.getElementById('history_interactions')) {
    (async () => {
        const { data } = await API.req(`/api/users/${window.__USER_ID__}/history?limit=100`);
        const itBody = document.getElementById('history_interactions');
        const ordBody = document.getElementById('history_orders');

        itBody.innerHTML = data.interactions.map(x => `
      <tr>
        <td>${new Date(x.ts).toLocaleString()}</td>
        <td><code>${x.productId}</code></td>
        <td>${x.type}</td>
        <td>${x.value ?? ''}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="text-muted">Нет записей</td></tr>`;

        ordBody.innerHTML = data.orders.map(o => `
      <tr>
        <td>${new Date(o.createdAt).toLocaleString()}</td>
        <td><code>${o._id}</code></td>
        <td>$${o.total}</td>
        <td>${o.status}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="text-muted">Нет заказов</td></tr>`;
    })();
}

// /me/reco
if (window.__RECO_PAGE__ && window.__USER_ID__) {
    (async () => {
        const { data } = await API.req(`/api/recommendations/${window.__USER_ID__}`);
        const box = document.getElementById('reco_list');
        if (!data.length) {
            box.innerHTML = '<div class="col-12 text-muted">Пока нет рекомендаций</div>';
            return;
        }
        box.innerHTML = data.map(x => `
      <div class="col-md-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="small text-muted">score ${x.score?.toFixed?.(2) || ''}</div>
            <h6>${x.product?.name || x.product?._id}</h6>
            <div class="fw-bold mt-2">$${x.product?.price ?? ''}</div>
            <a href="/product/${x.product?._id}" class="btn btn-sm btn-outline-primary mt-2">Подробнее</a>
          </div>
        </div>
      </div>
    `).join('');
    })();
}

// Админ
const adminLoadProductsBtn = document.getElementById('adminLoadProductsBtn');
if (adminLoadProductsBtn) {
    adminLoadProductsBtn.onclick = async () => {
        const { data } = await API.req('/api/products');
        const body = document.getElementById('adminProductsBody');
        body.innerHTML = data.map(p => `
      <tr>
        <td><code>${p._id}</code></td>
        <td>${p.name}</td>
        <td>${p.categoryName || ''}</td>
        <td>$${p.price}</td>
        <td>${p.rating ?? ''}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="text-muted">Нет товаров</td></tr>';
    };
}

const rebuildSimsBtn = document.getElementById('rebuildSimsBtn');
if (rebuildSimsBtn) {
    rebuildSimsBtn.onclick = async () => {
        const label = document.getElementById('rebuildStatus');
        label.textContent = 'Запускаем пересчёт...';
        try {
            const { ok } = await API.req('/admin/rebuild-sims', { method: 'POST' });
            label.textContent = ok ? 'Готово: похожести обновлены' : 'Не получилось пересчитать';
        } catch (e) {
            label.textContent = 'Ошибка: ' + e.message;
        }
    };
}
