function codeInit() {
    const codeElements = document.querySelectorAll('[data-code-lang][copy]');
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