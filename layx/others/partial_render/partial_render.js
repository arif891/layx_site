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
      beforeRender: null,
      afterRender: null,
      beforeFetch: null,
      ...options
    };

    // Store the initial page state
    this.initialState = {
      content: this.partial.innerHTML,
      url: window.location.href
    };

    this.routesCache = new Map();
    this.prefetchQueue = new Set();
    this.lastClickedLink = null;

    this.init();
  }

  init() {
    this.initializeElements();
    if (this.options.preFetch) {
      this.setupPrefetching();
    }
    if (this.options.handleNavigation) {
      this.setupNavigation();
    }
  }

  initializeElements() {
    if (!this.partial || !this.links.length) {
      console.warn('No .partial-render or .partial-link elements found');
      return false;
    }
    return true;
  }

  setupPrefetching() {
    const observer = new IntersectionObserver(
      this.throttlePrefetch(this.prefetchLinks.bind(this)),
      this.options.observerOptions
    );

    this.links.forEach((link, index) => {
      if (index < this.options.maxPrefetchLimit) {
        observer.observe(link);
      }
    });
  }

  throttlePrefetch(fn) {
    let lastCall = 0;
    return (...args) => {
      const now = new Date().getTime();
      if (now - lastCall < this.options.throttleTime) return;
      lastCall = now;
      return fn(...args);
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
          })
          .catch(err => {
            console.error('Prefetch failed:', err);
            this.prefetchQueue.delete(entry.target.href);
          });
      }
    });
  }

  transformUrl(url) {
    return url.replace(/\/([^\/]+)$/, `/${this.options.partialPath}$1`);
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
    // Store initial state when first loading
    window.history.replaceState({ 
      url: this.initialState.url, 
      content: this.initialState.content 
    }, '', this.initialState.url);

    this.links.forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        this.lastClickedLink = link;
        this.loadPartial(link.href);
        
        // Push new state with current content
        window.history.pushState({ 
          url: link.href, 
          content: this.partial.innerHTML 
        }, '', link.href);
      });
    });

    window.addEventListener('popstate', event => {
      if (event.state) {
        // If navigating back to initial state
        if (event.state.url === this.initialState.url) {
          this.partial.innerHTML = this.initialState.content;
        } else {
          // Otherwise, load the content from the state
          this.loadPartial(event.state.url, false);
        }
      }
    });
  }

  async fetchContent(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    return response.text();
  }

  loadPartial(url, updateHistory = true) {
    const cachedContent = this.routesCache.get(url);

    if (cachedContent) {
      this.updatePartial(cachedContent);
      return;
    }

    const fetchUrl = this.transformUrl(url);
    this.fetchContentWithTimeout(fetchUrl)
      .then(content => {
        this.routesCache.set(url, content);
        this.updatePartial(content);
      })
      .catch(error => {
        console.error('Failed to load partial:', error);
        if (typeof this.options.onError === 'function') {
          this.options.onError(this.partial, error, this.lastClickedLink);
        }
        if (this.options.onErrorRedirect) window.location.href = url;
      });
  }

  updatePartial(content) {
    if (typeof this.options.beforeRender === 'function') {
      this.options.beforeRender(this.partial, content, this.options.contentType, this.lastClickedLink);
    }

    switch (this.options.contentType) {
      case 'html':
        if (this.options.defaultAction) {
          this.partial.innerHTML = content;
        }
        break;
      case 'json':
        const parsedContent = JSON.parse(content);
        break;
      default:
        this.partial.textContent = content;
    }

    if (typeof this.options.onSuccess === 'function') {
      this.options.onSuccess(this.partial, content, this.lastClickedLink);
    }

    if (typeof this.options.afterRender === 'function') {
      this.options.afterRender(this.partial, content, this.lastClickedLink);
    }
  }

  // Optional method to manually restore initial content
  restoreInitialContent() {
    this.partial.innerHTML = this.initialState.content;
    window.history.replaceState({ 
      url: this.initialState.url, 
      content: this.initialState.content 
    }, '', this.initialState.url);
  }
}

export default new PartialRender();
export { PartialRender };