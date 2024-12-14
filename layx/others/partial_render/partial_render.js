class PartialRender {
  constructor(selector = '.partial-render', linksSelector = '.partial-link', options = {}) {
    this.partial = document.querySelector(selector);
    this.links = options.linksWrapper
      ? options.linksWrapper.querySelectorAll(linksSelector)
      : document.querySelectorAll(linksSelector);

    this.options = {
      fetch: true,
      preFetch: true,
      handleNavigation: true,
      defaultAction: true,
      contentType: 'html',
      partialPath: 'partial/',
      maxPrefetchLimit: 25,
      maxCacheSize: 50,
      observerOptions: { rootMargin: '50px', threshold: 0.1 },
      throttleTime: 100,
      timeout: 5000,
      onSuccess: null,
      onError: null,
      onErrorRedirect: true,
      onNavigationChange: null,
      beforeRender: null,
      beforeFetch: null,
      debug: false,
      ...options
    };

    this.initialState = {
      content: this.partial?.innerHTML || '',
      url: window.location.href
    };

    this.routesCache = new Map();
    this.prefetchQueue = new Set();

    this.init();
  }

  init() {
    if (!this.initializeElements()) return;
    if (this.options.preFetch) this.setupPrefetching();
    if (this.options.handleNavigation) this.setupNavigation();
  }

  initializeElements() {
    if (!this.partial) {
      console.warn('No partial element found. Ensure the selector matches an existing element.');
      return false;
    }
    if (!this.links.length) {
      console.warn('No links found for partial rendering. Ensure links match the provided selector.');
      return false;
    }
    return true;
  }

  setupPrefetching() {
    const observer = new IntersectionObserver(
      this.throttle(this.prefetchLinks.bind(this), this.options.throttleTime),
      this.options.observerOptions
    );

    Array.from(this.links).slice(0, this.options.maxPrefetchLimit).forEach(link => {
      observer.observe(link);
    });
  }

  throttle(fn, limit) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall < limit) return;
      lastCall = now;
      fn(...args);
    };
  }

  prefetchLinks(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting &&
        !this.prefetchQueue.has(entry.target.href) &&
        this.routesCache.size < this.options.maxCacheSize) {
        const href = this.transformUrl(entry.target.href);

        this.prefetchQueue.add(entry.target.href);
        if (typeof this.options.beforeFetch === 'function') {
          this.options.beforeFetch(href);
        }

        this.fetchContentWithTimeout(href)
          .then(content => {
            this.routesCache.set(entry.target.href, content);
            this.prefetchQueue.delete(entry.target.href);
            this.purgeCache();
          })
          .catch(err => {
            console.error('Prefetch failed:', err);
            this.prefetchQueue.delete(entry.target.href);
          });
      }
    });
  }

  transformUrl(url) {
    try {
      const urlObj = new URL(url);
      urlObj.pathname = urlObj.pathname.replace(/\/([^\/]+)$/, `/${this.options.partialPath}$1`);
      return urlObj.toString();
    } catch (e) {
      console.error('Invalid URL:', url);
      return url;
    }
  }

  fetchContentWithTimeout(url) {
    return Promise.race([
      this.fetchContent(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), this.options.timeout)
      )
    ]);
  }

  setupNavigation() {
    window.history.replaceState({
      url: this.initialState.url,
      content: this.initialState.content
    }, '', this.initialState.url);

    this.links.forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        this.loadPartial(link.href);

        if (this.options.handleNavigation) {
          window.history.pushState({
            url: link.href,
            content: this.partial.innerHTML
          }, '', link.href);
        }

        if (typeof this.options.onNavigationChange === 'function') {
          this.options.onNavigationChange(link.href);
        }
      });
    });

    window.addEventListener('popstate', event => {
      if (event.state) {
        this.partial.innerHTML = event.state.content;
        if (typeof this.options.onNavigationChange === 'function') {
          this.options.onNavigationChange(window.location.href);
        }
      }
    });
  }

  async fetchContent(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    return response.text();
  }

  loadPartial(url) {
    const cachedContent = this.routesCache.get(url);

    if (cachedContent) {
      this.updatePartial(cachedContent, url);
      return;
    }

    this.partial.classList.add('loading');

    const fetchUrl = this.transformUrl(url);
    this.fetchContentWithTimeout(fetchUrl)
      .then(content => {
        this.routesCache.set(url, content);
        this.updatePartial(content, url);
        this.purgeCache();
      })
      .catch(error => {
        this.partial.classList.add('error');
        if (typeof this.options.onError === 'function') {
          this.options.onError(this.partial, error);
        }
        console.error('Failed to load partial:', error);

        if (this.options.onErrorRedirect) {
          window.location.href = url;
        }
      })
      .finally(() => {
        this.partial.classList.remove('loading');
      });
  }

  updatePartial(content, url) {
    if (typeof this.options.beforeRender === 'function') {
      this.options.beforeRender(this.partial, content, this.options.contentType);
    }

    if (this.options.defaultAction) {
      this.partial.innerHTML = content;
    }

    if (typeof this.options.onSuccess === 'function') {
      this.options.onSuccess(this.partial, content);
    }

    if (typeof this.options.onNavigationChange === 'function') {
      this.options.onNavigationChange(url);
    }

    this.focusPartial();
  }

  focusPartial() {
    this.partial.setAttribute('tabindex', '-1');
    this.partial.focus();
    this.partial.removeAttribute('tabindex');
  }

  restoreInitialContent() {
    this.partial.innerHTML = this.initialState.content;
    window.history.replaceState({
      url: this.initialState.url,
      content: this.initialState.content
    }, '', this.initialState.url);
  }

  clearCache() {
    this.routesCache.clear();
    console.info('Cache cleared');
  }

  purgeCache() {
    while (this.routesCache.size > this.options.maxCacheSize) {
      const firstKey = this.routesCache.keys().next().value;
      this.routesCache.delete(firstKey);
    }
  }
}

export { PartialRender };