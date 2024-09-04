document.addEventListener('DOMContentLoaded', async () => {

    // some constants
    const config = window.said_plugins_quick_pager_wp_config_object || {};
    const pageUrl = config.pageUrl || `{{page-url}}`;
    const pageInfo = config.pageInfo || {};
    const pageContentMinSize = 256;
    const pageContentMinDelay = 200;
    const pageContentMaxDelay = 800;

    // main html elements
    const pageLoader = document.querySelector(`.said-page-loader`);
    const pageContainer = document.querySelector(`.said-page-container`);
    const slidesElement = document.querySelector(`.said-page-slides`);
    const barierElement = document.querySelector(`.said-page-content-barier`);
    const contentElement = barierElement.querySelector(`.said-page-content`);
    const sectionsContainer = document.querySelector(`.said-page-content-sections-container`);
    const contentImageElement = contentElement.querySelector(`.said-page-content-image`);
    const backButton = contentElement.querySelector(`.said-back-button`);
    const backButtonImageElement = backButton.querySelector(`img`);
    const backButtonTextElement = backButton.querySelector(`div`);

    const draw = async (element, delay = 1, charsAtStep = 2) => {
        const drawNextLetter = (element, text, index = 0) => {
            return new Promise((resolve) => {
                if (index < text.length) {
                    const endIndex = Math.min(index + charsAtStep, text.length);
                    element.textContent += text.substring(index, endIndex);
                    setTimeout(async () => {
                        await drawNextLetter(element, text, index + charsAtStep);
                        resolve();
                    }, delay);
                } else {
                    resolve();
                }
            });
        }
        const drawForAllChildren = async (clone, target) => {
            let childNodes = clone.childNodes;
            for (let i = 0; i < childNodes.length; i++) {
                const childNode = childNodes[i];
                if (childNode.nodeType === Node.TEXT_NODE) {
                    const newTextNode = document.createTextNode(``);
                    target.appendChild(newTextNode);
                    await drawNextLetter(newTextNode, childNode.textContent);
                } else {
                    const childNodeClone = childNode.cloneNode(false);
                    target.appendChild(childNodeClone);
                    await drawForAllChildren(childNode, childNodeClone);
                }
            }
        };
        const clone = element.cloneNode(true);
        element.innerHTML = ``;
        await drawForAllChildren(clone, element);
    }

    const init = () => {

        // show page container
        pageContainer.style.setProperty(`opacity`, `1`, `important`);
        // hide page loader
        pageLoader.style.setProperty(`display`, `none`, `important`);
    
        // add events to all "links" with data-said-page attribute
        const saidSectionElements = document.querySelectorAll('[data-said-page]');
        saidSectionElements.forEach((element) => {
            element.addEventListener('click', () => {
                const page = element.getAttribute('data-said-page');
                window.location.hash = page;
            });
        });
        
        // add event to back button if it's visible
        backButtonImageElement.addEventListener('click', () => {
            if(backButton.style.opacity) {
                window.location.hash = '';
            }
        });
    
        // add event to barier element
        barierElement.addEventListener('click', (event) => {
            if(event.target === barierElement) {
                window.location.hash = '';
            }
        });
    
        // function to recalculate page content
        const recalculatePageContent = () => {
            const hash = window.location.hash;
            // check if hash is not empty
            if (hash && hash.length > 1) {
                // get page name from hash
                const page = hash.substring(1);
                // get section element for page
                const sectionElement = document.querySelector(`.said-page-content-section[data-said-section-name="${page}"]`);
                // check if section element exists
                if (sectionElement) {
                    const sectionElementTitle = sectionElement.getAttribute(`data-said-section-title`) || ``;
                    backButtonTextElement.innerHTML = `<span>${sectionElementTitle}</span>`;
                    const sectionElementImage = sectionElement.getAttribute(`data-said-section-image`) || ``;
                    contentImageElement.style.setProperty(`background-image`, `url(${sectionElementImage})`, `important`);
                    const sectionElementSizesString = sectionElement.getAttribute(`data-said-section-sizes`) || ``;
                    const sectionElementSizes = sectionElementSizesString.split(`,`).map((value) => {
                        const values = value.trim().split(`:`).map((value) => parseInt(value));
                        if(values.find((value) => isNaN(value))) {
                            return null;
                        }
                        return {width: values[0], height: values[1]};
                    }).filter((value) => value !== null);
                    const sectionElementTolarate = parseInt(sectionElement.getAttribute(`data-said-section-tolarate`) || `0`);
                    sectionElement.classList.add(`said-page-content-section-active`);
                    //function for resize content element
                    const resizeContent = (_newContentWidth = null, _newContentHeight = null) => {
                        // enable content element animations
                        contentElement.style.removeProperty(`transition`);
                        // show content element with opacity transition
                        contentElement.style.setProperty(`opacity`, `1`, `important`);
                        // wait after opacity transition end
                        setTimeout(() => {
                            // set new content element width and height if they are not null
                            if(_newContentWidth && _newContentHeight) {
                                const newContentWidth = typeof _newContentWidth === `number` ? `${_newContentWidth}px` : _newContentWidth;
                                const newContentHeight = typeof _newContentHeight === `number` ? `${_newContentHeight}px` : _newContentHeight;
                                contentElement.style.setProperty(`width`, newContentWidth, `important`);
                                contentElement.style.setProperty(`height`, newContentHeight, `important`);
                            // if new content element width and height are null then set width and height to default values
                            } else {
                                contentElement.style.removeProperty(`width`);
                                contentElement.style.removeProperty(`height`);``
                                sectionElement.style.removeProperty(`overflow`);
                            }
                            // wait after width and height transition end
                            setTimeout(() => {
                                // if section element height is bigger than content element height then allow to scroll section element
                                const sectionWidth = sectionElement.clientWidth;
                                backButton.style.setProperty(`max-width`, `${sectionWidth}px`, `important`);
                                const sectionHeight = sectionElement.scrollHeight;
                                const contentHeight = contentElement.clientHeight;
                                if (sectionHeight > contentHeight) {
                                    sectionElement.style.removeProperty(`overflow`);
                                }
                                // if back button element width is bigger than section element width then set margin-top to content image element
                                const backButtonElmentWidth = backButton.clientWidth;
                                if (backButtonElmentWidth > sectionWidth && isMobile) {
                                    const sectionElementComputedStyle = window.getComputedStyle(sectionElement);
                                    const sectionMarginTop = parseInt(sectionElementComputedStyle.marginTop || `0`);
                                    contentImageElement.style.setProperty(`margin-top`, `${sectionMarginTop}px`, `important`);
                                } else {
                                    contentImageElement.style.removeProperty(`margin-top`);
                                }
                                // show back button element with opacity transition
                                backButton.style.setProperty(`opacity`, `1`, `important`);
                                // if back button text width is bigger than back button width then add scrolling animation
                                const backButtonTextElementWidth = backButtonTextElement.clientWidth;
                                const backButtonTextElementSpan = backButtonTextElement.querySelector(`span`);
                                const backButtonTextElementSpanWidth = backButtonTextElementSpan.clientWidth;
                                if (backButtonTextElementSpanWidth > backButtonTextElementWidth) {
                                    backButton.style.setProperty(`gap`, `4px`, `important`);
                                    const backButtonTextElementSpanClone = backButtonTextElementSpan.cloneNode(true);
                                    backButtonTextElement.appendChild(backButtonTextElementSpanClone);
                                    // draw back button text letter by letter and add scrolling animation after it
                                    const animateBackButtonText = () => {
                                        const scrollAnimation = () => {
                                            const backButtonTextElementComputedStyle = window.getComputedStyle(backButtonTextElement);
                                            const backButtonTextElementGap = parseInt(backButtonTextElementComputedStyle.gap || `0`);
                                            const backButtonTextElementScrollLeft = backButtonTextElement.scrollLeft;
                                            const scrollWidth = backButtonTextElement.scrollWidth;
                                            const scrollPathWidth = (scrollWidth - backButtonTextElementGap) / 2;
                                            if (backButtonTextElementScrollLeft < scrollPathWidth + backButtonTextElementGap) {
                                                backButtonTextElement.scrollLeft += 1;
                                            } else {
                                                backButtonTextElement.scrollLeft = 0;
                                            }
                                        };
                                        let scrollInterval = setInterval(scrollAnimation, 30);
                                        backButtonTextElement.addEventListener(`mouseover`, () => {
                                            clearInterval(scrollInterval);
                                        });
                                        backButtonTextElement.addEventListener(`mouseout`, () => {
                                            scrollInterval = setInterval(scrollAnimation, 50);
                                        });
                                    };
                                    if(!backButtonTextElement.hasAttribute(`data-said-drawed`)) {
                                        draw(backButtonTextElement).then(() => {
                                            backButtonTextElement.setAttribute(`data-said-drawed`, `true`);
                                            animateBackButtonText();
                                        });
                                    } else {
                                        animateBackButtonText();
                                    }
                                } else {
                                    backButton.style.removeProperty(`gap`);
                                    backButtonTextElement.innerHTML = `<span>${sectionElementTitle}</span>`;
                                }
                                // justify text in section element
                                SaidEngine.autoJustifyText(sectionElement);
                                // draw section content letter by letter
                                if(!sectionElement.hasAttribute(`data-said-drawed`)) {
                                    draw(sectionElement);
                                    sectionElement.setAttribute(`data-said-drawed`, `true`);
                                }
                                // show section element with opacity transition
                                sectionElement.style.setProperty(`opacity`, `1`, `important`);
                                // show content image element with opacity transition
                                contentImageElement.style.setProperty(`opacity`, `1`, `important`);
                            }, pageContentMaxDelay);
                        }, pageContentMinDelay);
                    
                    };
                    // deny to scroll section element (it's neccessary for correct calculations)
                    sectionElement.style.setProperty(`overflow`, `hidden`, `important`);
                    // disable content element animations
                    contentElement.style.setProperty(`transition`, `none`, `important`);
                    // set new content element width and height to minimum values
                    contentElement.style.setProperty(`width`, `${pageContentMinSize}px`, `important`);
                    contentElement.style.setProperty(`height`, `${pageContentMinSize}px`, `important`);
                    // check if device is mobile
                    const isMobile = window.matchMedia(`(max-width: 767px)`).matches;
                    if (!isMobile) {
                        let founded = false;
                        for (let sectionElementSize of sectionElementSizes) {
                            let width = sectionElementSize.width;
                            let height = sectionElementSize.height;
                            let widthDiffPercent = 100 - width * 100 / window.innerWidth;
                            let heightDiffPercent = 100 - height * 100 / window.innerHeight;
                            if(widthDiffPercent > sectionElementTolarate && heightDiffPercent > sectionElementTolarate) {
                                resizeContent(width, height);
                                founded = true;
                                break;
                            }
                        }
                        if (!founded) {
                            resizeContent();
                        }
                    } else {
                        resizeContent();
                    }
                }
            // clear page content and play minimalize animation
            } else {
                // section displayed at the moment
                const activeSectionElement = document.querySelector(`.said-page-content-section-active`);
                // allow to animate content element
                contentElement.style.removeProperty(`transition`);
                // function to clear section content
                const clearPageContentSection = () => {
                    // hide back button element with opacity transition
                    backButton.style.removeProperty(`opacity`);
                    setTimeout(() => {
                        // set back button text to default value
                        backButtonTextElement.innerHTML = ``;
                        // remove flag from back button text element to allow draw it again
                        backButtonTextElement.removeAttribute(`data-said-drawed`);
                        // clear content image element
                        contentImageElement.style.removeProperty(`background-image`);
                    }, pageContentMinDelay);
                    // function to clear page content
                    const clearPageContent = () => {
                        // hide content element
                        contentElement.style.removeProperty(`opacity`);
                        // remove active class from section element if it is displayed at the moment
                        if (activeSectionElement) {
                            // allow to scroll section element in the future
                            activeSectionElement.style.removeProperty(`overflow`);
                            activeSectionElement.classList.remove(`said-page-content-section-active`);
                        }
                        // wait after opacity transition end and remove width and height properties
                        setTimeout(() => {
                            contentElement.style.removeProperty(`height`);
                            contentElement.style.removeProperty(`width`);
                        }, pageContentMinDelay);
                    };
                    // if content element is displayed at the moment then animate it
                    if(contentElement.style.opacity) {
                        // minimlize content element
                        contentElement.style.setProperty(`width`, `${pageContentMinSize}px`, `important`);
                        contentElement.style.setProperty(`height`, `${pageContentMinSize}px`, `important`);
                        setTimeout(() => {
                            clearPageContent();
                        }, pageContentMaxDelay);
                    } else {
                        clearPageContent();
                    }
                };
                // if section is displayed at the moment then animate it
                if (activeSectionElement) {
                    // hide section element
                    activeSectionElement.style.removeProperty(`opacity`);
                    // remove flag from section element to allow draw it again
                    activeSectionElement.removeAttribute(`data-said-drawed`);
                    // hide content image element
                    contentImageElement.style.removeProperty(`opacity`);
                    setTimeout(() => {
                        clearPageContentSection();
                    }, pageContentMinDelay);
                } else {
                    clearPageContentSection();
                }
            }
        }
    
        window.addEventListener(`hashchange`, () => {
            recalculatePageContent();
        });
        let resizeTimer = null;
        window.addEventListener(`resize`, () => {
            if (resizeTimer){
                clearTimeout(resizeTimer);
                resizeTimer = null;
            }
            resizeTimer = setTimeout(() => {
                recalculatePageContent();
            }, pageContentMaxDelay);
        });
        recalculatePageContent();
    };

    const checkFile = async (file) => {
        const fileExt = file.split(`.`).pop().toLowerCase();
        return pageInfo.allowedExtensions.includes(fileExt);
    }

    const filesToLoad = [];
    const walk = (filesList, dir) => {
        for (const file of filesList) {
            if (typeof file === `string`) {
                if (checkFile(file)) {
                    filesToLoad.push(`${dir}${file}`);
                }
            } else {
                walk(file.files, `${dir}${file.name}/`);
            }
        }
    };
    walk(pageInfo.files, `/`);
    console.log(filesToLoad);

    const loadFile = async (file) => {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open(`GET`, `${pageUrl}${file}`, true);
            xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
                resolve(xhr.responseText);
            }
            };
            xhr.send();
        });
    };

    await Promise.all(filesToLoad.map(loadFile));
    slidesElement.style.setProperty(`animation`, `said-background-slides-animation 30s infinite`, `important`);
    init();

});