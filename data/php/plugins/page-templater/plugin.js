document.addEventListener('DOMContentLoaded', function() {

    if(!SaidEngine.WP) {
        SaidEngine.WP = {};
    }

    if(!SaidEngine.WP.PageTemplater) {
        SaidEngine.WP.PageTemplater = {};
    }

    SaidEngine.WP.PageTemplater.initTemplatesLinks = function() {
        const createTemplateLinks =
            document.querySelectorAll('.said-plugins-page-templater-create-template-link');
        createTemplateLinks.forEach(createTemplateLink => {
            SaidEngine.WP.PageTemplater.initTemplateLink(createTemplateLink);
        });
        const translateTemplateLinks =
            document.querySelectorAll('.said-plugins-page-templater-translate-template-link');
        translateTemplateLinks.forEach(translateTemplateLink => {
            SaidEngine.WP.PageTemplater.initTranslateLink(translateTemplateLink);
        });
        const languageInputs = document.querySelectorAll('.said-plugins-page-templater-page-language-selector');
        for (let languageInput of languageInputs) {
            SaidEngine.WP.PageTemplater.initLanguageInput(languageInput);
        }
    }

    SaidEngine.WP.PageTemplater.initLanguageInput = function(languageInput) {
        SaidEngine.initLanguageInput(languageInput, {
            onLanguageSelect: (event) => {
                const language = event.target.value.replace(/^.*\((.*)\)$/, '$1');
                const pageId = event.target.getAttribute('data-said-page-id');
                const ajaxUrl = said_wp_config_object.ajax_url;
                jQuery.post(ajaxUrl, {
                    action: 'said_plugins_page_templater_ajax_update_page_language',
                    page_id: pageId,
                    language: language
                }, function (result) {
                    console.log(result);
                });
            }
        });
    }

    SaidEngine.WP.PageTemplater.showDialog = function(pageId = null, mode = null) {

        const ajaxUrl = said_wp_config_object.ajax_url;
        const selectedLanguage = said_wp_config_object.language;
        const defaultPublishNow = said_wp_config_object.defaultPublishNow;
        const defaultMode = said_wp_config_object.defaultMode;
        const mirrors = said_wp_config_object.mirrors;
        const mirror = said_wp_config_object.mirror;
        const algorithms = said_wp_config_object.algorithms;
        const algorithm = said_wp_config_object.algorithm;

        const barier = document.createElement('div');
        barier.id = 'said-plugins-page-templater-barier';
        document.body.appendChild(barier);

        const dialogContainer = document.createElement('div');
        dialogContainer.id = 'said-plugins-page-templater-dialog-container';
        document.body.appendChild(dialogContainer);

        barier.addEventListener('click', function () {
            barier.remove();
            dialogContainer.remove();
        });

        const dialog = document.createElement('div');
        dialog.id = 'said-plugins-page-templater-dialog';
        dialog.className = 'said-materialize';
        dialogContainer.appendChild(dialog);
        const mirrorSelectContainer = document.createElement('div');
        mirrorSelectContainer.id = 'said-plugins-page-templater-mirror-container';
        mirrorSelectContainer.className = 'input-field';
        dialog.appendChild(mirrorSelectContainer);
        const mirrorSelect = document.createElement('select');
        mirrorSelect.id = 'said-plugins-page-templater-mirror';
        for (let mirrorName in mirrors) {
            const mirrorLabel = mirrors[mirrorName];
            const mirrorOption = document.createElement('option');
            mirrorOption.value = mirrorName;
            mirrorOption.textContent = mirrorLabel;
            mirrorOption.selected = mirrorName === mirror;
            mirrorSelect.appendChild(mirrorOption);
        }
        mirrorSelectContainer.appendChild(mirrorSelect);
        M.FormSelect.init(mirrorSelect);
        if(mode !== 'clear-queue' && mode !== `translate`) {
            const algorithmSelectContainer = document.createElement('div');
            algorithmSelectContainer.id = 'said-plugins-page-templater-algorithm-container';
            algorithmSelectContainer.className = 'input-field';
            dialog.appendChild(algorithmSelectContainer);
            const algorithmSelect = document.createElement('select');
            algorithmSelect.id = 'said-plugins-page-templater-algorithm';
            for (let algorithmName of algorithms) {
                const algorithmOption = document.createElement('option');
                algorithmOption.value = algorithmName;
                algorithmOption.textContent = algorithmName;
                algorithmOption.selected = algorithmName === algorithm;
                algorithmSelect.appendChild(algorithmOption);
            }
            algorithmSelectContainer.appendChild(algorithmSelect);
            M.FormSelect.init(algorithmSelect);
            if(!pageId) {
                const templateSelectContainer = document.createElement('div');
                templateSelectContainer.id = 'said-plugins-page-templater-templates-selector-container';
                templateSelectContainer.className = 'input-field';
                dialog.appendChild(templateSelectContainer);
                const templateSelect = document.createElement('select');
                templateSelect.id = 'said-plugins-page-templater-templates-selector';
                templateSelectContainer.appendChild(templateSelect);
                jQuery.post(ajaxUrl, {
                    action: 'said_plugins_page_templater_ajax_get_templates',
                    mirror: mirror,
                    said_wp_token: localStorage.getItem(SAID_SESSION_TOKEN_LOCAL_STORAGE_KEY),
                    said_wp_csrf: localStorage.getItem(SAID_CSRF_TOKEN_LOCAL_STORAGE_KEY),
                }, function (templates) {
                    console.log(templates);
                    for (let template of templates) {
                        const templateOption = document.createElement('option');
                        templateOption.value = template.id;
                        templateOption.textContent = template.title;
                        templateSelect.appendChild(templateOption);
                    }
                    M.FormSelect.init(templateSelect);
                });
            }
            const cityContainer = document.createElement('div');
            cityContainer.id = 'said-plugins-page-templater-city-container';
            dialog.appendChild(cityContainer);
            const cityName = document.createElement('input');
            cityName.id = 'said-plugins-page-templater-city-name';
            cityName.placeholder = SaidEngine.Translator.get(`said-plugins-page-templater-city-name`, `City name`);
            cityContainer.appendChild(cityName);
            const citiesFromCsvFileInput = document.createElement('input');
            citiesFromCsvFileInput.type = 'file';
            citiesFromCsvFileInput.id = 'said-plugins-page-templater-cities-from-csv-file-input';
            citiesFromCsvFileInput.accept = '.csv';
            citiesFromCsvFileInput.addEventListener('change', async () => {
                const file = citiesFromCsvFileInput.files[0];
                if (!file) return;
                citiesFromCsvFileInput.value = '';
                const reader = new FileReader();
                reader.onload = function (e) {
                    const cities = e.target.result.split('\n');
                    cityName.value = cities.join(', ');
                }
                reader.readAsText(file);
            });
            cityContainer.appendChild(citiesFromCsvFileInput);
            const citiesFromCsvButton = document.createElement('button');
            citiesFromCsvButton.type = 'button';
            citiesFromCsvButton.id = 'said-plugins-page-templater-cities-from-csv-button';
            citiesFromCsvButton.textContent = `📂`;
            citiesFromCsvButton.addEventListener('click', async () => {
                citiesFromCsvFileInput.click();
            });
            cityContainer.appendChild(citiesFromCsvButton);
        }
        if(mode !== 'clear-queue') {
            const languageContainer = document.createElement('div');
            languageContainer.id = 'said-plugins-page-templater-language-container';
            languageContainer.className = 'input-field';
            dialog.appendChild(languageContainer);
            const language = document.createElement('input');
            language.id = 'said-plugins-page-templater-language';
            language.className = 'autocomplete';
            language.value = selectedLanguage;
            languageContainer.appendChild(language);
            SaidEngine.initLanguageInput(language);
        }
        if(mode !== 'clear-queue' && mode !== `translate`) {
            const subModeSelectContainer = document.createElement('div');
            subModeSelectContainer.className = 'input-field';
            dialog.appendChild(subModeSelectContainer);
            const subModeSelect = document.createElement('select');
            subModeSelect.id = 'said-plugins-page-templater-mode';
            subModeSelectContainer.appendChild(subModeSelect);
            SaidEngine.initSubModeSelect(subModeSelect, defaultMode, 'page-templater');

            const publishNowContainer = document.createElement('div');
            publishNowContainer.id = 'said-plugins-page-templater-publish-now-container';
            publishNowContainer.className = 'switch';
            dialog.appendChild(publishNowContainer);
            const publishNowLabel = document.createElement('label');
            publishNowLabel.id = 'said-plugins-page-templater-publish-now-label';
            publishNowContainer.appendChild(publishNowLabel);
            const publishNow = document.createElement('input');
            publishNow.type = 'checkbox';
            publishNow.id = 'said-plugins-page-templater-publish-now';
            publishNow.checked = defaultPublishNow;
            publishNowLabel.appendChild(publishNow);
            const publishNowLever = document.createElement('span');
            publishNowLever.id = 'said-plugins-page-templater-publish-now-lever';
            publishNowLever.className = 'lever';
            publishNowLever.htmlFor = 'said-plugins-page-templater-publish-now';
            publishNowLabel.appendChild(publishNowLever);
            publishNowLabel.appendChild(
                document.createTextNode(SaidEngine.Translator.get(`said-plugins-page-templater-publish-after-generating`, `Publish after generation`))
            );
        }

        const createButton = document.createElement('button');
        createButton.type = 'button';
        createButton.textContent = mode === 'clear-queue'
            ? SaidEngine.Translator.get(`said-plugins-page-templater-clear-queue-button`, `Clear selected queue`)
            : ( mode === 'translate'
                ? SaidEngine.Translator.get(`said-plugins-page-templater-translate-button`, `Translate`)
                : SaidEngine.Translator.get(`said-plugins-page-templater-create-button`, `Create`) );
        createButton.id = 'said-plugins-page-templater-create-button';
        createButton.addEventListener('click', function () {

            if(mode === 'clear-queue') {
                jQuery.post(ajaxUrl, {
                    action: 'said_plugins_page_templater_ajax_clear_queue',
                    mirror: mirror,
                    said_wp_token: localStorage.getItem(SAID_SESSION_TOKEN_LOCAL_STORAGE_KEY),
                    said_wp_csrf: localStorage.getItem(SAID_CSRF_TOKEN_LOCAL_STORAGE_KEY),
                }, function (result) {
                    console.log(result);
                });
                dialogContainer.remove();
                barier.remove();
                return;
            }

            const language = document.querySelector('#said-plugins-page-templater-language');
            const languageValue = language.value.replace(/^.*\((.*)\)$/, '$1');

            let templateId = pageId;
            if(!templateId) {
                const templateSelect = document.querySelector('#said-plugins-page-templater-templates-selector');
                templateId = templateSelect.value;
            }

            if(mode === 'translate') {
                jQuery.post(ajaxUrl, {
                    page_id: templateId,
                    action: 'said_plugins_page_templater_ajax_translate_template',
                    mirror: mirror,
                    language: languageValue,
                    said_wp_token: localStorage.getItem(SAID_SESSION_TOKEN_LOCAL_STORAGE_KEY),
                    said_wp_csrf: localStorage.getItem(SAID_CSRF_TOKEN_LOCAL_STORAGE_KEY),
                }, function (result) {
                    console.log(result);
                });
                dialogContainer.remove();
                barier.remove();
                return;
            }

            const cityName = document.querySelector('#said-plugins-page-templater-city-name');
            const subModeSelect = document.querySelector('#said-plugins-page-templater-mode');
            const publishNow = document.querySelector('#said-plugins-page-templater-publish-now');
            const algorithmSelect = document.querySelector('#said-plugins-page-templater-algorithm');

            const mirrorValue = mirrorSelect.value;
            const cityNameValues = cityName.value.split(',').map(city => city.trim());
            const subModeId = subModeSelect.value;
            const algorithmValue = algorithmSelect.value;
            const publishNowValue = publishNow.checked;

            dialogContainer.remove();

            const generateTextContainer = document.createElement('div');
            generateTextContainer.id = 'said-plugins-page-templater-generate-text-container';
            document.body.appendChild(generateTextContainer);
            const generateText = document.createElement('div');
            generateText.id = 'said-plugins-page-templater-generate-text';
            generateText.textContent = SaidEngine.Translator.get(`said-plugins-page-templater-generating`, `Initializing... please don't close the window`);
            generateTextContainer.appendChild(generateText);
            const generateTextCounter = document.createElement('div');
            generateTextCounter.id = 'said-plugins-page-templater-generate-text-counter';
            generateTextCounter.setAttribute(
                'data-said-plugins-page-templater-generating-counter-pattern',
                SaidEngine.Translator.get(`said-plugins-page-templater-generating-counter`, `Initializing {{n}} from {{max}}`)
            );
            generateTextContainer.appendChild(generateTextCounter);

            const citiesNumber = cityNameValues.length;

            const initializeCity = () => {
                const cityNameValueIndex = citiesNumber - cityNameValues.length;
                const cityNameValue = cityNameValues.shift();
                const pattern =
                    generateTextCounter.getAttribute('data-said-plugins-page-templater-generating-counter-pattern');
                generateTextCounter.textContent =
                    pattern.replace('{{n}}', cityNameValueIndex + 1).replace('{{max}}', citiesNumber);
                jQuery.post(ajaxUrl, {
                    action: 'said_plugins_page_templater_ajax_create_page_from_template',
                    page_id: templateId,
                    queue: mirrorValue,
                    mode: subModeId,
                    algorithm: algorithmValue,
                    city: cityNameValue,
                    language: languageValue,
                    publish_after_generate: publishNowValue,
                    said_wp_token: localStorage.getItem(SAID_SESSION_TOKEN_LOCAL_STORAGE_KEY),
                    said_wp_csrf: localStorage.getItem(SAID_CSRF_TOKEN_LOCAL_STORAGE_KEY),
                }, function (result) {
                    console.log(result);
                });
                if (cityNameValueIndex === citiesNumber - 1) {
                    barier.remove();
                    generateTextContainer.remove();
                } else {
                    setTimeout(initializeCity, 2 * 1000);
                }
            }
            initializeCity();

        });
        dialog.appendChild(createButton);
    }

    SaidEngine.WP.PageTemplater.initTemplateLink = function(template) {

        const pageId = template.getAttribute('data-said-page-id');
        template.onclick = async () => {
            SaidEngine.WP.PageTemplater.showDialog(pageId);
        }

    }

    SaidEngine.WP.PageTemplater.initTranslateLink = function(template) {

        const pageId = template.getAttribute('data-said-page-id');
        template.onclick = async () => {
            SaidEngine.WP.PageTemplater.showDialog(pageId, 'translate');
        }

    }

    SaidEngine.WP.PageTemplater.initTemplatesLinks();

});
