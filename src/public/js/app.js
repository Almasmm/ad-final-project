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
        const res = await fetch(path, { cache: 'no-store', ...opts, headers });
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

const formatError = (err, fallback = 'Что-то пошло не так') => (err && err.message) ? err.message : fallback;

const setFieldError = (input, message) => {
    if (!input) return;
    const parent = input.parentElement;
    let feedback = parent?.querySelector('.invalid-feedback');
    if (!message) {
        input.classList.remove('is-invalid');
        if (feedback) feedback.remove();
        return;
    }
    input.classList.add('is-invalid');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        parent.appendChild(feedback);
    }
    feedback.textContent = message;
};

document.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => setFieldError(input, null));
});

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
    showAlert(initialResetInfo, 'info', 'Мы заполнили поля автоматически. Проверьте данные, введите код из письма и задайте новый пароль.');
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
        const categorySelect = document.getElementById('categoryId');
        const categoryId = categorySelect.value;
        const categoryName = categorySelect.options[categorySelect.selectedIndex]?.text || '';
        const sort = document.getElementById('sort').value;
        const url = new URL('/api/products', location.origin);
        if (q) url.searchParams.set('q', q);
        if (categoryId) {
            url.searchParams.set('categoryId', categoryId);
            url.searchParams.set('categoryName', categoryName);
        }
        if (sort) url.searchParams.set('sort', sort);
        try {
            const { data } = await API.req(url.pathname + url.search);
            const box = document.getElementById('products');
            if (!data.length) {
                box.innerHTML = '<div class="col-12 text-center text-muted py-5">Ничего не найдено. Попробуйте изменить запрос.</div>';
                return;
            }
            box.innerHTML = data.map(p => `
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="fw-semibold mb-0">${p.name}</h6>
              ${p.rating != null ? `<span class="badge bg-warning-subtle text-warning">⭐ ${p.rating.toFixed?.(1) || p.rating}</span>` : ''}
            </div>
            <div class="text-muted small mb-2">${p.brand || '—'}</div>
            ${p.categoryName ? `<span class="badge bg-secondary-subtle text-secondary badge-category mb-3">${p.categoryName}</span>` : ''}
            <div class="mt-auto pt-3 border-top">
              <div class="product-price">$${p.price}</div>
              <a href="/product/${p._id}" class="btn btn-sm btn-outline-primary w-100 mt-2">Подробнее</a>
            </div>
          </div>
        </div>
      </div>
    `).join('');
        } catch (e) {
            alert(`Не удалось загрузить каталог: ${formatError(e)}`);
        }
    };

    searchBtn.click();

    if (window.__USER_ID__) {
        API.req(`/api/recommendations/${window.__USER_ID__}`).then(({ data }) => {
            const box = document.getElementById('reco');
            const empty = document.getElementById('recoEmpty');
            if (!data.length) {
                box.innerHTML = '';
                if (empty) {
                    empty.textContent = 'Пока нет рекомендаций — посмотрите несколько товаров, поставьте лайк или оформите заказ.';
                }
                return;
            }
            if (empty) empty.textContent = '';
            box.innerHTML = data.map(x => {
                const product = x.product || { _id: '—' };
                return `
        <div class="col-sm-6 col-lg-3">
          <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h6 class="fw-semibold mb-0">${product.name || product._id}</h6>
                <span class="badge bg-info-subtle text-info">score ${x.score?.toFixed?.(2) || '—'}</span>
              </div>
              <div class="text-muted small mb-2">${product.brand || '—'}</div>
              ${product.categoryName ? `<span class="badge bg-secondary-subtle text-secondary badge-category mb-3">${product.categoryName}</span>` : ''}
              <div class="mt-auto pt-3 border-top">
                <div class="product-price">$${product.price ?? '—'}</div>
                <a href="/product/${product._id}" class="btn btn-sm btn-outline-primary w-100 mt-2">Подробнее</a>
              </div>
            </div>
          </div>
        </div>
      `;
            }).join('');
        }).catch((e) => {
            const empty = document.getElementById('recoEmpty');
            if (empty) empty.textContent = formatError(e, 'Не удалось загрузить рекомендации');
            console.warn(e);
        });
    }
}

// Страница товара
if (window.__PRODUCT_ID__) {
    (async () => {
        try {
            const prod = await API.req(`/api/products/${window.__PRODUCT_ID__}`);
            const p = prod.data;
        document.getElementById('productCard').innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between flex-wrap mb-3">
            <div>
              <h4 class="fw-semibold mb-1">${p.name}</h4>
              <div class="text-muted small">${p.brand || '—'}${p.categoryName ? ' · ' + p.categoryName : ''}</div>
            </div>
            ${p.rating != null ? `<span class="badge bg-warning-subtle text-warning align-self-start">⭐ ${p.rating.toFixed?.(1) || p.rating}</span>` : ''}
          </div>
          <div class="mb-3">${p.description || 'Описание не указано.'}</div>
          <div class="bg-light rounded-3 p-3 mb-3">
            <div class="text-muted small mb-1">Цена</div>
            <div class="display-6 fw-bold">$${p.price}</div>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-outline-danger flex-grow-1" id="likeBtn">❤ Лайк</button>
            <button class="btn btn-outline-primary flex-grow-1" id="cartBtn">В корзину</button>
            <button class="btn btn-success flex-grow-1" id="buyBtn">Купить</button>
          </div>
        </div>
      </div>
    `;

        const sim = await API.req(`/api/products/${p._id}/similar`).catch(() => ({ data: [] }));
        const sbox = document.getElementById('similar');
        const sEmpty = document.getElementById('similarEmpty');
        if (!sim.data.length) {
            sbox.innerHTML = '';
            if (sEmpty) sEmpty.textContent = 'Пока нет похожих товаров.';
        } else {
            if (sEmpty) sEmpty.textContent = '';
            sbox.innerHTML = sim.data.map(x => `
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="fw-semibold mb-0">${x.product?.name || x.product?._id}</h6>
              <span class="badge bg-info-subtle text-info">sim ${x.sim?.toFixed?.(2) || x.sim}</span>
            </div>
            <div class="text-muted small mb-2">${x.product?.brand || '—'}</div>
            <div class="mt-auto pt-3 border-top">
              <div class="product-price">$${x.product?.price ?? '—'}</div>
              <a href="/product/${x.product?._id}" class="btn btn-sm btn-outline-primary w-100 mt-2">Подробнее</a>
            </div>
          </div>
        </div>
      </div>
    `).join('');
        }

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
            }).catch((e) => alert(`Не удалось записать действие: ${formatError(e)}`));
        };
        document.getElementById('cartBtn').onclick = () => {
            if (!ensureAuth()) return;
            API.req('/api/interactions', {
                method: 'POST', body: JSON.stringify({
                    userId: window.__USER_ID__, productId: p._id, type: 'add_to_cart'
                })
            }).catch((e) => alert(`Не удалось записать действие: ${formatError(e)}`));
            alert('Добавлено в корзину (демо).');
        };
        document.getElementById('buyBtn').onclick = async () => {
            if (!ensureAuth()) return;
            try {
                await API.req('/api/orders/checkout', {
                method: 'POST', body: JSON.stringify({
                    userId: window.__USER_ID__,
                    items: [{ productId: p._id, qty: 1, price: p.price }]
                })
            });
            alert('Заказ оформлен');
            } catch (e) {
                alert(`Не удалось оформить заказ: ${formatError(e)}`);
            }
        };
        } catch (e) {
            document.getElementById('productCard').innerHTML = `<div class="alert alert-danger">Не удалось загрузить товар: ${formatError(e)}</div>`;
        }
    })();
}

// Вход
const loginBtn = document.getElementById('loginBtn');
const loginInfo = document.getElementById('loginInfo');
if (loginBtn) {
    loginBtn.onclick = async () => {
        const emailEl = document.getElementById('email');
        const passEl = document.getElementById('password');
        const email = emailEl.value.trim();
        const password = passEl.value.trim();
        let invalid = false;
        if (!email) {
            setFieldError(emailEl, 'Введите email');
            invalid = true;
        } else {
            setFieldError(emailEl, null);
        }
        if (!password) {
            setFieldError(passEl, 'Введите пароль');
            invalid = true;
        } else {
            setFieldError(passEl, null);
        }
        if (invalid) {
            showAlert(loginInfo, 'danger', 'Заполните все поля');
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
            setFieldError(emailEl, 'Проверьте email или пароль');
            setFieldError(passEl, 'Проверьте email или пароль');
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
        const emailEl = document.getElementById('reg_email');
        const nameEl = document.getElementById('reg_name');
        const passEl = document.getElementById('reg_password');
        const email = emailEl.value.trim();
        const name = nameEl.value.trim();
        const password = passEl.value.trim();
        const segmentsRaw = document.getElementById('reg_segments').value.trim();
        const segments = segmentsRaw ? segmentsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        let invalid = false;
        if (!email) {
            setFieldError(emailEl, 'Введите email');
            invalid = true;
        } else {
            setFieldError(emailEl, null);
        }
        if (!name) {
            setFieldError(nameEl, 'Введите имя');
            invalid = true;
        } else {
            setFieldError(nameEl, null);
        }
        if (!password) {
            setFieldError(passEl, 'Введите пароль');
            invalid = true;
        } else if (password.length < 8) {
            setFieldError(passEl, 'Минимум 8 символов');
            invalid = true;
        } else {
            setFieldError(passEl, null);
        }

        if (invalid) {
            showAlert(registerInfo, 'danger', 'Исправьте ошибки в форме');
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
            if (e.message && e.message.includes('Email')) {
                setFieldError(emailEl, e.message);
            }
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
        const emailInput = document.getElementById('forgot_email');
        const email = emailInput.value.trim();
        if (!email) {
            setFieldError(emailInput, 'Введите email');
            showAlert(forgotInfo, 'danger', 'Укажите email');
            return;
        }
        setFieldError(emailInput, null);
        forgotBtn.disabled = true;
        showAlert(forgotInfo, 'info', 'Отправляем код...');
        try {
            const res = await API.req('/auth/forgot', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            let html = 'Если такой email существует, письмо с кодом уже в пути. После получения перейдите на <a class="alert-link" href="/reset">страницу сброса</a> и введите код.';
            if (res.demoCode) {
                console.info('[reset demoCode]', res.demoCode, res.expiresAt);
                html += `<div class="small text-muted mt-2">DEV: код ${res.demoCode} действует до ${res.expiresAt ? new Date(res.expiresAt).toLocaleString() : ''}</div>`;
            }
            showAlert(forgotInfo, 'success', '', { html });
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
        const emailEl = document.getElementById('reset_email');
        const codeEl = document.getElementById('reset_code');
        const passEl = document.getElementById('reset_new_password');
        const email = emailEl.value.trim();
        const code = codeEl.value.trim();
        const newPassword = passEl.value.trim();
        let invalid = false;
        if (!email) {
            setFieldError(emailEl, 'Введите email');
            invalid = true;
        } else {
            setFieldError(emailEl, null);
        }
        if (!code) {
            setFieldError(codeEl, 'Введите код');
            invalid = true;
        } else {
            setFieldError(codeEl, null);
        }
        if (!newPassword) {
            setFieldError(passEl, 'Введите новый пароль');
            invalid = true;
        } else if (newPassword.length < 8) {
            setFieldError(passEl, 'Минимум 8 символов');
            invalid = true;
        } else {
            setFieldError(passEl, null);
        }
        if (invalid) {
            showAlert(resetInfo, 'danger', 'Исправьте ошибки в форме');
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
const interactionTypeMap = {
    view: '<span class="badge bg-light text-dark">просмотр</span>',
    like: '<span class="badge bg-danger-subtle text-danger">лайк</span>',
    add_to_cart: '<span class="badge bg-primary-subtle text-primary">добавление в корзину</span>',
    purchase: '<span class="badge bg-success">покупка</span>',
};

if (window.__USER_ID__ && document.getElementById('history_interactions')) {
    (async () => {
        try {
            const { data } = await API.req(`/api/users/${window.__USER_ID__}/history?limit=100`);
            const itBody = document.getElementById('history_interactions');
            const ordBody = document.getElementById('history_orders');

            if (data.interactions.length) {
                itBody.innerHTML = data.interactions.map((x) => `
      <tr>
        <td>${new Date(x.ts).toLocaleString()}</td>
        <td><code>${x.productId}</code></td>
        <td>${interactionTypeMap[x.type] || x.type}</td>
        <td>${x.value ?? '—'}</td>
      </tr>
    `).join('');
            } else {
                itBody.innerHTML = '<tr><td colspan="4" class="text-muted">Нет данных</td></tr>';
            }

            if (data.orders.length) {
                ordBody.innerHTML = data.orders.map((o) => `
      <tr>
        <td>${new Date(o.createdAt).toLocaleString()}</td>
        <td><code>${o._id}</code></td>
        <td>$${o.total.toFixed ? o.total.toFixed(2) : o.total}</td>
        <td>${o.status}</td>
      </tr>
    `).join('');
            } else {
                ordBody.innerHTML = '<tr><td colspan="4" class="text-muted">Нет заказов</td></tr>';
            }
        } catch (e) {
            alert(`Не удалось загрузить историю: ${formatError(e)}`);
        }
    })();
}

// /me/reco
if (window.__RECO_PAGE__ && window.__USER_ID__) {
    (async () => {
        const statusEl = document.getElementById('reco_status');
        if (statusEl) statusEl.textContent = 'Загрузка...';
        try {
            const { data } = await API.req(`/api/recommendations/${window.__USER_ID__}`);
            const box = document.getElementById('reco_list');
            if (!data.length) {
                if (statusEl) statusEl.textContent = 'Пока нет рекомендаций — продолжайте выбирать товары, лайкать и оформлять заказы.';
                box.innerHTML = '';
                return;
            }
            if (statusEl) statusEl.remove();
            box.innerHTML = data.map(x => {
                const product = x.product || { _id: '—' };
                return `
      <div class="col-md-3">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <div class="small text-muted mb-1">score ${x.score?.toFixed?.(2) || ''}</div>
            <h6 class="mb-1">${product.name || product._id}</h6>
            <div class="text-muted small">${product.categoryName || 'Категория не указана'}</div>
            <div class="fw-bold mt-3">$${product.price ?? '—'}</div>
            ${product.rating != null ? `<div class="small text-warning">Рейтинг: ${product.rating}</div>` : ''}
            <div class="mt-auto">
              <a href="/product/${product._id}" class="btn btn-sm btn-outline-primary mt-2">Открыть</a>
            </div>
          </div>
        </div>
      </div>
    `;
            }).join('');
        } catch (e) {
            if (statusEl) {
                statusEl.textContent = formatError(e, 'Не удалось загрузить рекомендации');
            } else {
                alert(`Не удалось загрузить рекомендации: ${formatError(e)}`);
            }
        }
    })();
}

// Админ
const adminLoadProductsBtn = document.getElementById('adminLoadProductsBtn');
if (adminLoadProductsBtn) {
    adminLoadProductsBtn.onclick = async () => {
        try {
            const { data } = await API.req('/api/products');
            const body = document.getElementById('adminProductsBody');
            const countLabel = document.getElementById('adminProductCount');
            if (countLabel) countLabel.textContent = data.length;
            body.innerHTML = data.length ? data.map(p => `
      <tr>
        <td><code>${p._id}</code></td>
        <td>${p.name}</td>
        <td>${p.categoryName || ''}</td>
        <td>$${p.price}</td>
        <td>${p.rating ?? ''}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" class="text-muted">Нет товаров</td></tr>';
        } catch (e) {
            alert(`Не удалось загрузить товары: ${formatError(e)}`);
        }
    };
}

const adminProductForm = document.getElementById('adminProductForm');
if (adminProductForm) {
    adminProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('adminProdStatus');
        const payload = {
            name: document.getElementById('adminProdName').value.trim(),
            categoryId: document.getElementById('adminProdCategoryId').value.trim(),
            categoryName: document.getElementById('adminProdCategoryName').value.trim(),
            price: Number(document.getElementById('adminProdPrice').value),
            brand: document.getElementById('adminProdBrand').value.trim(),
        };
        if (!payload.name || !payload.categoryId || Number.isNaN(payload.price)) {
            if (statusEl) statusEl.textContent = 'Заполните название, категорию и цену';
            return;
        }
        try {
            if (statusEl) {
                statusEl.className = 'small text-muted';
                statusEl.textContent = 'Создаём...';
            }
            await API.req('/api/products', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            if (statusEl) {
                statusEl.className = 'small text-success';
                statusEl.textContent = 'Товар создан';
            }
            adminProductForm.reset();
            adminLoadProductsBtn?.click();
        } catch (error) {
            if (statusEl) {
                statusEl.className = 'small text-danger';
                statusEl.textContent = formatError(error, 'Ошибка создания');
            }
        }
    });
}

const rebuildSimsBtn = document.getElementById('rebuildSimsBtn');
if (rebuildSimsBtn) {
    rebuildSimsBtn.onclick = async () => {
        const label = document.getElementById('rebuildStatus');
        if (label) label.textContent = 'Запускаем пересчёт...';
        try {
            const { ok, error } = await API.req('/admin/rebuild-sims', { method: 'POST' });
            if (label) {
                label.className = ok ? 'text-success small' : 'text-danger small';
                label.textContent = ok ? 'Пересчёт завершён успешно' : `Ошибка пересчёта: ${error || 'неизвестно'}`;
            }
        } catch (e) {
            if (label) {
                label.className = 'text-danger small';
                label.textContent = `Ошибка пересчёта: ${formatError(e)}`;
            }
        }
    };
}
