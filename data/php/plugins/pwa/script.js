document.addEventListener('DOMContentLoaded', () => {

    const header = document.querySelector('#page-container .zksaid-header');

    function headerAlwaysOnTopObserverEvent(mutationList) {
        mutationList.forEach((mutation) => {
            if (mutation.attributeName === "style") {
                if (header.style.position === "fixed") {
                    header.style.position = "absolute";
                }
            }
        });
    }
    const headerObserver = new MutationObserver(headerAlwaysOnTopObserverEvent);
    headerObserver.observe(header, {
        attributeFilter: ["style"],
    });

});