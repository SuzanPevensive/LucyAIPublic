document.addEventListener('DOMContentLoaded', async () => {

    const pageUrl = `{{page-url}}`;

    const hideSaidLoader = () => {
        const saidLilyLoader = document.querySelector('#said|-lily-loader');
        if(saidLilyLoader) {
            saidLilyLoader.style.setProperty('opacity', '0', 'important');
            setTimeout(() => {
                saidLilyLoader.style.setProperty('display', 'none', 'important');
            }, 2500);
        }
    }

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.id === 'said|-lily-loader') {
                        hideSaidLoader();
                    }
                });
            }
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    hideSaidLoader();

});