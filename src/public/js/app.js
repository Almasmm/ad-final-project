// очень простой «SDK» для UI
const API = {
    token: localStorage.getItem('token') || null,
    setToken(t) { this.token = t; localStorage.setItem('token', t || ''); },
    async req(path, opts = {}) {
        const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        const res = await fetch(path, { ...opts, headers });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        return res.json();
    }
};

// глобальные кнопки
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
            <a href="/product/${p._id}" class="btn btn-sm btn-primary mt-2">Открыть</a>
          </div>
        </div>
      </div>
    `).join('');
    };

    // авто-поиск на загрузке
    searchBtn.click();

    // блок рекомендаций на главной
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
              <a href="/product/${x.product?._id}" class="btn btn-sm btn-outline-primary mt-2">Открыть</a>
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
          <div class="small text-muted">${p.brand || ''} — ${p.categoryName || ''}</div>
          <div class="mt-2">${p.description || ''}</div>
          <div class="fw-bold mt-2">$${p.price}</div>
          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-outline-danger" id="likeBtn">❤ Лайк</button>
            <button class="btn btn-outline-primary" id="cartBtn">В корзину</button>
            <button class="btn btn-success" id="buyBtn">Купить</button>
          </div>
        </div>
      </div>
    `;

        // похожие
        const sim = await API.req(`/api/products/${p._id}/similar`);
        const sbox = document.getElementById('similar');
        sbox.innerHTML = sim.data.map(x => `
      <div class="col-md-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="small text-muted">sim ${x.sim}</div>
            <h6>${x.product?.name || x.product?._id}</h6>
            <div class="fw-bold mt-2">$${x.product?.price ?? ''}</div>
            <a href="/product/${x.product?._id}" class="btn btn-sm btn-outline-primary mt-2">Открыть</a>
          </div>
        </div>
      </div>
    `).join('');

        // события
        const ensureAuth = () => {
            if (!API.token || !window.__USER_ID__) {
                alert('Нужно войти'); location.href = '/login'; return false;
            }
            return true;
        };

        // записываем просмотр (если залогинен)
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

// Логин
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.onclick = async () => {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const { ok, token, user } = await API.req('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (ok && token) {
            API.setToken(token);
            await fetch('/_session/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id, email: user.email }) });
            location.href = '/';
        }
    };
}
