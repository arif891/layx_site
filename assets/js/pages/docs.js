const sideNav = document.getElementById('side-nav');
const main = document.getElementById('main');
const sideProgress = document.getElementById('side-progress');

const navLinks = sideNav.querySelectorAll('a');

navLinks.forEach((link) => {
    link.setAttribute('data-main-url', `${getPathFromUrl(link.href)}parital/main/${getFileNameFromUrl(link.href)}`);
    link.setAttribute('data-side-url', `${getPathFromUrl(link.href)}parital/side/${getFileNameFromUrl(link.href)}`);
    handleLink(link);
});

function handleLink(link) {
    const href = link.href;
    const mainUrl = link.dataset.mainUrl;
    const sideUrl = link.dataset.sideUrl;

    link.addEventListener('click', (e) => {
        e.preventDefault();
        handleClick(e, mainUrl, sideUrl, href, link);
    });
}

function handleClick(e, mainUrl, sideUrl, href, link) {
    e.preventDefault();
    fetchContent(mainUrl, sideUrl, href, link, true); // 'true' to indicate manual navigation
}

async function fetchContent(mainUrl, sideUrl, href, link, pushState = false) {
    try {
        const [mainResponse, sideResponse] = await Promise.all([
            fetch(mainUrl),
            fetch(sideUrl)
        ]);

        if (mainResponse.ok && sideResponse.ok) {
            const mainContent = await mainResponse.text();
            const sideContent = await sideResponse.text();

            document.getElementById('main').innerHTML = mainContent;
            document.getElementById('side-progress').innerHTML = sideContent;

            // Update the browser URL if it's a manual navigation
            if (pushState) {
                history.pushState({ mainUrl, sideUrl }, '', href);
            }

            // Update the active link
            updateActiveLink(href);

            codeInt();

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

        } else {
            // If the partial content fetch fails, check if the original link works
            checkOriginalLink(href);
        }

    } catch (error) {
        // On error, check if the original link works
        console.error('Error fetching content:', error);
        checkOriginalLink(href);
    }
}

// Function to check if the original link works, and if so, redirect the user to that URL
async function checkOriginalLink(href) {
    try {
        const response = await fetch(href);

        if (response.ok) {
            // If the original link works, redirect to the original document
            window.location.href = href;
        } else {
            console.error('Original document is also unavailable:', response.status);
        }
    } catch (error) {
        console.error('Error checking original document:', error);
    }
}

// Handle browser back/forward navigation
window.addEventListener('popstate', (e) => {
    e.preventDefault(); // Prevent default behavior

    if (e.state && e.state.mainUrl && e.state.sideUrl) {
        // Fetch the content based on the stored state in the history
        fetchContent(e.state.mainUrl, e.state.sideUrl, document.location.href, null, false);
    } else {
        // If there's no state (e.g., initial page load), load the current URL
        const link = findLinkByHref(document.location.href);
        if (link) {
            handleClick(e, link.dataset.mainUrl, link.dataset.sideUrl, document.location.href, link);
        } else {
            // If no matching link is found, you might want to handle this case (e.g., show a 404 page)
            console.error('No matching link found for:', document.location.href);
        }
    }
});


function updateActiveLink(href) {
    navLinks.forEach((link) => {
        if (link.href === href) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}


function findLinkByHref(href) {
    return Array.from(navLinks).find(link => link.href === href);
}

function getPathFromUrl(url) {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    return path.substring(0, path.lastIndexOf('/')) + '/';
}

function getFileNameFromUrl(url) {
    return url.substring(url.lastIndexOf('/') + 1);
}

function codeInt() {

    const codeElements = main.querySelectorAll('[data-code-lang][copy]');
    codeElements.forEach(element => {
        const button = document.createElement('button');
        button.className = 'copy-btn';
        button.addEventListener('click', () => copyToClipboard(element));

        element.appendChild(button);
    });


    function copyToClipboard(element) {
        const text = element.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const button = element.querySelector('.copy-btn');
            button.classList.add('copied');
            setTimeout(() => {
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
}

codeInt();