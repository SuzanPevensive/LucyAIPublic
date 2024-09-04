document.addEventListener('DOMContentLoaded', function() {

    if(!SaidEngine.WP) {
        SaidEngine.WP = {};
    }

    if(!SaidEngine.WP.PageTemplater) {
        SaidEngine.WP.PageTemplater = {};
    }

    SaidEngine.WP.PageTemplater.initTemplatesLinks = function() {
        const templates =
            document.querySelectorAll('.said-plugins-page-templater-create-template-link');
        templates.forEach(template => {
            SaidEngine.WP.PageTemplater.initTemplateLink(template);
        });
    }

    SaidEngine.WP.PageTemplater.initTemplateLink = function(template) {

        const pageId = template.getAttribute('data-said-page-id');
        const ajaxUrl = said_wp_config_object.ajax_url;
        const selectedLanguage = said_wp_config_object.language;
        const defaultPublishNow = said_wp_config_object.defaultPublishNow;
        const defaultMode = said_wp_config_object.defaultMode;
        template.onclick = async () => {

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

            const cityName = document.createElement('input');
            cityName.id = 'said-plugins-page-templater-city-name';
            cityName.placeholder = SaidEngine.Translator.get(`said-plugins-page-templater-city-name`, `City name`);
            dialog.appendChild(cityName);
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

            const createButton = document.createElement('button');
            createButton.type = 'button';
            createButton.textContent = SaidEngine.Translator.get(`said-plugins-page-templater-generate-button`, `Generate`);
            createButton.id = 'said-plugins-page-templater-create-button';
            createButton.addEventListener('click', function () {

                const cityNameValue = cityName.value;
                const languageValue = language.value.replace(/^.*\((.*)\)$/, '$1');
                const subModePrompt = subModeSelect.getAttribute('data-selected-sub-mode-prompt');
                const publishNowValue = publishNow.checked;

                jQuery.post(ajaxUrl, {
                    action: 'said_plugins_page_templater_ajax_create_page_from_template',
                    page_id: pageId,
                    city: cityNameValue,
                    language: languageValue,
                    sub_mode_prompt: subModePrompt,
                    said_plugins_page_templater_publish_after_generate: publishNowValue,
                    said_wp_token: localStorage.getItem(SAID_SESSION_TOKEN_LOCAL_STORAGE_KEY),
                    said_wp_csrf: localStorage.getItem(SAID_CSRF_TOKEN_LOCAL_STORAGE_KEY),
                }, function (result) {
                    console.log(result);
                    location.reload();
                });

                barier.remove();
                dialogContainer.remove();
            });
            dialog.appendChild(createButton);
        }

    }

    SaidEngine.WP.PageTemplater.initTemplatesLinks();

});
