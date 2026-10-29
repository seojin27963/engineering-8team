/* Replace SimulationAdapter with HttpAdapter when the server is available.
   The UI only depends on getStatus(), rent(), and returnUmbrella(). */
(() => {
  'use strict';
  const STORAGE_KEY = 'engineering-8team:umbrella:v1';
  const TOTAL = 12;
  class SimulationAdapter {
    read() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { total: TOTAL, available: TOTAL, rental: null };
      const state = JSON.parse(raw);
      if (state.total !== TOTAL || !Number.isInteger(state.available) ||
          ![TOTAL, TOTAL - 1].includes(state.available) ||
          (state.rental !== null && (!state.rental || typeof state.rental.id !== 'string' || !Number.isFinite(Date.parse(state.rental.rentedAt)))) ||
          state.available !== TOTAL - (state.rental ? 1 : 0)) {
        throw new Error('저장된 대여 정보가 올바르지 않습니다. 브라우저의 사이트 데이터를 확인해주세요.');
      }
      return state;
    }
    async getStatus() { return this.read(); }
    async rent() {
      const state = this.read();
      if (state.rental) throw new Error('이미 대여 중인 우산이 있습니다.');
      if (state.available < 1) throw new Error('현재 대여 가능한 우산이 없습니다.');
      state.available -= 1;
      state.rental = { id: crypto.randomUUID(), rentedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return state;
    }
    async returnUmbrella() {
      const state = this.read();
      if (!state.rental) throw new Error('반납할 우산이 없습니다.');
      state.available += 1;
      state.rental = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return state;
    }
  }
  class HttpAdapter {
    constructor(baseUrl = '/api') { this.baseUrl = baseUrl; }
    async request(path, method = 'GET') {
      const response = await fetch(`${this.baseUrl}${path}`, { method, credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return response.json();
    }
    getStatus() { return this.request('/status'); }
    rent() { return this.request('/rentals', 'POST'); }
    returnUmbrella() { return this.request('/rentals/current/return', 'POST'); }
  }
  const api = new SimulationAdapter();
  const $ = id => document.getElementById(id);
  let currentState = null;
  let busy = false;
  function render(state) {
    currentState = state;
    $('available').textContent = state.available;
    $('total').textContent = state.total;
    $('meter-fill').style.width = `${state.available / state.total * 100}%`;
    $('inventory-note').textContent = state.available > 0 ? '여유롭게 이용할 수 있어요' : '모든 우산이 대여 중이에요';
    $('status-badge').textContent = state.rental ? '대여 중' : '대여 가능';
    $('status-badge').classList.toggle('active', Boolean(state.rental));
    $('status-icon').textContent = state.rental ? '☂' : '↗';
    $('status-title').textContent = state.rental ? '우산과 함께하는 중이에요' : '아직 대여한 우산이 없어요';
    $('status-description').textContent = state.rental
      ? `${new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(state.rental.rentedAt))} 대여 · 사용 후 반납해주세요.`
      : '비가 오면, 우산 한 자루를 빌려보세요.';
    updateButtons();
  }
  function updateButtons() {
    $('rent').disabled = busy || !currentState || Boolean(currentState.rental) || currentState.available === 0;
    $('return').disabled = busy || !currentState || !currentState.rental;
  }
  function notice(message, error = false) {
    $('notice').textContent = message;
    $('notice').classList.toggle('error', error);
  }
  async function act(action) {
    if (busy) return;
    busy = true;
    updateButtons();
    try {
      // Web Locks serializes writes from multiple tabs where supported.
      const operation = () => action === 'rent' ? api.rent() : api.returnUmbrella();
      const state = navigator.locks ? await navigator.locks.request(STORAGE_KEY, operation) : await operation();
      render(state);
      notice(action === 'rent' ? '대여가 완료됐어요. 우산과 함께 안전하게 이동하세요!' : '반납이 완료됐어요. 다음 사람을 위한 배려, 감사합니다.');
    } catch (error) {
      notice(error instanceof SyntaxError ? '저장된 대여 정보를 읽을 수 없습니다. 사이트 데이터를 확인해주세요.' : error.message, true);
    } finally { busy = false; updateButtons(); }
  }
  async function refresh() {
    try { render(await api.getStatus()); notice('시뮬레이션 준비 완료 · 대여와 반납을 직접 체험해보세요.'); }
    catch (error) { currentState = null; updateButtons(); notice(`대여 정보를 불러오지 못했습니다. ${error.message}`, true); }
  }
  $('rent').addEventListener('click', () => act('rent'));
  $('return').addEventListener('click', () => act('return'));
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) refresh(); });
  refresh();
})();
