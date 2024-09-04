document.addEventListener('DOMContentLoaded', () => {

    const pageContainer = document.querySelector('#page-container');
    pageContainer.className += ' pwa-app';

    const saidPluginsFilterForm = document.querySelector('#said-plugins-filter-form');
    const saidPluginsFilterButton = document.querySelector('#said-plugins-filter-button');

    const advancedLink = document.createElement('a');
    advancedLink.id = 'said-plugins-advanced-link';
    advancedLink.href = '#';
    advancedLink.textContent = 'Advanced options';
    advancedLink.addEventListener('click', (e) => {
        e.preventDefault();
        saidPluginsFilterForm.className += ' open';
        advancedLink.style.display = 'none';
        initPriceRange();
    });

    saidPluginsFilterButton.parentNode.prepend(advancedLink);

});

function initPriceRange() {

    const saidPluginsFilterPriceFrom = document.querySelector('#said-plugins-filter-price-from');
    const saidPluginsFilterPriceTo = document.querySelector('#said-plugins-filter-price-to');
    saidPluginsFilterPriceFrom.parentElement.style.display = 'none';
    saidPluginsFilterPriceTo.parentElement.style.display = 'none';

    const rangeContainer = document.createElement('div');
    rangeContainer.className = 'said-price-slider-container';
    saidPluginsFilterPriceFrom.parentNode.parentNode.appendChild(rangeContainer);
    const rangeWrapper = document.createElement('div');
    rangeWrapper.className = 'said-price-slider-wrapper';
    rangeContainer.appendChild(rangeWrapper);
    const rangeTrack = document.createElement('div');
    rangeTrack.className = 'zksaid-container said-price-slider-track';
    rangeWrapper.appendChild(rangeTrack);
    const rangeTooltipMin = document.createElement('div');
    rangeTooltipMin.className = 'zksaid-container said-price-slider-tooltip-min';
    rangeWrapper.appendChild(rangeTooltipMin);
    const rangeTooltipMax = document.createElement('div');
    rangeTooltipMax.className = 'zksaid-container said-price-slider-tooltip-max';
    rangeWrapper.appendChild(rangeTooltipMax);

    const tooltipPostFix = window.saidPwaPriceSliderTooltipPostFix || 'zł';
    const backgroundColor = window.saidPwaPriceSliderBackgroundColor || `#e0d4c8`;
    const rangeMin = window.saidPwaPriceSliderMin || 0;
    const rangeMinValue = window.saidPwaPriceSliderMinValue || rangeMin;
    const rangeMax = window.saidPwaPriceSliderMax || said_pwa_slider_object.max;
    const rangeMaxValue = window.saidPwaPriceSliderMaxValue || rangeMax;
    saidPluginsFilterPriceFrom.min = rangeMin;
    saidPluginsFilterPriceFrom.max = rangeMax;
    saidPluginsFilterPriceFrom.value = rangeMinValue;
    saidPluginsFilterPriceTo.min = rangeMin;
    saidPluginsFilterPriceTo.max = rangeMax;
    saidPluginsFilterPriceTo.value = rangeMaxValue;
    updateValues();


    function setSliderPosition() {
        const minVal = parseInt(saidPluginsFilterPriceFrom.value);
        const maxVal = parseInt(saidPluginsFilterPriceTo.value);

        const percentMin = (minVal / saidPluginsFilterPriceTo.max) * 100;
        const percentMax = (maxVal / saidPluginsFilterPriceTo.max) * 100;

        rangeTooltipMin.style.setProperty(
            'left',
            `calc(${percentMin}% - (${8 - percentMin * 0.15}px))`,
            'important'
        );
        rangeTooltipMax.style.setProperty(
            'left',
            `calc(${percentMax}% + (${8 - percentMax * 0.15}px))`,
            'important'
        );
        rangeTooltipMin.textContent = `${minVal}${tooltipPostFix}`;
        rangeTooltipMax.textContent = `${maxVal}${tooltipPostFix}`;

        const rangeTrackComputedStyle = window.getComputedStyle(rangeTrack);
        const fillColor = rangeTrackComputedStyle.backgroundColor;
        rangeTrack.style.setProperty(
            'background-image',
            `linear-gradient(to right, ${backgroundColor} ${percentMin}%, ${fillColor} ${percentMin}% ${percentMax}%, ${backgroundColor} ${percentMax}%)`,
            'important'
        )
    }

    function updateValues() {
        if (parseInt(saidPluginsFilterPriceFrom.value) > parseInt(saidPluginsFilterPriceTo.value)) {
            [saidPluginsFilterPriceFrom.value, saidPluginsFilterPriceTo.value] = [saidPluginsFilterPriceTo.value, saidPluginsFilterPriceFrom.value];
        }
        setSliderPosition();
    }

    let currentMovingSliderRange = null;
    function onPointerDown(event) {
        const minVal = parseInt(saidPluginsFilterPriceFrom.value);
        const maxVal = parseInt(saidPluginsFilterPriceTo.value);
        const percentMin = (minVal / saidPluginsFilterPriceTo.max) * 100;
        const percentMax = (maxVal / saidPluginsFilterPriceTo.max) * 100;
        const percent =
            event instanceof MouseEvent
                ? event.offsetX / rangeTrack.offsetWidth * 100
                : (event.touches[0].clientX - rangeTrack.getBoundingClientRect().left) / rangeTrack.offsetWidth * 100;
        if (Math.abs(percentMin - percent) < Math.abs(percentMax - percent)) {
            currentMovingSliderRange = saidPluginsFilterPriceFrom;
        } else {
            currentMovingSliderRange = saidPluginsFilterPriceTo;
        }
        onMouseMove(event);
    }
    function onPointerUp() {
        currentMovingSliderRange = null;
    }
    function onMouseMove(event) {
        if (currentMovingSliderRange) {
            event.preventDefault();
            const percent =
                event instanceof MouseEvent
                    ? (event.offsetX / rangeTrack.offsetWidth) * 100
                    : (event.touches[0].clientX - rangeTrack.getBoundingClientRect().left) / rangeTrack.offsetWidth * 100;
            const value = Math.round((percent / 100) * saidPluginsFilterPriceTo.max);
            currentMovingSliderRange.value = value;
            updateValues();
        }
    }

    if (window.matchMedia('(pointer: coarse)').matches && !navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {
        rangeTrack.addEventListener('touchstart', onPointerDown);
        rangeTrack.addEventListener('touchend', onPointerUp);
        rangeTrack.addEventListener('touchmove', onMouseMove, { passive: false, capture : true });
    } else {
        rangeTrack.addEventListener('mousedown', onPointerDown);
        rangeTrack.addEventListener('mouseup', onPointerUp);
        rangeTrack.addEventListener('mousemove', onMouseMove);
    }

    setSliderPosition();
}