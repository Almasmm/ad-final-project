(function () {
    'use strict';

    const body = document.body;
    if (!body) return;

    const page = body.dataset.page || '';
    const globalAlert = document.getElementById('globalAlert');
    let globalAlertTimer = null;

    const storageKeys = {
        access: 'tm_access_token',
        refresh: 'tm_refresh_token',
        refreshExp: 'tm_refresh_exp',
        user: 'tm_user_payload',
    };

    const state = {
        ...loadAuthState(),
        cart: createEmptyCartState(),
    };

    document.addEventListener('DOMContentLoaded', () => {
        initGlobal();
        initAuthPages();
        initCatalog();
        initHomeRecommendations();
        initProductPage();
        initWishlistPage();
        initHistoryPage();
        initCartPage();
        initRecommendationsPage();
        initProfilePage();
        initAdminPage();
    });

    function loadAuthState() {
        let user = null;
        try {
            const raw = localStorage.getItem(storageKeys.user);
            user = raw ? JSON.parse(raw) : null;
        } catch (err) {
            user = null;
        }
        return {
            accessToken: localStorage.getItem(storageKeys.access),
            refreshToken: localStorage.getItem(storageKeys.refresh),
            refreshExpiresAt: localStorage.getItem(storageKeys.refreshExp),
            user,
            refreshPromise: null,
        };
    }

    function persistTokens(payload) {
        if (!payload) return;
        const { accessToken, refreshToken, refreshExpiresAt, user } = payload;
        if (typeof accessToken === 'string') {
            state.accessToken = accessToken;
            localStorage.setItem(storageKeys.access, accessToken);
        }
        if (typeof refreshToken === 'string') {
            state.refreshToken = refreshToken;
            localStorage.setItem(storageKeys.refresh, refreshToken);
        }
        if (refreshExpiresAt) {
            const iso = typeof refreshExpiresAt === 'string'
                ? refreshExpiresAt
                : new Date(refreshExpiresAt).toISOString();
            state.refreshExpiresAt = iso;
            localStorage.setItem(storageKeys.refreshExp, iso);
        }
        if (user) {
            state.user = user;
            localStorage.setItem(storageKeys.user, JSON.stringify(user));
        }
    }

    function clearTokens() {
        state.accessToken = null;
        state.refreshToken = null;
        state.refreshExpiresAt = null;
        state.user = null;
        localStorage.removeItem(storageKeys.access);
        localStorage.removeItem(storageKeys.refresh);
        localStorage.removeItem(storageKeys.refreshExp);
        localStorage.removeItem(storageKeys.user);
        state.cart = createEmptyCartState();
        refreshCartIndicator();
    }

    function createEmptyCartState() {
        return {
            items: [],
            totalItems: 0,
            totalQty: 0,
            totalPrice: 0,
            updatedAt: null,
        };
    }

    function updateCartState(cartPayload) {
        const normalized = cartPayload
            ? {
                  items: Array.isArray(cartPayload.items) ? cartPayload.items : [],
                  totalItems: Number(cartPayload.totalItems) || (Array.isArray(cartPayload.items) ? cartPayload.items.length : 0),
                  totalQty: Number(cartPayload.totalQty) || 0,
                  totalPrice: Number(cartPayload.totalPrice) || 0,
                  updatedAt: cartPayload.updatedAt || null,
              }
            : createEmptyCartState();
        state.cart = normalized;
        refreshCartIndicator();
        return normalized;
    }

    function refreshCartIndicator() {
        const indicator = document.getElementById('cartIndicator');
        if (!indicator) return;
        const total = Number(state.cart?.totalQty) || 0;
        indicator.dataset.count = String(total);
        indicator.textContent = total > 0 ? `Cart (${total})` : 'Cart (empty)';
        if (total > 0) {
            indicator.classList.remove('btn-outline-light');
            indicator.classList.add('btn-warning', 'text-dark');
        } else {
            indicator.classList.add('btn-outline-light');
            indicator.classList.remove('btn-warning', 'text-dark');
        }
    }

    function showGlobalMessage(message, type = 'info', timeout = 5000) {
        if (!globalAlert || !message) return;
        clearTimeout(globalAlertTimer);
        globalAlert.textContent = message;
        globalAlert.className = `alert alert-${type}`;
        globalAlert.classList.remove('d-none');
        if (timeout) {
            globalAlertTimer = window.setTimeout(() => {
                hideGlobalMessage();
            }, timeout);
        }
    }

    function hideGlobalMessage() {
        if (!globalAlert) return;
        globalAlert.classList.add('d-none');
        globalAlert.textContent = '';
    }

    function setInlineAlert(el, message, type = 'info') {
        if (!el) return;
        if (!message) {
            el.classList.add('d-none');
            el.textContent = '';
            return;
        }
        el.className = `alert alert-${type}`;
        el.textContent = message;
        el.classList.remove('d-none');
    }

    function toggleButtonLoading(btn, isLoading, loadingText = 'Please wait...') {
        if (!btn) return;
        if (isLoading) {
            if (!btn.dataset.originalText) {
                btn.dataset.originalText = btn.innerHTML;
            }
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${loadingText}`;
        } else {
            btn.disabled = false;
            if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
                delete btn.dataset.originalText;
            }
        }
    }

    function markInvalid(input, message) {
        if (!input) return;
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        if (message) {
            let feedback = input.nextElementSibling;
            if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                input.insertAdjacentElement('afterend', feedback);
            }
            feedback.textContent = message;
        }
    }

    function clearInvalid(input) {
        if (!input) return;
        input.classList.remove('is-invalid');
        input.removeAttribute('aria-invalid');
        const feedback = input.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = '';
        }
    }

    function attachValidation(input) {
        if (!input || input.dataset.validationBound) return;
        ['input', 'change'].forEach((evt) => {
            input.addEventListener(evt, () => clearInvalid(input));
        });
        input.dataset.validationBound = '1';
    }

    function rawFetch(url, options = {}) {
        const opts = { ...options };
        if (!opts.credentials) {
            opts.credentials = 'same-origin';
        }
        if (!opts.method) {
            opts.method = opts.body ? 'POST' : 'GET';
        }
        return fetch(url, opts).then(async (response) => {
            const text = await response.text();
            let data = null;
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    data = null;
                }
            }
            if (!response.ok) {
                const err = new Error((data && (data.error || data.message)) || `Error ${response.status}`);
                err.status = response.status;
                err.payload = data;
                throw err;
            }
            return data;
        });
    }

    function refreshTokens() {
        if (!state.refreshToken) {
            return Promise.reject(new Error('No refresh token'));
        }
        if (state.refreshPromise) {
            return state.refreshPromise;
        }
        const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
        state.refreshPromise = rawFetch('/auth/refresh', {
            method: 'POST',
            headers,
            body: JSON.stringify({ refreshToken: state.refreshToken }),
        }).then((data) => {
            persistTokens(data);
            if (data && data.user) {
                syncSession(data.user);
            }
            return data;
        }).catch((err) => {
            clearTokens();
            syncSession(null);
            throw err;
        }).finally(() => {
            state.refreshPromise = null;
        });
        return state.refreshPromise;
    }

    async function ensureAccessToken() {
        if (state.accessToken) return state.accessToken;
        if (state.refreshToken) {
            const refreshed = await refreshTokens();
            return refreshed ? refreshed.accessToken : null;
        }
        throw new Error('Authentication required');
    }

    async function request(url, options = {}, { auth = false, retry = true } = {}) {
        const headers = { Accept: 'application/json', ...(options.headers || {}) };
        let body = options.body;
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        if (body && !isFormData && typeof body !== 'string') {
            body = JSON.stringify(body);
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
        }
        const fetchOptions = { credentials: options.credentials || 'same-origin' };
        Object.keys(options).forEach((key) => {
            if (key === 'headers' || key === 'body' || key === 'credentials') return;
            fetchOptions[key] = options[key];
        });
        fetchOptions.headers = headers;
        fetchOptions.body = body;
        if (!fetchOptions.method) {
            fetchOptions.method = body ? 'POST' : 'GET';
        }
        if (auth) {
            const token = await ensureAccessToken();
            if (token) {
                fetchOptions.headers.Authorization = `Bearer ${token}`;
            }
        }
        try {
            return await rawFetch(url, fetchOptions);
        } catch (err) {
            if (auth && err.status === 401 && retry && state.refreshToken) {
                try {
                    await refreshTokens();
                    return await request(url, options, { auth: true, retry: false });
                } catch (refreshErr) {
                    throw err;
                }
            }
            throw err;
        }
    }

    async function fetchCartSummary({ silent = false } = {}) {
        if (!isAuthenticated()) {
            updateCartState(null);
            return null;
        }
        try {
            const resp = await request('/api/cart', {}, { auth: true });
            return updateCartState(resp?.data || null);
        } catch (err) {
            if (!silent) {
                showGlobalMessage(err.message, 'danger');
            }
            throw err;
        }
    }

    async function syncSession(user) {
        try {
            await rawFetch('/_session/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    userId: user ? user._id : null,
                    email: user ? user.email : null,
                    role: user ? user.role : null,
                    emailVerified: user ? !!user.emailVerified : false,
                }),
            });
        } catch (err) {
            // silent
        }
    }

    function handleAuthSuccess(payload) {
        persistTokens(payload);
        if (payload && payload.user) {
            syncSession(payload.user);
        }
        return payload;
    }

    async function logoutUser() {
        const token = state.refreshToken;
        try {
            if (token) {
                await rawFetch('/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ refreshToken: token }),
                });
            }
        } catch (err) {
            // ignore logout errors
        } finally {
            clearTokens();
            await syncSession(null);
        }
    }

    function isAuthenticated() {
        return Boolean(state.accessToken || state.refreshToken);
    }

    function initGlobal() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                toggleButtonLoading(logoutBtn, true, 'Signing out...');
                try {
                    await logoutUser();
                    window.location.href = '/login';
                } catch (err) {
                    showGlobalMessage(err.message, 'danger');
                } finally {
                    toggleButtonLoading(logoutBtn, false);
                }
            });
        }
        if (isAuthenticated()) {
            fetchCartSummary({ silent: true }).catch(() => {});
        } else {
            updateCartState(null);
        }
    }

    function initAuthPages() {
        initLoginForm();
        initRegisterForm();
        initForgotForm();
        initResetForm();
        initVerifyForm();
    }

    function initLoginForm() {
        const btn = document.getElementById('loginBtn');
        if (!btn) return;
        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        const info = document.getElementById('loginInfo');
        attachValidation(emailInput);
        attachValidation(passInput);

        const submit = async () => {
            const email = (emailInput?.value || '').trim().toLowerCase();
            const password = (passInput?.value || '').trim();
            let valid = true;
            if (!email) {
                markInvalid(emailInput, 'Enter email');
                valid = false;
            }
            if (!password) {
                markInvalid(passInput, 'Enter password');
                valid = false;
            }
            if (!valid) {
                setInlineAlert(info, 'Fill in the required fields', 'warning');
                return;
            }
            setInlineAlert(info, '');
            toggleButtonLoading(btn, true, 'Signing in...');
            try {
                const payload = await request('/auth/login', {
                    method: 'POST',
                    body: { email, password },
                });
                handleAuthSuccess(payload);
                showGlobalMessage('Signed in successfully', 'success');
                window.location.href = '/';
            } catch (err) {
                setInlineAlert(info, err.message, 'danger');
            } finally {
                toggleButtonLoading(btn, false);
            }
        };

        btn.addEventListener('click', (event) => {
            event.preventDefault();
            submit();
        });
        [emailInput, passInput].forEach((input) => {
            input?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    submit();
                }
            });
        });
    }

    function initRegisterForm() {
        const btn = document.getElementById('regBtn');
        if (!btn) return;
        const emailInput = document.getElementById('reg_email');
        const nameInput = document.getElementById('reg_name');
        const passInput = document.getElementById('reg_password');
        const segmentsInput = document.getElementById('reg_segments');
        const info = document.getElementById('registerInfo');
        [emailInput, nameInput, passInput, segmentsInput].forEach(attachValidation);

        btn.addEventListener('click', async (event) => {
            event.preventDefault();
            const email = (emailInput?.value || '').trim().toLowerCase();
            const name = (nameInput?.value || '').trim();
            const password = (passInput?.value || '').trim();
            const segments = (segmentsInput?.value || '').trim();

            let valid = true;
            if (!email) {
                markInvalid(emailInput, 'Enter email');
                valid = false;
            }
            if (!name) {
                markInvalid(nameInput, 'Enter name');
                valid = false;
            }
            if (!password) {
                markInvalid(passInput, 'Choose a password');
                valid = false;
            }
            if (!valid) {
                setInlineAlert(info, 'Fill in the required fields', 'warning');
                return;
            }

            setInlineAlert(info, '');
            toggleButtonLoading(btn, true, 'Creating...');
            try {
                await request('/auth/register', {
                    method: 'POST',
                    body: { email, name, password, segments },
                });
                setInlineAlert(info, 'Account created. Please check your inbox to verify.', 'success');
                window.setTimeout(() => {
                    window.location.href = '/verify';
                }, 1400);
            } catch (err) {
                setInlineAlert(info, err.message, 'danger');
            } finally {
                toggleButtonLoading(btn, false);
            }
        });
    }

    function initForgotForm() {
        const sendBtn = document.getElementById('forgotBtn');
        if (!sendBtn) return;
        const resendBtn = document.getElementById('forgotResendBtn');
        const continueBtn = document.getElementById('forgotContinueBtn');
        const emailInput = document.getElementById('forgot_email');
        const codeInput = document.getElementById('forgot_code');
        const codeSection = document.getElementById('forgotCodeSection');
        const info = document.getElementById('forgotInfo');
        attachValidation(emailInput);
        attachValidation(codeInput);

        const revealCodeStep = () => {
            codeSection?.classList.remove('d-none');
            resendBtn?.classList.remove('d-none');
            if (codeInput) {
                codeInput.focus();
            }
        };

        const sendResetRequest = async (button, actionLabel = 'Sending...') => {
            const email = (emailInput?.value || '').trim().toLowerCase();
            if (!email) {
                markInvalid(emailInput, 'Enter email');
                setInlineAlert(info, 'Email is required to send the code', 'warning');
                return;
            }
            setInlineAlert(info, '');
            toggleButtonLoading(button, true, actionLabel);
            if (button !== sendBtn) {
                sendBtn.disabled = true;
            }
            try {
                const resp = await request('/auth/forgot', {
                    method: 'POST',
                    body: { email },
                });
                let message = 'We sent a verification code to the provided email.';
                if (resp && resp.demoCode) {
                    message += ` DEV/DEBUG: ${resp.demoCode}`;
                }
                setInlineAlert(info, message, 'success');
                revealCodeStep();
            } catch (err) {
                setInlineAlert(info, err.message, 'danger');
            } finally {
                toggleButtonLoading(button, false);
                sendBtn.disabled = false;
            }
        };

        sendBtn.addEventListener('click', (event) => {
            event.preventDefault();
            sendResetRequest(sendBtn, 'Sending...');
        });

        resendBtn?.addEventListener('click', (event) => {
            event.preventDefault();
            sendResetRequest(resendBtn, 'Resending...');
        });

        continueBtn?.addEventListener('click', (event) => {
            event.preventDefault();
            const email = (emailInput?.value || '').trim().toLowerCase();
            const code = (codeInput?.value || '').trim();
            if (!email) {
                markInvalid(emailInput, 'Enter email');
                setInlineAlert(info, 'Email is required to continue', 'warning');
                return;
            }
            if (!code) {
                markInvalid(codeInput, 'Enter verification code');
                setInlineAlert(info, 'Enter the verification code we sent', 'warning');
                return;
            }
            const params = new URLSearchParams({ email, code });
            window.location.href = `/reset?${params.toString()}`;
        });
    }

    function initResetForm() {
        const btn = document.getElementById('resetBtn');
        if (!btn) return;
        const emailInput = document.getElementById('reset_email');
        const codeInput = document.getElementById('reset_code');
        const passInput = document.getElementById('reset_new_password');
        const info = document.getElementById('resetInfo');
        [emailInput, codeInput, passInput].forEach(attachValidation);
        const params = new URLSearchParams(window.location.search);
        if (params.get('email') && emailInput) {
            emailInput.value = params.get('email');
        }
        if (params.get('code') && codeInput) {
            codeInput.value = params.get('code');
        }

        btn.addEventListener('click', async (event) => {
            event.preventDefault();
            const email = (emailInput?.value || '').trim().toLowerCase();
            const code = (codeInput?.value || '').trim();
            const newPassword = (passInput?.value || '').trim();
            let valid = true;
            if (!email) {
                markInvalid(emailInput, 'Enter email');
                valid = false;
            }
            if (!code) {
                markInvalid(codeInput, 'Enter the code');
                valid = false;
            }
            if (!newPassword) {
                markInvalid(passInput, 'Enter a new password');
                valid = false;
            }
            if (!valid) {
                setInlineAlert(info, 'Please fill in the fields', 'warning');
                return;
            }
            setInlineAlert(info, '');
            toggleButtonLoading(btn, true, 'Updating...');
            try {
                await request('/auth/reset', {
                    method: 'POST',
                    body: { email, code, newPassword },
                });
                setInlineAlert(info, 'Password updated. You can sign in now.', 'success');
                window.setTimeout(() => {
                    window.location.href = '/login';
                }, 1400);
            } catch (err) {
                setInlineAlert(info, err.message, 'danger');
            } finally {
                toggleButtonLoading(btn, false);
            }
        });
    }

    function initVerifyForm() {
        const verifyBtn = document.getElementById('verifyBtn');
        const resendBtn = document.getElementById('resendVerifyBtn');
        if (!verifyBtn && !resendBtn) return;
        const emailInput = document.getElementById('verify_email');
        const codeInput = document.getElementById('verify_code');
        const info = document.getElementById('verifyInfo');
        [emailInput, codeInput].forEach(attachValidation);

        if (verifyBtn) {
            verifyBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                const email = (emailInput?.value || '').trim().toLowerCase();
                const code = (codeInput?.value || '').trim();
                if (!email || !code) {
                    if (!email) markInvalid(emailInput, 'Enter email');
                    if (!code) markInvalid(codeInput, 'Enter the code');
                    setInlineAlert(info, 'Enter the email and the code from the message', 'warning');
                    return;
                }
                setInlineAlert(info, '');
                toggleButtonLoading(verifyBtn, true, 'Verifying...');
                try {
                    await request('/auth/verify', {
                        method: 'POST',
                        body: { email, code },
                    });
                    setInlineAlert(info, 'Email verified. Redirecting to login...', 'success');
                    window.setTimeout(() => {
                        window.location.href = '/login';
                    }, 1400);
                } catch (err) {
                    setInlineAlert(info, err.message, 'danger');
                } finally {
                    toggleButtonLoading(verifyBtn, false);
                }
            });
        }

        if (resendBtn) {
            resendBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                const email = (emailInput?.value || '').trim().toLowerCase();
                if (!email) {
                    markInvalid(emailInput, 'Enter email');
                    setInlineAlert(info, 'Email is required to resend the code', 'warning');
                    return;
                }
                toggleButtonLoading(resendBtn, true, 'Sending...');
                try {
                    const resp = await request('/auth/verify/resend', {
                        method: 'POST',
                        body: { email },
                    });
                    let message = resp?.message || 'Verification email sent again.';
                    if (resp?.demoCode) {
                        message += ` DEV/DEBUG: ${resp.demoCode}`;
                    }
                    let alertType = 'info';
                    if (resp?.emailSent === true) {
                        alertType = 'success';
                    } else if (resp?.emailSent === false) {
                        alertType = 'warning';
                    } else if (message.toLowerCase().includes('already verified')) {
                        alertType = 'success';
                    }
                    setInlineAlert(info, message, alertType);
                } catch (err) {
                    setInlineAlert(info, err.message, 'danger');
                } finally {
                    toggleButtonLoading(resendBtn, false);
                }
            });
        }
    }

    function initCatalog() {
        if (page !== 'home' && page !== 'search') return;
        const form = document.getElementById('catalogForm');
        const productsWrap = document.getElementById('products');
        if (!form || !productsWrap) return;
        const qInput = document.getElementById('q');
        const categoryInput = document.getElementById('categoryId');
        const sortInput = document.getElementById('sort');
        const tagsInput = document.getElementById('tagFilter');
        const priceMinInput = document.getElementById('priceMin');
        const priceMaxInput = document.getElementById('priceMax');
        const ratingInput = document.getElementById('ratingFilter');
        const emptyState = document.getElementById('productsEmpty');
        const summaryEl = document.getElementById('searchSummary');
        const countEl = document.getElementById('productsCount');
        const params = new URLSearchParams(window.location.search);
        if (params.get('q') && qInput) qInput.value = params.get('q');
        if (params.get('categoryId') && categoryInput) categoryInput.value = params.get('categoryId');
        if (params.get('sort') && sortInput) sortInput.value = params.get('sort');
        if (params.get('tags') && tagsInput) tagsInput.value = params.get('tags');
        if (params.get('minPrice') && priceMinInput) priceMinInput.value = params.get('minPrice');
        if (params.get('maxPrice') && priceMaxInput) priceMaxInput.value = params.get('maxPrice');
        if (params.get('minRating') && ratingInput) ratingInput.value = params.get('minRating');

        const collectFilters = () => ({
            q: (qInput?.value || '').trim(),
            categoryId: categoryInput?.value || '',
            sort: sortInput?.value || '',
            tags: (tagsInput?.value || '').trim(),
            minPrice: priceMinInput?.value || '',
            maxPrice: priceMaxInput?.value || '',
            minRating: ratingInput?.value || '',
        });

        const buildSummary = (filters) => {
            const parts = [];
            if (filters.q) parts.push(`search “${filters.q}”`);
            if (filters.categoryId) parts.push(`category ${getCategoryLabel(filters.categoryId)}`);
            if (filters.minPrice || filters.maxPrice) {
                parts.push(`price ${filters.minPrice || '0'}–${filters.maxPrice || '∞'}`);
            }
            if (filters.minRating) parts.push(`rating ≥ ${filters.minRating}★`);
            if (filters.tags) parts.push(`tags: ${filters.tags}`);
            return parts.length ? `Filters applied: ${parts.join(', ')}.` : 'No filters applied.';
        };

        const setLoading = () => {
            productsWrap.innerHTML = '<div class="col-12 text-center text-muted py-4">Loading...</div>';
            if (emptyState) emptyState.classList.add('d-none');
            if (countEl) countEl.textContent = '';
        };

        const renderProducts = (items) => {
            productsWrap.innerHTML = '';
            if (!items.length) {
                if (emptyState) emptyState.classList.remove('d-none');
                return;
            }
            if (emptyState) emptyState.classList.add('d-none');
            const fragment = document.createDocumentFragment();
            items.forEach((product) => {
                fragment.appendChild(buildProductCard(product));
            });
            productsWrap.appendChild(fragment);
        };

        const loadProducts = async ({ updateUrl = page === 'search' } = {}) => {
            setLoading();
            const filters = collectFilters();
            const query = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) {
                    const param = key === 'minRating' ? 'minRating' : key;
                    query.append(param, value);
                }
            });
            const url = query.toString() ? `/api/products?${query}` : '/api/products';
            try {
                const resp = await request(url);
                const items = resp?.data || [];
                renderProducts(items);
                if (countEl) countEl.textContent = items.length ? `${items.length} items` : '';
                if (summaryEl) summaryEl.textContent = buildSummary(filters);
                if (updateUrl) {
                    const newUrl = query.toString() ? `${window.location.pathname}?${query}` : window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                }
            } catch (err) {
                productsWrap.innerHTML = `<div class="col-12"><div class="alert alert-danger">${err.message}</div></div>`;
            }
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            loadProducts();
        });

        productsWrap.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const btn = target.closest('button[data-action]');
            if (!btn) return;
            event.preventDefault();
            const productId = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            if (!productId || !action) return;
            handleProductAction(action, productId, btn);
        });

        loadProducts({ updateUrl: false });
    }

    function getCategoryLabel(categoryId) {
        const map = {
            c_10: 'Keyboards',
            c_11: 'Mice',
            c_12: 'Monitors',
            c_13: 'Audio',
            c_14: 'Accessories',
        };
        return map[categoryId] || categoryId;
    }

    async function handleProductAction(action, productId, btn) {
        if (!isAuthenticated()) {
            showGlobalMessage('Sign in to continue', 'warning');
            return;
        }
        if (!productId) return;
        if (btn) btn.disabled = true;
        try {
            if (action === 'wishlist') {
                await request('/api/interactions', {
                    method: 'POST',
                    body: { productId, type: 'like', value: 5 },
                }, { auth: true });
                showGlobalMessage('Item added to wishlist', 'success');
                return;
            }
            if (action === 'cart') {
                const resp = await request('/api/cart/items', {
                    method: 'POST',
                    body: { productId, qty: 1 },
                }, { auth: true });
                const cartData = updateCartState(resp?.data || null);
                const totalQty = Number(cartData.totalQty) || 0;
                const suffix = totalQty === 1 ? '' : 's';
                showGlobalMessage(
                    totalQty > 0
                        ? `Added to cart. ${totalQty} item${suffix} total.`
                        : 'Cart is empty.',
                    'success'
                );
                void recordCartInteraction(productId);
                return;
            }
            showGlobalMessage('Unsupported action', 'warning');
        } catch (err) {
            showGlobalMessage(err.message, 'danger');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function recordCartInteraction(productId) {
        try {
            await request('/api/interactions', {
                method: 'POST',
                body: { productId, type: 'add_to_cart', value: 1 },
            }, { auth: true });
        } catch (_err) {
            // analytics logging is best-effort
        }
    }

    function buildProductCard(product, options = {}) {
        const opts = {
            showActions: options.showActions !== false,
            columnClass: options.columnClass || 'col-sm-6 col-lg-4',
            metaText: options.metaText || '',
        };
        const col = document.createElement('div');
        col.className = opts.columnClass;
        const category = product.categoryName || product.category || '';
        const tags = Array.isArray(product.tags) ? product.tags.slice(0, 3) : [];
        const tagsHtml = tags.map((tag) => `<span class="badge bg-light text-muted me-1">${tag}</span>`).join('');
        const meta = opts.metaText ? `<div class="text-muted small mt-1">${opts.metaText}</div>` : '';
        col.innerHTML = `
            <div class="card catalog-card h-100 shadow-sm">
                <div class="card-body d-flex flex-column">
                    <div class="small text-muted mb-1">${product.brand || ''}</div>
                    <h5 class="card-title mb-1">${product.name || 'No name'}</h5>
                    ${category ? `<span class="badge text-bg-secondary mb-2">${category}</span>` : ''}
                    ${tagsHtml ? `<div class="mb-2">${tagsHtml}</div>` : ''}
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold fs-5 text-primary">${formatCurrency(product.price)}</span>
                            <span class="text-warning small">${formatRating(product.rating)}</span>
                        </div>
                        ${meta}
                    </div>
                </div>
                <div class="card-footer bg-transparent border-top">
                    ${opts.showActions ? `
                    <div class="btn-group w-100">
                        <a class="btn btn-outline-secondary btn-sm" href="/product/${product._id}">Open</a>
                        <button class="btn btn-outline-primary btn-sm" data-action="wishlist" data-id="${product._id}">Wishlist</button>
                        <button class="btn btn-primary btn-sm" data-action="cart" data-id="${product._id}">Add to cart</button>
                    </div>` : `
                    <div class="d-grid">
                        <a class="btn btn-outline-secondary btn-sm" href="/product/${product._id}">Details</a>
                    </div>`}
                </div>
            </div>
        `;
        return col;
    }

    function formatCurrency(value) {
        if (typeof value !== 'number') return '—';
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
        } catch (err) {
            return `$${value}`;
        }
    }

    function formatRating(value) {
        if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return '-';
        return `★ ${value.toFixed(1)}`;
    }

    function formatDateTime(value) {
        if (!value) return '—';
        const date = value instanceof Date ? value : new Date(value);
        return new Intl.DateTimeFormat('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }

    function initHomeRecommendations() {
        if (page !== 'home') return;
        const userId = window.__USER_ID__;
        const container = document.getElementById('reco');
        const emptyEl = document.getElementById('recoEmpty');
        if (!userId || !container) return;
        container.innerHTML = '<div class="col-12 text-muted">Loading personal recommendations...</div>';
        request(`/api/recommendations/${userId}`, {}, { auth: true })
            .then((resp) => {
                const data = resp?.data || [];
                container.innerHTML = '';
                if (!data.length) {
                    if (emptyEl) emptyEl.textContent = 'No recommendations yet — browse the catalog and interact with products.';
                    return;
                }
                if (emptyEl) emptyEl.textContent = '';
                const fragment = document.createDocumentFragment();
                data.slice(0, 6).forEach((entry) => {
                    fragment.appendChild(buildProductCard(entry.product || entry, { columnClass: 'col-md-4' }));
                });
                container.appendChild(fragment);
            })
            .catch((err) => {
                if (emptyEl) emptyEl.textContent = err.message;
            });
    }

    function initProductPage() {
        if (page !== 'product') return;
        const productId = window.__PRODUCT_ID__;
        const card = document.getElementById('productCard');
        if (!productId || !card) return;
        card.innerHTML = '<div class="alert alert-info">Loading product data...</div>';

        const loadDetails = async () => {
            try {
                const resp = await request(`/api/products/${productId}`);
                renderProductDetails(resp?.data);
            } catch (err) {
                card.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
            }
        };

        const loadNeighbors = async (path, listId, emptyId, metaFormatter) => {
            const wrap = document.getElementById(listId);
            const empty = document.getElementById(emptyId);
            if (!wrap) return;
            wrap.innerHTML = '<div class="col-12 text-muted">Loading...</div>';
            try {
                const resp = await request(path);
                const items = resp?.data || [];
                wrap.innerHTML = '';
                if (!items.length) {
                    if (empty) empty.textContent = 'No data to display.';
                    return;
                }
                if (empty) empty.textContent = '';
                const fragment = document.createDocumentFragment();
                items.forEach((entry) => {
                    const product = entry.product || entry;
                    const meta = metaFormatter ? metaFormatter(entry) : '';
                    fragment.appendChild(buildProductCard(product, { showActions: false, columnClass: 'col-md-4', metaText: meta }));
                });
                wrap.appendChild(fragment);
            } catch (err) {
                if (empty) empty.textContent = err.message;
            }
        };

        function renderProductDetails(product) {
            if (!product) {
                card.innerHTML = '<div class="alert alert-warning">Product not found</div>';
                return;
            }
            const tags = Array.isArray(product.tags) ? product.tags : [];
            const tagsHtml = tags.map((tag) => `<span class="badge bg-light text-muted me-1">${tag}</span>`).join('');
            card.innerHTML = `
                <div class="card shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between flex-wrap mb-3">
                            <div>
                                <h2 class="mb-1">${product.name}</h2>
                                <p class="text-muted mb-0">${product.brand || ''} ${product.categoryName || ''}</p>
                            </div>
                            <div class="text-end">
                                <div class="fs-3 fw-bold text-primary">${formatCurrency(product.price)}</div>
                                <div class="text-muted">Rating: ${formatRating(product.rating)}</div>
                            </div>
                        </div>
                        <p class="text-muted">${product.description || 'Description will be available later.'}</p>
                        ${tagsHtml ? `<div class="mb-3">${tagsHtml}</div>` : ''}
                        <div class="text-muted small">Views: ${product.viewsCount || 0}</div>
                    </div>
                    <div class="card-footer d-flex flex-wrap gap-2">
                        <button class="btn btn-outline-danger flex-fill" id="likeBtn" data-id="${product._id}">❤ Like</button>
                        <button class="btn btn-outline-primary flex-fill" id="cartBtn" data-id="${product._id}">Add to cart</button>
                        <button class="btn btn-primary flex-fill" id="buyBtn" data-id="${product._id}">Buy now</button>
                    </div>
                </div>
            `;

            const actionHandler = (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                if (target.id === 'likeBtn') {
                    handleProductAction('wishlist', product._id, target);
                } else if (target.id === 'cartBtn') {
                    handleProductAction('cart', product._id, target);
                } else if (target.id === 'buyBtn') {
                    handleQuickPurchase(product, target);
                }
            };
            card.addEventListener('click', actionHandler);
        }

        async function handleQuickPurchase(product, btn) {
            if (!isAuthenticated()) {
                showGlobalMessage('Sign in to place an order', 'warning');
                return;
            }
            toggleButtonLoading(btn, true, 'Processing...');
            try {
                await request('/api/orders/checkout', {
                    method: 'POST',
                    body: {
                        items: [{ productId: product._id, qty: 1, price: product.price || 0 }],
                    },
                }, { auth: true });
                showGlobalMessage('Order created (demo)', 'success');
            } catch (err) {
                showGlobalMessage(err.message, 'danger');
            } finally {
                toggleButtonLoading(btn, false);
            }
        }

        loadDetails();
        loadNeighbors(`/api/products/${productId}/similar`, 'similar', 'similarEmpty', (entry) => entry.sim ? `Similarity: ${entry.sim.toFixed(2)}` : '');
        loadNeighbors(`/api/products/${productId}/bought-together`, 'boughtTogether', 'boughtTogetherEmpty', (entry) => entry.score ? `Bought together score: ${entry.score}` : '');
    }

    function initWishlistPage() {
        if (page !== 'wishlist') return;
        const listEl = document.getElementById('wishlistItems');
        const emptyEl = document.getElementById('wishlistEmpty');
        const countEl = document.getElementById('wishlistCount');
        const reloadBtn = document.getElementById('wishlistReloadBtn');
        const recoList = document.getElementById('wishlistReco');
        const recoEmpty = document.getElementById('wishlistRecoEmpty');
        if (!listEl) return;

        const buildCard = (product) => {
            const col = document.createElement('div');
            col.className = 'col-md-4';
            const category = product.categoryName || product.category || '';
            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="card-body d-flex flex-column">
                        <div class="small text-muted mb-1">${product.brand || ''}</div>
                        <h5 class="card-title mb-1">${product.name || 'No name'}</h5>
                        ${category ? `<span class="badge text-bg-secondary mb-2">${category}</span>` : ''}
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-bold text-primary">${formatCurrency(product.price)}</span>
                                <span class="text-warning small">${formatRating(product.rating)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer d-flex flex-wrap gap-2">
                        <button class="btn btn-outline-secondary btn-sm flex-fill" data-action="open" data-id="${product._id}">Open</button>
                        <button class="btn btn-outline-primary btn-sm flex-fill" data-action="cart" data-id="${product._id}">Add to cart</button>
                        <button class="btn btn-danger btn-sm flex-fill" data-action="remove" data-id="${product._id}">Remove</button>
                    </div>
                </div>
            `;
            return col;
        };

        const renderItems = (items) => {
            listEl.innerHTML = '';
            if (!items.length) {
                if (emptyEl) emptyEl.textContent = 'No saved products yet.';
                return;
            }
            if (emptyEl) emptyEl.textContent = '';
            const fragment = document.createDocumentFragment();
            items.forEach((product) => {
                fragment.appendChild(buildCard(product));
            });
            listEl.appendChild(fragment);
        };

        const renderRecommendations = (items) => {
            if (!recoList) return;
            recoList.innerHTML = '';
            if (!items.length) {
                if (recoEmpty) recoEmpty.textContent = 'No recommendations yet.';
                return;
            }
            if (recoEmpty) recoEmpty.textContent = '';
            const fragment = document.createDocumentFragment();
            items.forEach((entry) => {
                const product = entry.product || entry;
                const metaText = entry.score ? `score: ${entry.score.toFixed(2)}` : '';
                fragment.appendChild(buildProductCard(product, { columnClass: 'col-md-4', metaText }));
            });
            recoList.appendChild(fragment);
        };

        const loadWishlist = async () => {
            listEl.innerHTML = '<div class="col-12 text-center text-muted py-3">Loading...</div>';
            if (emptyEl) emptyEl.textContent = '';
            if (recoEmpty) recoEmpty.textContent = 'Loading suggestions...';
            try {
                const resp = await request('/api/users/me/wishlist', {}, { auth: true });
                const items = resp?.data?.items || [];
                const recommendations = resp?.data?.recommendations || [];
                renderItems(items);
                renderRecommendations(recommendations);
                if (countEl) {
                    countEl.textContent = items.length ? `${items.length} items` : 'No items';
                }
            } catch (err) {
                listEl.innerHTML = `<div class="col-12"><div class="alert alert-danger">${err.message}</div></div>`;
                if (recoEmpty) recoEmpty.textContent = 'Failed to load recommendations';
            }
        };

        const removeItem = async (productId, btn) => {
            toggleButtonLoading(btn, true, 'Removing...');
            try {
                await request(`/api/users/me/wishlist/${productId}`, { method: 'DELETE' }, { auth: true });
                await loadWishlist();
            } catch (err) {
                showGlobalMessage(err.message, 'danger');
            } finally {
                toggleButtonLoading(btn, false);
            }
        };

        listEl.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const btn = target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const productId = btn.getAttribute('data-id');
            if (!productId) return;
            if (action === 'remove') {
                event.preventDefault();
                removeItem(productId, btn);
            } else if (action === 'cart') {
                event.preventDefault();
                handleProductAction('cart', productId, btn);
            } else if (action === 'open') {
                window.location.href = `/product/${productId}`;
            }
        });

        if (reloadBtn) {
            reloadBtn.addEventListener('click', (event) => {
                event.preventDefault();
                loadWishlist();
            });
        }

        loadWishlist();
    }

    function initHistoryPage() {
        if (page !== 'history') return;
        const userId = window.__USER_ID__;
        const tableInteractions = document.getElementById('history_interactions');
        const tableOrders = document.getElementById('history_orders');
        if (!userId || !tableInteractions || !tableOrders) return;

        const renderRows = async () => {
            try {
                const resp = await request(`/api/users/${userId}/history`, {}, { auth: true });
                const interactions = resp?.data?.interactions || [];
                const orders = resp?.data?.orders || [];

        const actionLabels = {
            view: 'view',
            like: 'like',
            purchase: 'purchase',
            cartAdd: 'add to cart',
            add_to_cart: 'add to cart',
        };

                tableInteractions.innerHTML = '';
                if (!interactions.length) {
                    tableInteractions.innerHTML = '<tr><td colspan="4" class="text-muted">No data</td></tr>';
                } else {
                    interactions.slice(0, 20).forEach((item) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${formatDateTime(item.ts || item.timestamp)}</td>
                            <td><code>${item.productId}</code></td>
                            <td>${actionLabels[item.type] || actionLabels[item.action] || item.type}</td>
                            <td>${item.value != null ? item.value : ''}</td>
                        `;
                        tableInteractions.appendChild(row);
                    });
                }

                tableOrders.innerHTML = '';
                if (!orders.length) {
                    tableOrders.innerHTML = '<tr><td colspan="4" class="text-muted">No orders</td></tr>';
                } else {
                    orders.slice(0, 20).forEach((order) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${formatDateTime(order.createdAt)}</td>
                            <td><code>${order._id}</code></td>
                            <td>${(order.items || []).length}</td>
                            <td>${formatCurrency(order.total)}</td>
                        `;
                        tableOrders.appendChild(row);
                    });
                }
            } catch (err) {
                const errorRow = `<tr><td colspan="4" class="text-danger">${err.message}</td></tr>`;
                tableInteractions.innerHTML = errorRow;
                tableOrders.innerHTML = errorRow;
            }
        };

        renderRows();
    }

    function initCartPage() {
        if (page !== 'cart') return;
        const listEl = document.getElementById('cartItems');
        const emptyEl = document.getElementById('cartEmpty');
        const summaryItemsEl = document.getElementById('cartSummaryItems');
        const summaryQtyEl = document.getElementById('cartSummaryQty');
        const summarySubtotalEl = document.getElementById('cartSummarySubtotal');
        const summaryTotalEl = document.getElementById('cartSummaryTotal');
        const summaryUpdatedEl = document.getElementById('cartSummaryUpdated');
        const checkoutBtn = document.getElementById('cartCheckoutBtn');
        const refreshBtn = document.getElementById('cartRefreshBtn');
        if (!listEl) return;

        const buildTags = (tags = []) => {
            if (!Array.isArray(tags) || !tags.length) return '';
            return `<div class="mt-1">${tags.slice(0, 3).map((tag) => `<span class="badge bg-light text-muted me-1">${tag}</span>`).join('')}</div>`;
        };

        const buildCartRow = (item) => {
            const product = item.product || {};
            const price = Number(item.price ?? product.price) || 0;
            const lineTotal = price * (Number(item.qty) || 0);
            const category = product.categoryName || product.category || '';
            const tagsHtml = buildTags(product.tags);
            const col = document.createElement('div');
            col.className = 'card cart-item shadow-sm';
            col.dataset.productId = item.productId;
            col.innerHTML = `
                <div class="card-body d-flex flex-wrap align-items-center gap-3">
                    <div class="flex-grow-1 min-w-0">
                        <div class="text-muted small">${product.brand || ''}</div>
                        <h6 class="mb-1 text-truncate">${product.name || 'Unavailable product'}</h6>
                        ${category ? `<span class="badge text-bg-secondary">${category}</span>` : ''}
                        ${tagsHtml}
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">${formatCurrency(price)}</div>
                        <div class="text-muted small">Per unit</div>
                    </div>
                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <div class="input-group input-group-sm cart-qty-group">
                            <button class="btn btn-outline-secondary" type="button" data-action="decrease" data-id="${item.productId}">-</button>
                            <input type="number" class="form-control cart-qty-input" min="1" value="${item.qty}"
                                data-id="${item.productId}" aria-label="Quantity for ${product.name || item.productId}">
                            <button class="btn btn-outline-secondary" type="button" data-action="increase" data-id="${item.productId}">+</button>
                        </div>
                        <div class="text-muted small">Line total: <strong>${formatCurrency(lineTotal)}</strong></div>
                    </div>
                    <div class="ms-auto">
                        <button class="btn btn-link text-danger p-0" type="button" data-action="remove" data-id="${item.productId}">Remove</button>
                    </div>
                </div>
            `;
            return col;
        };

        const renderSummary = (cart) => {
            const totalItems = Number(cart?.totalItems) || 0;
            const totalQty = Number(cart?.totalQty) || 0;
            const totalPrice = Number(cart?.totalPrice) || 0;
            if (summaryItemsEl) summaryItemsEl.textContent = totalItems;
            if (summaryQtyEl) summaryQtyEl.textContent = totalQty;
            if (summarySubtotalEl) summarySubtotalEl.textContent = formatCurrency(totalPrice);
            if (summaryTotalEl) summaryTotalEl.textContent = formatCurrency(totalPrice);
            if (summaryUpdatedEl) {
                summaryUpdatedEl.textContent = cart?.updatedAt
                    ? `Updated ${formatDateTime(cart.updatedAt)}`
                    : 'Never updated';
            }
            if (checkoutBtn) {
                checkoutBtn.disabled = totalQty === 0;
            }
        };

        const renderCart = (cart) => {
            const items = Array.isArray(cart?.items) ? cart.items : [];
            listEl.innerHTML = '';
            if (!items.length) {
                if (emptyEl) emptyEl.textContent = 'Your cart is empty.';
                return;
            }
            if (emptyEl) emptyEl.textContent = '';
            const fragment = document.createDocumentFragment();
            items.forEach((item) => fragment.appendChild(buildCartRow(item)));
            listEl.appendChild(fragment);
        };

        const renderAll = (cart) => {
            renderCart(cart);
            renderSummary(cart);
        };

        const normalizeQty = (value) => {
            const num = Number(value);
            if (!Number.isFinite(num)) return 0;
            return Math.max(0, Math.floor(num));
        };

        const handleQtyUpdate = async (productId, qty, control) => {
            const nextQty = normalizeQty(qty);
            if (control) control.disabled = true;
            try {
                if (nextQty <= 0) {
                    await handleRemove(productId, null);
                    return;
                }
                const resp = await request(`/api/cart/items/${productId}`, {
                    method: 'PATCH',
                    body: { qty: nextQty },
                }, { auth: true });
                const cartData = updateCartState(resp?.data || null);
                renderAll(cartData);
            } catch (err) {
                showGlobalMessage(err.message, 'danger');
            } finally {
                if (control) control.disabled = false;
            }
        };

        const handleRemove = async (productId, control) => {
            if (control && control.tagName === 'BUTTON') {
                toggleButtonLoading(control, true, 'Removing...');
            } else if (control) {
                control.disabled = true;
            }
            try {
                const resp = await request(`/api/cart/items/${productId}`, { method: 'DELETE' }, { auth: true });
                const cartData = updateCartState(resp?.data || null);
                renderAll(cartData);
            } catch (err) {
                showGlobalMessage(err.message, 'danger');
            } finally {
                if (control && control.tagName === 'BUTTON') {
                    toggleButtonLoading(control, false);
                } else if (control) {
                    control.disabled = false;
                }
            }
        };

        const loadCart = async () => {
            listEl.innerHTML = '<div class="text-center text-muted py-3">Loading cart...</div>';
            if (emptyEl) emptyEl.textContent = '';
            try {
                const cart = await fetchCartSummary({ silent: true });
                renderAll(cart);
            } catch (err) {
                listEl.innerHTML = '';
                if (emptyEl) emptyEl.textContent = err.message;
            }
        };

        listEl.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const btn = target.closest('button[data-action]');
            if (!btn) return;
            const productId = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            if (!productId || !action) return;
            if (action === 'increase' || action === 'decrease') {
                const rowInput = listEl.querySelector(`input.cart-qty-input[data-id="${productId}"]`);
                const current = normalizeQty(rowInput?.value || 1);
                const delta = action === 'increase' ? 1 : -1;
                const nextQty = current + delta;
                handleQtyUpdate(productId, nextQty, btn);
            } else if (action === 'remove') {
                handleRemove(productId, btn);
            }
        });

        listEl.addEventListener('change', (event) => {
            const input = event.target;
            if (!(input instanceof HTMLInputElement)) return;
            if (!input.classList.contains('cart-qty-input')) return;
            const productId = input.getAttribute('data-id');
            if (!productId) return;
            handleQtyUpdate(productId, input.value, input);
        });

        if (refreshBtn) {
            refreshBtn.addEventListener('click', (event) => {
                event.preventDefault();
                loadCart();
            });
        }

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                const items = Array.isArray(state.cart?.items) ? state.cart.items : [];
                if (!items.length) {
                    showGlobalMessage('Your cart is empty.', 'info');
                    return;
                }
                toggleButtonLoading(checkoutBtn, true, 'Processing...');
                try {
                    const payload = items.map((item) => ({
                        productId: item.productId,
                        qty: item.qty,
                        price: item.price || Number(item.product?.price) || 0,
                    }));
                    await request('/api/orders/checkout', {
                        method: 'POST',
                        body: { items: payload },
                    }, { auth: true });
                    showGlobalMessage('Order placed successfully (demo).', 'success');
                    const cart = await fetchCartSummary({ silent: true });
                    renderAll(cart);
                } catch (err) {
                    showGlobalMessage(err.message, 'danger');
                } finally {
                    toggleButtonLoading(checkoutBtn, false);
                }
            });
        }

        loadCart();
    }

    function initRecommendationsPage() {
        if (page !== 'reco') return;
        const userId = window.__USER_ID__;
        if (!userId) return;
        const sections = [
            { list: 'reco_personal', empty: 'reco_personal_empty', key: 'personal', meta: (entry) => entry.score ? `score: ${entry.score.toFixed(2)}` : '' },
            { list: 'reco_recent', empty: 'reco_recent_empty', key: 'recent', meta: () => 'based on recent views' },
            { list: 'reco_similar_users', empty: 'reco_similar_users_empty', key: 'similarUsers', meta: (entry) => entry.score ? `popularity: ${entry.score}` : '' },
        ];

        sections.forEach((section) => {
            const emptyEl = document.getElementById(section.empty);
            if (emptyEl) emptyEl.textContent = 'Loading...';
        });

        request(`/recommend/user/${userId}`, {}, { auth: true })
            .then((resp) => {
                const data = resp?.data || {};
                sections.forEach((section) => {
                    const container = document.getElementById(section.list);
                    const emptyEl = document.getElementById(section.empty);
                    if (!container) return;
                    const items = data[section.key] || [];
                    container.innerHTML = '';
                    if (!items.length) {
                    if (emptyEl) emptyEl.textContent = 'No data yet.';
                        return;
                    }
                    if (emptyEl) emptyEl.textContent = '';
                    const fragment = document.createDocumentFragment();
                    items.forEach((entry) => {
                        const product = entry.product || entry;
                        fragment.appendChild(buildProductCard(product, {
                            columnClass: 'col-md-4',
                            metaText: section.meta(entry),
                        }));
                    });
                    container.appendChild(fragment);
                });
            })
            .catch((err) => {
                sections.forEach((section) => {
                    const emptyEl = document.getElementById(section.empty);
                    if (emptyEl) emptyEl.textContent = err.message;
                });
            });
    }

    function initProfilePage() {
        if (page !== 'profile') return;
        const form = document.getElementById('profileForm');
        const summary = document.getElementById('profileSummary');
        const meta = document.getElementById('profileMeta');
        const wishlistList = document.getElementById('profileWishlist');
        const cachedList = document.getElementById('profileCached');
        const viewList = document.getElementById('profileViews');
        const purchaseList = document.getElementById('profilePurchases');
        const alert = document.getElementById('profileAlert');
        if (!form) return;

        const fillList = (listEl, items, emptyLabel) => {
            if (!listEl) return;
            listEl.innerHTML = '';
            if (!items || !items.length) {
                listEl.innerHTML = `<li class="list-group-item text-muted">${emptyLabel}</li>`;
                return;
            }
            items.forEach((value) => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = value;
                listEl.appendChild(li);
            });
        };

        const renderProfile = (user) => {
            if (summary) {
                summary.innerHTML = `
                    <dt class="col-sm-3">Email</dt>
                    <dd class="col-sm-9">${user.email}</dd>
                    <dt class="col-sm-3">Name</dt>
                    <dd class="col-sm-9">${user.name || '-'}</dd>
                    <dt class="col-sm-3">Role</dt>
                    <dd class="col-sm-9">${user.role}</dd>
                `;
            }
            if (meta) {
                meta.textContent = user.updatedAt ? `Updated ${formatDateTime(user.updatedAt)}` : '';
            }
            document.getElementById('profile_name').value = user.name || '';
            document.getElementById('profile_interests').value = (user.interests || []).join(', ');
            document.getElementById('profile_segments').value = (user.segments || []).join(', ');
            document.getElementById('profile_wishlist').value = (user.wishlist || []).join(', ');
            fillList(wishlistList, user.wishlist, 'Wishlist is empty');
            fillList(cachedList, (user.cachedRecommendations || []).map((item) => `${item.productId} · ${item.score}`), 'Recommendation cache is empty');
            fillList(viewList, (user.viewHistory || []).slice(-5).map((item) => `${item.productId} · ${formatDateTime(item.ts || item.timestamp)}`), 'No views');
            fillList(purchaseList, (user.purchaseHistory || []).slice(-5).map((item) => `${item.productId} · ${formatCurrency(item.price)} · ${formatDateTime(item.ts)}`), 'No purchases');
        };

        const fetchProfile = async () => {
            try {
                const resp = await request('/api/users/me', {}, { auth: true });
                const user = resp?.data;
                if (!user) return;
                renderProfile(user);
                form.addEventListener('submit', (event) => {
                    event.preventDefault();
                    handleProfileSubmit();
                });
            } catch (err) {
                setInlineAlert(alert, err.message, 'danger');
            }
        };

        const handleProfileSubmit = async () => {
            const name = document.getElementById('profile_name').value.trim();
            const interests = document.getElementById('profile_interests').value;
            const segments = document.getElementById('profile_segments').value;
            const wishlist = document.getElementById('profile_wishlist').value;
            try {
                const resp = await request('/api/users/me', {
                    method: 'PATCH',
                    body: { name, interests, segments, wishlist },
                }, { auth: true });
                renderProfile(resp.data);
                setInlineAlert(alert, 'Profile updated', 'success');
            } catch (err) {
                setInlineAlert(alert, err.message, 'danger');
            }
        };

        fetchProfile();
    }

    function initAdminPage() {
        if (page !== 'admin') return;
        const rebuildBtn = document.getElementById('rebuildSimsBtn');
        const rebuildStatus = document.getElementById('rebuildStatus');
        const rebuildBadge = document.getElementById('rebuildStatusBadge');
        const rebuildLastRunEl = document.getElementById('rebuildLastRun');
        const form = document.getElementById('adminProductForm');
        const status = document.getElementById('adminProdStatus');
        const loadBtn = document.getElementById('adminLoadProductsBtn');
        const tableBody = document.getElementById('adminProductsBody');
        const countEl = document.getElementById('adminProductCount');
        const loadUsersBtn = document.getElementById('adminLoadUsersBtn');
        const usersBody = document.getElementById('adminUsersBody');
        const userStatus = document.getElementById('adminUserStatus');

        const productState = new Map();
        const rebuildMeta = { lastRun: null, timer: null };

        const normalizeProduct = (product = {}) => ({
            _id: product._id,
            name: product.name || '',
            brand: product.brand || '',
            categoryId: product.categoryId || '',
            categoryName: product.categoryName || product.category || '',
            price: product.price ?? 0,
            rating: typeof product.rating === 'number' ? product.rating : '',
        });

        const createProductInput = (field, value, options = {}) => {
            const input = document.createElement('input');
            input.type = options.type || 'text';
            input.className = 'form-control form-control-sm admin-product-input';
            input.dataset.field = field;
            input.placeholder = options.placeholder || '';
            if (options.step) input.step = options.step;
            if (options.min !== undefined) input.min = options.min;
            if (options.max !== undefined) input.max = options.max;
            input.value = value === undefined || value === null ? '' : String(value);
            return input;
        };

        const setRowStatus = (row, message, tone = 'muted', { lock = false } = {}) => {
            const statusEl = row?.querySelector('[data-role="row-status"]');
            if (!statusEl) return;
            statusEl.textContent = message || '';
            statusEl.className = `small mt-2 text-${tone}`;
            if (lock) {
                statusEl.dataset.lock = '1';
            } else {
                delete statusEl.dataset.lock;
            }
        };

        const unlockRowStatus = (row, delay = 0) => {
            if (!row) return;
            window.setTimeout(() => {
                const statusEl = row.querySelector('[data-role="row-status"]');
                if (!statusEl) return;
                delete statusEl.dataset.lock;
                updateRowDirtyState(row);
            }, delay);
        };

        const getRowValues = (row) => {
            const values = {};
            row.querySelectorAll('.admin-product-input').forEach((input) => {
                values[input.dataset.field] = input.value.trim();
            });
            return values;
        };

        const updateRowDirtyState = (row) => {
            const productId = row?.dataset?.productId;
            if (!productId || !productState.has(productId)) return;
            const original = productState.get(productId);
            const current = getRowValues(row);
            const fields = ['name', 'brand', 'categoryName', 'categoryId', 'price', 'rating'];
            const dirty = fields.some((field) => {
                const origVal = original[field];
                const currVal = current[field];
                const normalize = (val) => {
                    if (val === null || val === undefined) return '';
                    return String(val).trim();
                };
                return normalize(origVal) !== normalize(currVal);
            });
            row.classList.toggle('admin-product-row-dirty', dirty);
            const statusEl = row.querySelector('[data-role="row-status"]');
            if (statusEl && statusEl.dataset.lock !== '1') {
                statusEl.textContent = dirty ? 'Unsaved changes' : '';
                statusEl.className = dirty ? 'small mt-2 text-warning' : 'small mt-2 text-muted';
            }
        };

        const buildProductRow = (product) => {
            const tr = document.createElement('tr');
            tr.dataset.productId = product._id;
            tr.classList.add('admin-product-row');

            const idTd = document.createElement('td');
            const code = document.createElement('code');
            code.textContent = product._id;
            idTd.appendChild(code);

            const nameTd = document.createElement('td');
            const nameInput = createProductInput('name', product.name, { placeholder: 'Name' });
            const brandInput = createProductInput('brand', product.brand, { placeholder: 'Brand' });
            nameTd.appendChild(nameInput);
            nameTd.appendChild(brandInput);

            const categoryTd = document.createElement('td');
            const categoryNameInput = createProductInput('categoryName', product.categoryName, { placeholder: 'Category name' });
            const categoryIdInput = createProductInput('categoryId', product.categoryId, { placeholder: 'Category ID' });
            categoryTd.appendChild(categoryNameInput);
            categoryTd.appendChild(categoryIdInput);

            const pricingTd = document.createElement('td');
            const priceInput = createProductInput('price', product.price, { type: 'number', step: '0.01', min: '0', placeholder: 'Price' });
            const ratingInput = createProductInput('rating', product.rating === '' ? '' : product.rating, { type: 'number', step: '0.1', min: '0', max: '5', placeholder: 'Rating (0-5)' });
            pricingTd.appendChild(priceInput);
            pricingTd.appendChild(ratingInput);

            const actionsTd = document.createElement('td');
            actionsTd.className = 'text-end';
            actionsTd.innerHTML = `
                <div class="btn-group btn-group-sm admin-product-actions">
                    <button class="btn btn-outline-primary" data-action="save-product" data-id="${product._id}">Save</button>
                    <button class="btn btn-outline-secondary" data-action="reset-product" data-id="${product._id}">Reset</button>
                    <button class="btn btn-outline-danger" data-action="delete-product" data-id="${product._id}">Delete</button>
                </div>
                <div class="small mt-2 text-muted" data-role="row-status"></div>
            `;

            tr.appendChild(idTd);
            tr.appendChild(nameTd);
            tr.appendChild(categoryTd);
            tr.appendChild(pricingTd);
            tr.appendChild(actionsTd);

            return tr;
        };

        const syncRowWithProduct = (row, product) => {
            if (!row) return;
            row.querySelectorAll('.admin-product-input').forEach((input) => {
                const field = input.dataset.field;
                const value = product[field];
                input.value = value === undefined || value === null ? '' : String(value);
            });
            updateRowDirtyState(row);
        };

        const resetProductRow = (productId) => {
            if (!tableBody) return;
            const row = tableBody.querySelector(`tr[data-product-id="${productId}"]`);
            if (!row || !productState.has(productId)) return;
            const product = productState.get(productId);
            syncRowWithProduct(row, product);
        };

        const collectProductPayload = (row) => {
            const values = getRowValues(row);
            const payload = {
                name: values.name,
                brand: values.brand,
                categoryName: values.categoryName,
                categoryId: values.categoryId,
            };
            if (!payload.name) throw new Error('Name is required');
            const price = Number(values.price);
            if (Number.isNaN(price)) throw new Error('Enter a valid price');
            payload.price = price;
            if (values.rating !== '') {
                const rating = Number(values.rating);
                if (Number.isNaN(rating)) throw new Error('Enter a valid rating');
                payload.rating = rating;
            }
            return payload;
        };

        const saveProduct = async (productId, row) => {
            if (!row) return;
            try {
                const payload = collectProductPayload(row);
                setRowStatus(row, 'Saving...', 'muted', { lock: true });
                const resp = await request(`/api/products/${productId}`, {
                    method: 'PUT',
                    body: payload,
                }, { auth: true });
                const updated = normalizeProduct(resp?.data || { ...payload, _id: productId });
                productState.set(productId, updated);
                syncRowWithProduct(row, updated);
                setRowStatus(row, 'Product saved', 'success', { lock: true });
                unlockRowStatus(row, 1800);
            } catch (err) {
                setRowStatus(row, err.message, 'danger', { lock: true });
                unlockRowStatus(row, 2500);
            }
        };

        const deleteProduct = async (productId, row) => {
            const confirmDelete = window.confirm('Delete this product?');
            if (!confirmDelete) return;
            if (row) {
                setRowStatus(row, 'Deleting...', 'muted', { lock: true });
            }
            try {
                await request(`/api/products/${productId}`, { method: 'DELETE' }, { auth: true });
                showGlobalMessage('Product deleted', 'success');
                await loadProducts();
            } catch (err) {
                if (row) {
                    setRowStatus(row, err.message, 'danger', { lock: true });
                    unlockRowStatus(row, 3000);
                }
                showGlobalMessage(err.message, 'danger');
            }
        };

        const loadProducts = async () => {
            if (!tableBody) return;
            tableBody.innerHTML = '<tr><td colspan="5" class="text-muted">Loading...</td></tr>';
            try {
                const resp = await request('/api/products');
                const items = resp?.data || [];
                tableBody.innerHTML = '';
                productState.clear();
                if (!items.length) {
                    tableBody.innerHTML = '<tr><td colspan="5" class="text-muted">No products</td></tr>';
                } else {
                    items.slice(0, 50).forEach((item) => {
                        const normalized = normalizeProduct(item);
                        productState.set(normalized._id, normalized);
                        const row = buildProductRow(normalized);
                        tableBody.appendChild(row);
                        updateRowDirtyState(row);
                    });
                }
                if (countEl) countEl.textContent = String(items.length || 0);
            } catch (err) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-danger">${err.message}</td></tr>`;
            }
        };

        const loadUsers = async () => {
            if (!usersBody) return;
            usersBody.innerHTML = '<tr><td colspan="6" class="text-muted">Loading...</td></tr>';
            try {
                const resp = await request('/api/users', {}, { auth: true });
                const items = resp?.data || [];
                usersBody.innerHTML = '';
                if (!items.length) {
                    usersBody.innerHTML = '<tr><td colspan="5" class="text-muted">No users</td></tr>';
                    return;
                }
                items.forEach((user) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><code>${user._id}</code></td>
                        <td>${user.email}</td>
                        <td><input class="form-control form-control-sm admin-user-name" data-user-id="${user._id}" value="${user.name || ''}"></td>
                        <td>
                            <select class="form-select form-select-sm admin-role-select" data-user-id="${user._id}">
                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
                            </select>
                        </td>
                        <td class="text-end">
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" data-action="save-user" data-id="${user._id}">Save</button>
                                <button class="btn btn-outline-danger" data-action="delete-user" data-id="${user._id}">Delete</button>
                            </div>
                        </td>
                    `;
                    usersBody.appendChild(tr);
                });
            } catch (err) {
                usersBody.innerHTML = `<tr><td colspan="6" class="text-danger">${err.message}</td></tr>`;
            }
        };

        const rebuildStateConfig = {
            idle: { text: 'Idle', badge: 'bg-secondary', tone: 'text-muted' },
            running: { text: 'Running', badge: 'bg-info text-dark', tone: 'text-info' },
            success: { text: 'Completed', badge: 'bg-success', tone: 'text-success' },
            error: { text: 'Error', badge: 'bg-danger', tone: 'text-danger' },
        };

        const setRebuildState = (state, message) => {
            const config = rebuildStateConfig[state] || rebuildStateConfig.idle;
            if (rebuildBadge) {
                rebuildBadge.className = `badge ${config.badge}`;
                rebuildBadge.textContent = config.text;
            }
            if (rebuildStatus) {
                rebuildStatus.textContent = message || '';
                rebuildStatus.className = `mt-2 small ${config.tone}`;
            }
        };

        const updateRebuildLastRun = () => {
            if (rebuildLastRunEl) {
                rebuildLastRunEl.textContent = rebuildMeta.lastRun
                    ? formatDateTime(rebuildMeta.lastRun)
                    : 'Never';
            }
        };

        if (rebuildBtn) {
            rebuildBtn.addEventListener('click', async () => {
                toggleButtonLoading(rebuildBtn, true, 'Rebuilding...');
                window.clearTimeout(rebuildMeta.timer);
                setRebuildState('running', 'Rebuild in progress...');
                try {
                    await request('/admin/rebuild-sims', { method: 'POST' }, { auth: true });
                    rebuildMeta.lastRun = new Date();
                    updateRebuildLastRun();
                    setRebuildState('success', 'Similarity matrix refreshed just now');
                    rebuildMeta.timer = window.setTimeout(() => setRebuildState('idle', ''), 4000);
                } catch (err) {
                    setRebuildState('error', err.message);
                } finally {
                    toggleButtonLoading(rebuildBtn, false);
                }
            });
        }
        updateRebuildLastRun();
        setRebuildState('idle', 'Ready to rebuild');

        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const payload = {
                    name: document.getElementById('adminProdName').value.trim(),
                    categoryId: document.getElementById('adminProdCategoryId').value.trim(),
                    categoryName: document.getElementById('adminProdCategoryName').value.trim(),
                    price: Number(document.getElementById('adminProdPrice').value),
                    brand: document.getElementById('adminProdBrand').value.trim(),
                };
                if (!payload.name || Number.isNaN(payload.price)) {
                    if (status) status.textContent = 'Specify the name and price';
                    return;
                }
                if (status) status.textContent = 'Creating...';
                try {
                    await request('/api/products', {
                        method: 'POST',
                        body: payload,
                    }, { auth: true });
                    if (status) status.textContent = 'Created';
                    form.reset();
                    loadProducts();
                } catch (err) {
                    if (status) status.textContent = `Error: ${err.message}`;
                }
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', (event) => {
                event.preventDefault();
                loadProducts();
            });
        }
        if (tableBody) {
            tableBody.addEventListener('click', (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const btn = target.closest('button[data-action]');
                if (!btn) return;
                const productId = btn.getAttribute('data-id');
                if (!productId) return;
                const action = btn.getAttribute('data-action');
                const row = btn.closest('tr[data-product-id]');
                if (action === 'save-product') {
                    saveProduct(productId, row);
                } else if (action === 'reset-product') {
                    resetProductRow(productId);
                } else if (action === 'delete-product') {
                    deleteProduct(productId, row);
                }
            });
            tableBody.addEventListener('input', (event) => {
                const input = event.target;
                if (!(input instanceof HTMLInputElement)) return;
                if (!input.classList.contains('admin-product-input')) return;
                const row = input.closest('tr[data-product-id]');
                if (!row) return;
                updateRowDirtyState(row);
            });
        }

        if (loadUsersBtn) {
            loadUsersBtn.addEventListener('click', (event) => {
                event.preventDefault();
                loadUsers();
            });
        }

        if (usersBody) {
            usersBody.addEventListener('click', async (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const btn = target.closest('button[data-action]');
                if (!btn) return;
                const userId = btn.getAttribute('data-id');
                if (!userId) return;
                const action = btn.getAttribute('data-action');
                if (action === 'save-user') {
                    const select = usersBody.querySelector(`select[data-user-id="${userId}"]`);
                    const role = select?.value;
                    const nameInput = usersBody.querySelector(`input[data-user-id="${userId}"]`);
                    const nameValue = nameInput ? nameInput.value.trim() : undefined;
                    if (!role) return;
                    if (userStatus) userStatus.textContent = 'Saving...';
                    const payload = { role };
                    if (nameValue) payload.name = nameValue;
                    try {
                        await request(`/api/users/${userId}`, {
                            method: 'PATCH',
                            body: payload,
                        }, { auth: true });
                        if (userStatus) userStatus.textContent = 'User updated';
                    } catch (err) {
                        if (userStatus) userStatus.textContent = err.message;
                    }
                } else if (action === 'delete-user') {
                    const confirmDelete = window.confirm('Delete this user?');
                    if (!confirmDelete) return;
                    if (userStatus) userStatus.textContent = 'Deleting...';
                    try {
                        await request(`/api/users/${userId}`, { method: 'DELETE' }, { auth: true });
                        if (userStatus) userStatus.textContent = 'User deleted';
                        loadUsers();
                    } catch (err) {
                        if (userStatus) userStatus.textContent = err.message;
                    }
                }
            });
        }

        loadProducts();
        loadUsers();
    }
})();
