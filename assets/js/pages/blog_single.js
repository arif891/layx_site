class BlogSingle {
    constructor() {
        this.main = document.querySelector('#main');
        this.side = document.querySelector('#side');

        this.headings = [];

        this.init();
    }

    init() {
        // Initiate the blog single page
        this.initBlogSingle();
    }


    initBlogSingle() {
        // Collect and process headings
        this.collectHeadings();

        // Render side navigation
        this.renderNavigation();

        // Add event listeners
        this.bindEvents
    }

    // Generate unique ID for headings
    generateId(text, index) {
        return `${text.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '')}-${index}`;
    }

    bindEvents() {
        // Add event listeners
        this.side.addEventListener('click', this.handleClick.bind(this));
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

    // Render side navigation
    renderNavigation() {
        if (!this.side) return;

        this.side.innerHTML = `
            <h5>On This Page</h5>
            <div class="link__wrapper">
                ${this.headings.map(heading => `
                    <a href="#${heading.id}" 
                       class="link ${heading.level === 6 ? 'subheading' : ''}"
                       data-heading-id="${heading.id}">
                        ${heading.text}
                    </a>
                `).join('')}
            </div>
        `;
    }

    // Collect and process headings
    collectHeadings() {
        const headingElements = this.main.querySelectorAll('h5, h6');
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
}

new BlogSingle();