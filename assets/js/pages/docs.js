class DocumentNavigationManager {
    static ROUTES_CACHE = new Map();
    static PREFETCH_QUEUE = new Set();
    
    constructor({
        sideNavId = 'side-nav',
        mainContentId = 'main',
        sideProgressId = 'side-progress',
        siteName = 'LayX',
        throttleTime = 100,
        observerOptions = {
            link: { rootMargin: '50px', threshold: 0.1 },
            heading: { rootMargin: '-20% 0px -80% 0px' }
        }
    } = {}) {
        // Core properties
        this.elements = this.initializeElements({ sideNavId, mainContentId, sideProgressId });
        this.config = { siteName, throttleTime, observerOptions };
        this.state = {
            isNavigating: false,
            currentPath: window.location.pathname,
            isDocPage: window.location.pathname.includes('/docs/'),
            headings: []
        };

        // Initialize observers and handlers
        this.observers = this.initializeObservers();
        this.eventHandlers = this.initializeEventHandlers();
        
        // Start the system
        this.initialize();
    }

    // Initialize DOM elements with error checking
    initializeElements({ sideNavId, mainContentId, sideProgressId }) {
        const elements = {
            sideNav: document.getElementById(sideNavId),
            main: document.getElementById(mainContentId),
            sideProgress: document.getElementById(sideProgressId)
        };

        // Validate required elements
        if (!elements.main) {
            throw new Error('Main content element is required');
        }

        if (elements.sideNav) {
            elements.navLinks = elements.sideNav.querySelectorAll('a');
        }

        return elements;
    }

    // Handle link intersection for observers
    handleLinkIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const link = entry.target;
                this.queuePrefetch(link.dataset.mainUrl);
                this.observers.link.unobserve(link);
            }
        });
    }

    // Handle heading intersection for observers
    handleHeadingIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                const navLink = this.elements.sideProgress?.querySelector(`[data-heading-id="${id}"]`);

                if (navLink) {
                    this.elements.sideProgress.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                    navLink.classList.add('active');
                }
            }
        });
    }

    // Initialize scroll handling
    handleScroll() {
        const scrollPosition = window.scrollY;
        // Add any specific scroll handling logic here
    }

    // Initialize all observers
    initializeObservers() {
        return {
            link: new IntersectionObserver(
                this.handleLinkIntersection.bind(this),
                this.config.observerOptions.link
            ),
            heading: new IntersectionObserver(
                this.handleHeadingIntersection.bind(this),
                this.config.observerOptions.heading
            )
        };
    }

    // Initialize event handlers with proper binding
    initializeEventHandlers() {
        return {
            popstate: this.handlePopState.bind(this),
            scroll: this.throttle(this.handleScroll.bind(this), this.config.throttleTime),
            click: this.handleClick.bind(this)
        };
    }

    // Handle click events
    handleClick(e) {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const id = e.target.getAttribute('data-heading-id');
            const element = document.getElementById(id);

            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    }

    // Main initialization
    initialize() {
        if (this.state.isDocPage) {
            this.setupNavigationSystem();
            this.saveInitialState();
        }
    }

    // Save initial state
    saveInitialState() {
        if (this.state.isDocPage) {
            const currentLink = this.findLinkByHref(window.location.href);
            const currentState = {
                mainUrl: `${this.getPathFromUrl(window.location.href)}parital/main/${this.getFileNameFromUrl(window.location.href)}`,
                isDocPage: true,
                referrer: document.referrer,
                title: currentLink ? currentLink.textContent : document.title
            };
            history.replaceState(currentState, '', window.location.href);
        }
    }

    // Set up the navigation system
    setupNavigationSystem() {
        this.setupEventListeners();
        this.initializeLinks();
        this.updatePageNavigation();
    }

    // Event listener setup
    setupEventListeners() {
        window.addEventListener('popstate', this.eventHandlers.popstate);
        window.addEventListener('scroll', this.eventHandlers.scroll, { passive: true });
        
        if (this.elements.sideProgress) {
            this.elements.sideProgress.addEventListener('click', this.eventHandlers.click);
        }
    }

    // Initialize navigation links
    initializeLinks() {
        if (!this.elements.navLinks) return;

        this.elements.navLinks.forEach(link => {
            const mainUrl = this.generateMainUrl(link.href);
            link.dataset.mainUrl = mainUrl;
            this.observers.link.observe(link);
            link.addEventListener('click', (e) => this.handleNavigation(e, link));
        });
    }

    // Update page navigation
    updatePageNavigation() {
        this.collectHeadings();
        this.renderNavigation();
        this.setupHeadingObservers();
    }

    // Collect headings from the page
    collectHeadings() {
        if (!this.elements.main) return;

        const headingElements = this.elements.main.querySelectorAll('h5, h6');
        this.state.headings = Array.from(headingElements).map(heading => ({
            id: heading.id || this.generateId(heading.textContent),
            text: heading.textContent,
            level: parseInt(heading.tagName[1])
        }));

        headingElements.forEach((heading, index) => {
            if (!heading.id) {
                heading.id = this.state.headings[index].id;
            }
        });
    }

    // Generate ID for headings
    generateId(text) {
        return text.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');
    }

    // Render navigation
    renderNavigation() {
        if (!this.elements.sideProgress) return;

        this.elements.sideProgress.innerHTML = `
            <h5>On This Page</h5>
            <div class="link-wrapper">
                ${this.state.headings.map(heading => `
                    <a href="#${heading.id}" 
                       class="${heading.level === 6 ? 'subheading' : ''}"
                       data-heading-id="${heading.id}">
                        ${heading.text}
                    </a>
                `).join('')}
            </div>
        `;
    }

    // Setup heading observers
    setupHeadingObservers() {
        this.state.headings.forEach(heading => {
            const element = document.getElementById(heading.id);
            if (element) {
                this.observers.heading.observe(element);
            }
        });
    }

    // Queue prefetch requests
    queuePrefetch(url) {
        if (!DocumentNavigationManager.PREFETCH_QUEUE.has(url)) {
            DocumentNavigationManager.PREFETCH_QUEUE.add(url);
            this.prefetchContent(url);
        }
    }

    // Prefetch content
    async prefetchContent(url) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const content = await response.text();
                DocumentNavigationManager.ROUTES_CACHE.set(url, content);
            }
        } catch (error) {
            console.warn('Prefetch failed:', error);
        } finally {
            DocumentNavigationManager.PREFETCH_QUEUE.delete(url);
        }
    }

    // Handle navigation
    async handleNavigation(e, link) {
        e.preventDefault();
        
        if (this.state.isNavigating) return;
        
        const { href, dataset: { mainUrl } } = link;
        const state = this.createNavigationState(link);
        
        try {
            this.state.isNavigating = true;
            await this.updateContent(mainUrl, href, state);
        } finally {
            this.state.isNavigating = false;
        }
    }

    // Create navigation state
    createNavigationState(link) {
        return {
            mainUrl: link.dataset.mainUrl,
            isDocPage: true,
            referrer: window.location.href,
            title: link.textContent
        };
    }

    // Handle PopState
    handlePopState(e) {
        const state = e.state;
        
        if (!state) {
            this.handleNoStateNavigation();
            return;
        }

        if (state.isDocPage && state.mainUrl) {
            const link = this.findLinkByHref(window.location.href);
            this.updateContent(state.mainUrl, window.location.href, state, false);
        } else if (state.referrer) {
            this.handleReferrerNavigation(state);
        }
    }

    // Handle no state navigation
    handleNoStateNavigation() {
        if (document.referrer) {
            window.location.href = document.referrer;
        }
    }

    // Handle referrer navigation
    handleReferrerNavigation(state) {
        const referrerIsDoc = state.referrer.includes('/docs/');
        if (referrerIsDoc) {
            const referrerLink = this.findLinkByHref(state.referrer);
            if (referrerLink) {
                const referrerMainUrl = referrerLink.dataset.mainUrl;
                this.updateContent(referrerMainUrl, state.referrer, null, false);
                return;
            }
        }
        window.location.href = state.referrer;
    }

    // Update content
    async updateContent(mainUrl, href, state, pushState = true) {
        try {
            const content = await this.fetchContent(mainUrl);
            
            if (content) {
                this.elements.main.innerHTML = content;
                
                if (pushState) {
                    history.pushState(state, '', href);
                }

                this.updateUI(href, state?.title);
                this.reinitializePageFeatures();
            }
        } catch (error) {
            console.error('Content update failed:', error);
            this.handleFallback(href);
        }
    }

    // Update UI elements
    updateUI(href, title) {
        this.updateActiveLink(href);
        this.updatePageNavigation();
        this.updateTitle(title);
        this.scrollToTop();
    }

    // Update active link
    updateActiveLink(href) {
        if (!this.elements.navLinks) return;
        
        this.elements.navLinks.forEach(link => {
            if (link.href === href) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Update title
    updateTitle(title) {
        if (title) {
            document.title = `${title} - ${this.config.siteName}`;
        }
    }

    // Scroll to top
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Fetch content with cache
    async fetchContent(url) {
        if (DocumentNavigationManager.ROUTES_CACHE.has(url)) {
            return DocumentNavigationManager.ROUTES_CACHE.get(url);
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Content fetch failed');
        
        const content = await response.text();
        DocumentNavigationManager.ROUTES_CACHE.set(url, content);
        return content;
    }

    // Handle navigation failure fallback
    async handleFallback(href) {
        try {
            const response = await fetch(href);
            if (response.ok) {
                window.location.href = href;
            }
        } catch (error) {
            console.error('Navigation fallback failed:', error);
        }
    }

    // Reinitialize page features
    reinitializePageFeatures() {
        if (typeof codeInt === 'function') {
            codeInt();
        }
    }

    // Utility Methods
    generateMainUrl(url) {
        const path = this.getPathFromUrl(url);
        const filename = this.getFileNameFromUrl(url);
        return `${path}parital/main/${filename}`;
    }

    getPathFromUrl(url) {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        return path.substring(0, path.lastIndexOf('/')) + '/';
    }

    getFileNameFromUrl(url) {
        return url.substring(url.lastIndexOf('/') + 1);
    }

    findLinkByHref(href) {
        return Array.from(this.elements.navLinks || []).find(link => link.href === href);
    }

    // Throttle utility
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Cleanup
    destroy() {
        // Clean up observers
        Object.values(this.observers).forEach(observer => observer.disconnect());

        // Remove event listeners
        window.removeEventListener('popstate', this.eventHandlers.popstate);
        window.removeEventListener('scroll', this.eventHandlers.scroll);
        
        if (this.elements.sideProgress) {
            this.elements.sideProgress.removeEventListener('click', this.eventHandlers.click);
        }

        // Clear caches
        DocumentNavigationManager.ROUTES_CACHE.clear();
        DocumentNavigationManager.PREFETCH_QUEUE.clear();
    }
}

// Initialize the optimized document navigation system
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.docNav = new DocumentNavigationManager();
    } catch (error) {
        console.error('Failed to initialize DocumentNavigationManager:', error);
    }

    if (typeof codeInt === 'function') {
        codeInt();
    }
});

