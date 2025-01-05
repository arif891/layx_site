import {PartialRender} from '../../../layx/others/partial_render/partial_render.js';

class DocumentationNavigation {
    constructor() {
        this.docMain = document.querySelector('#main');
        this.docSideProgress = document.querySelector('#side-progress');
        this.docLinks = document.querySelectorAll('#side-nav .doc-link');

        this.headings = [];
        this.observers = {
            heading: null
        };

        this.init();
    }

    init() {
        // Initial setup
        this.bindEvents();
    }

    bindEvents() {
        // Add event listeners
        this.docSideProgress.addEventListener('click', this.handleClick.bind(this));
    }

    // Update title with optional suffix
    updateTitle(title) {
        if (title) {
            document.title = `${title} - LayX`;
        }
    }

    // Smooth scroll to top
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Generate unique ID for headings
    generateId(text, index) {
        return `${text.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '')}-${index}`;
    }

    // Collect and process headings
    collectHeadings() {
        const headingElements = this.docMain.querySelectorAll('h5, h6');
        this.headings = Array.from(headingElements).map((heading, index) => {
            const id = heading.id || this.generateId(heading.textContent, index);

            // Ensure heading has an ID
            if (!heading.id) {
                heading.id = id;
            }

            return {
                id: id,
                text: heading.textContent,
                level: parseInt(heading.tagName[1])
            };
        });
    }

    // Render side navigation
    renderNavigation() {
        if (!this.docSideProgress) return;

        this.docSideProgress.innerHTML = `
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

    // Setup intersection observers for headings
    setupHeadingObservers() {
        // Disconnect existing observer if it exists
        if (this.observers.heading) {
            this.observers.heading.disconnect();
        }

        this.observers.heading = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const id = entry.target.id;
                const link = this.docSideProgress.querySelector(`a[data-heading-id="${id}"]`);

                if (link) {
                    entry.isIntersecting
                        ? link.classList.add('active')
                        : link.classList.remove('active');
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '-20% 0px -65% 0px'
        });

        // Observe each heading
        this.headings.forEach(heading => {
            const element = document.getElementById(heading.id);
            if (element) {
                this.observers.heading.observe(element);
            }
        });
    }

    // Handle click events for side navigation
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

    // Update side progress navigation
    updateSideProgress() {
        this.collectHeadings();
        this.renderNavigation();
        this.setupHeadingObservers();
    }

    // Update active document links
    updateActiveLink(url) {
        this.docLinks.forEach(link => {
            if (link.href === url) {
                link.classList.add('active');
                this.updateTitle(link.text);
                link.setAttribute('aria-current', 'true');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });
    }

    // Cleanup method to remove observers
    cleanup() {
        if (this.observers.heading) {
            this.observers.heading.disconnect();
        }
        this.docSideProgress.removeEventListener('click', this.handleClick);
    }
}

const docMain = document.querySelector('#main');
const docSideNav = document.querySelector('#side-nav');

const components = ['Accordion', 'Alert', 'Carousel', 'Dialog', 'Draggable', 'Form', 'Sheet', 'Tab', 'Window'];

let componentsFile = {style: false};

function addComponentsFile() {
    if (!componentsFile.style) {
        const style = document.createElement('link');
        style.href = '/assets/css/pages/docs_optc.css';
        style.rel = 'stylesheet';
        document.head.appendChild(style);
        componentsFile.style = true;
    }
}

async function initComponents() {
    for (const component of components) {
        const element = docMain.querySelector(component.toLowerCase());
        if (element) {
            const { [component]: ComponentClass } = await import(`../../../layx/components/${component.toLowerCase()}/${component.toLowerCase()}.js`);
            new ComponentClass(); 
        }
    }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    const documentationNav = new DocumentationNavigation();
    const partialRender = new PartialRender('#main', '.doc-link', {
        onNavigationChange: async (url) => {
            documentationNav.updateActiveLink(url);
            documentationNav.updateSideProgress();
            documentationNav.scrollToTop();
            codeInit();

            if (url.includes('/components/')) {
                initComponents();

                if (!componentsFile.style) {
                    addComponentsFile();
                }
            }
        }
    });

    documentationNav.updateActiveLink(window.location.href);
    documentationNav.updateSideProgress();

    if (window.matchMedia('(width < 992px)').matches) {
        (async () => {
            const { Sheet } = await import('../../../layx/components/sheet/sheet.js');
            const sheet = new Sheet('#side-nav');

            docSideNav.querySelectorAll('.doc-link').forEach((link) => {
                link.addEventListener('click', () => {
                    sheet.close(docSideNav);
                });
            });
        })();
    }

    codeInit();
    setTimeout(() => addComponentsFile(), 5000);
});