class DocumentNavigation {
    constructor(options = {}) {
        // Default options
        this.options = {
            sideNavId: 'side-nav',
            mainContentId: 'main',
            sideProgressId: 'side-progress',
            ...options
        };

        // DOM elements
        this.sideNav = document.getElementById(this.options.sideNavId);
        this.main = document.getElementById(this.options.mainContentId);
        this.sideProgress = document.getElementById(this.options.sideProgressId);
        this.navLinks = this.sideNav.querySelectorAll('a');

        // Instance properties
        this.headings = [];
        this.linkObserver = null;
        this.headingObserver = null;

        // Initialize
        this.init();
    }

    init() {
        this.setupLinkObserver();
        this.setupNavLinks();
        this.setupPopStateHandler();
        this.updatePageNavigation();
    }

    setupLinkObserver() {
        this.linkObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const link = entry.target;
                    const mainUrl = link.dataset.mainUrl;

                    // Prefetch the content
                    fetch(mainUrl).catch(() => { });

                    // Unobserve the link after prefetching
                    this.linkObserver.unobserve(link);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1
        });
    }

    setupNavLinks() {
        this.navLinks.forEach((link) => {
            link.setAttribute('data-main-url',
                `${this.getPathFromUrl(link.href)}parital/main/${this.getFileNameFromUrl(link.href)}`
            );
            this.handleLink(link);
            this.linkObserver.observe(link);
        });
    }

    handleLink(link) {
        const href = link.href;
        const mainUrl = link.dataset.mainUrl;

        link.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleClick(e, mainUrl, href, link);
        });
    }

    handleClick(e, mainUrl, href, link) {
        e.preventDefault();
        this.fetchContent(mainUrl, href, link, true);
    }

    async fetchContent(mainUrl, href, link, pushState = false) {
        try {
            const mainResponse = await fetch(mainUrl);

            if (mainResponse.ok) {
                const mainContent = await mainResponse.text();
                this.main.innerHTML = mainContent;

                if (pushState) {
                    history.pushState({ mainUrl }, '', href);
                }

                this.updateActiveLink(href);
                this.updatePageNavigation();

                if (typeof codeInt === 'function') {
                    codeInt();
                }

                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });

            } else {
                this.checkOriginalLink(href);
            }

        } catch (error) {
            console.error('Error fetching content:', error);
            this.checkOriginalLink(href);
        }
    }

    async checkOriginalLink(href) {
        try {
            const response = await fetch(href);
            if (response.ok) {
                window.location.href = href;
            } else {
                console.error('Original document is also unavailable:', response.status);
            }
        } catch (error) {
            console.error('Error checking original document:', error);
        }
    }

    setupPopStateHandler() {
        window.addEventListener('popstate', (e) => {
            e.preventDefault();

            if (e.state && e.state.mainUrl) {
                this.fetchContent(e.state.mainUrl, document.location.href, null, false);
            } else {
                const link = this.findLinkByHref(document.location.href);
                if (link) {
                    this.handleClick(e, link.dataset.mainUrl, document.location.href, link);
                } else {
                    console.error('No matching link found for:', document.location.href);
                }
            }
        });
    }

    updateActiveLink(href) {
        this.navLinks.forEach((link) => {
            if (link.href === href) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    findLinkByHref(href) {
        return Array.from(this.navLinks).find(link => link.href === href);
    }

    getPathFromUrl(url) {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        return path.substring(0, path.lastIndexOf('/')) + '/';
    }

    getFileNameFromUrl(url) {
        return url.substring(url.lastIndexOf('/') + 1);
    }

    // Page Navigation Methods
    updatePageNavigation() {
        if (this.headingObserver) {
            this.headingObserver.disconnect();
        }
        this.collectHeadings();
        this.renderNavigation();
        this.setupHeadingObserver();
        this.addScrollListeners();
    }

    collectHeadings() {
        if (!this.main) return;

        const headingElements = this.main.querySelectorAll('h5, h6');
        this.headings = Array.from(headingElements).map(heading => ({
            id: heading.id || this.generateId(heading.textContent),
            text: heading.textContent,
            level: parseInt(heading.tagName[1])
        }));

        headingElements.forEach((heading, index) => {
            if (!heading.id) {
                heading.id = this.headings[index].id;
            }
        });
    }

    generateId(text) {
        return text.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');
    }

    renderNavigation() {
        if (!this.sideProgress) return;

        this.sideProgress.innerHTML = `
            <h5>On This Page</h5>
            <div class="link-wrapper">
                ${this.headings.map(heading => `
                    <a href="#${heading.id}" 
                       class="${heading.level === 6 ? 'subheading' : ''}"
                       data-heading-id="${heading.id}">
                        ${heading.text}
                    </a>
                `).join('')}
            </div>
        `;
    }

    setupHeadingObserver() {
        this.headingObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const id = entry.target.id;
                    const navLink = this.sideProgress.querySelector(`[data-heading-id="${id}"]`);

                    if (entry.isIntersecting) {
                        this.sideProgress.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                        navLink?.classList.add('active');
                    }
                });
            },
            {
                rootMargin: '-20% 0px -80% 0px'
            }
        );

        this.headings.forEach(heading => {
            const element = document.getElementById(heading.id);
            if (element) {
                this.headingObserver.observe(element);
            }
        });
    }

    addScrollListeners() {
        this.sideProgress.addEventListener('click', (e) => {
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
        });
    }

    destroy() {
        // Clean up observers
        if (this.linkObserver) {
            this.linkObserver.disconnect();
        }
        if (this.headingObserver) {
            this.headingObserver.disconnect();
        }

        // Remove event listeners
        window.removeEventListener('popstate', this.setupPopStateHandler);
    }
}

// Initialize the navigation
const docNav = new DocumentNavigation();
