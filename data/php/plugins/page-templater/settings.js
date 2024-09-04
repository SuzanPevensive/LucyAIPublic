document.addEventListener('DOMContentLoaded', function () {

    SaidEngine.Translator.addLanguageChangeListener(() => {

        console.log(1);

        const generateButton = document.querySelector(`#said-plugins-page-templater-generate-button`);
        generateButton.addEventListener('click', function (e) {
            SaidEngine.WP.PageTemplater.showDialog();
        });

        const clearQueueButton = document.querySelector(`#said-plugins-page-templater-mirror-queue-clear-button`);
        clearQueueButton.addEventListener('click', function (e) {
            SaidEngine.WP.PageTemplater.showDialog(null, 'clear-queue');
        });

        const removeFailed = async (row) => {
            let dialogContent = `
                <div class="said-plugins-page-templater-remove-failed-dialog-content">${
                    SaidEngine.Translator.get(
                        `said-plugins-page-templater-remove-failed-dialog`,
                        `Are you sure you want to remove all failed generations pages?`
                    )
                }</div>
                <div class="input-field">
                    <label>Delete failed generetions from the dates range</label>
                    <input id="said-plugins-page-templater-remove-failed-dialog-date-from" type="text" class="datepicker">
                    <input id="said-plugins-page-templater-remove-failed-dialog-date-to" type="text" class="datepicker">
                </div>
            `;
            const getDateOnly = (date = new Date()) => {
                return new Date(date.toDateString());
            }
            let dateFrom = getDateOnly();
            let dateTo = getDateOnly();
            SaidEngine.showDialog(``, dialogContent, [
                {
                    text: SaidEngine.Translator.get(`said-plugins-page-templater-remove-failed-dialog-yes`, `Remove`),
                    color: `#77dd77`,
                    textColor: `#000`,
                    action: async () => {
                        try {
                            const formData = new FormData();
                            formData.append('said_wp_token', localStorage.getItem(SAID_SESSION_TOKEN_LOCAL_STORAGE_KEY));
                            formData.append('said_wp_csrf', localStorage.getItem(SAID_CSRF_TOKEN_LOCAL_STORAGE_KEY));
                            formData.append('date_from', dateFrom.getTime());
                            dateTo.setHours(23, 59, 59, 999);
                            formData.append('date_to', dateTo.getTime());
                            const response = await fetch(`/wp-json/said-plugins/page-templater/remove-failed-generations-pages`, {
                                method: 'POST',
                                body: formData,
                            });
                            const responseData = await response.json();
                            console.log(responseData);
                        } catch (error) {
                            console.log(error);
                            return error;
                        }
                    }
                },
                {
                    text: SaidEngine.Translator.get(`said-plugins-page-templater-remove-failed-dialog-no`, `Cancel`),
                    color: `#ff6961`,
                    textColor: `#000`
                }
            ], {
                className: `said-materialize said-plugins-page-templater-remove-failed-dialog`,
                onOpen: () => {
                    const dateFromElement = document.querySelector(`#said-plugins-page-templater-remove-failed-dialog-date-from`);
                    const dateToElement = document.querySelector(`#said-plugins-page-templater-remove-failed-dialog-date-to`);
                    const dateFromInstance = M.Datepicker.init(dateFromElement, {
                        format: 'yyyy-mm-dd',
                        defaultDate: new Date(),
                        setDefaultDate: true,
                        autoClose: true,
                        onSelect: (date) => {
                            dateFrom = getDateOnly(date);
                            if (dateFrom.getTime() > dateTo.getTime()) {
                                dateTo = dateFrom;
                                dateToInstance.setDate(dateTo);
                            }
                        }
                    });
                    const dateToInstance = M.Datepicker.init(dateToElement, {
                        format: 'yyyy-mm-dd',
                        defaultDate: new Date(),
                        setDefaultDate: true,
                        autoClose: true,
                        onSelect: (date) => {
                            dateTo = getDateOnly(date);
                            if (dateTo.getTime() < dateFrom.getTime()) {
                                dateFrom = dateTo;
                                dateFromInstance.setDate(dateFrom);
                            }
                        }
                    });
                }
            });
        }

        const removeFailedButton = document.querySelector(`#said-plugins-page-templater-remove-failed-button`);
        removeFailedButton.addEventListener('click', removeFailed);

        const mirrorSelect = document.querySelector(`[name="said_plugins_page_templater_page_template_mirror"]`);
        M.FormSelect.init(mirrorSelect);

        const languageInput = document.querySelector(`[name="said_plugins_page_templater_default_language"]`);
        SaidEngine.initLanguageInput(languageInput);

        const subModeSelect = document.querySelector(`[name="said_plugins_page_templater_default_sub_mode"]`);
        const defaultSubMode = subModeSelect.getAttribute(`data-selected-sub-mode`);
        SaidEngine.initSubModeSelect(subModeSelect, defaultSubMode, `page-templater`);

        const imagesGroupsContainer = document.querySelector('#said-plugins-page-templater-images-groups-container');
        const imagesGroupsAddButton = document.querySelector('#said-plugins-page-templater-add-group-button');
        const imagesGroupsInput = document.querySelector('[name="said_plugins_page_templater_selected_images_groups"]');
        const imagesGroupsToggleButton = document.querySelector('#said-plugins-page-templater-images-groups-toggle-button');

        const imagesGroups = imagesGroupsInput.value ? JSON.parse(imagesGroupsInput.value) : [];

        imagesGroupsToggleButton.addEventListener('click', function (e) {
            e.preventDefault();
            imagesGroupsContainer.classList.toggle('collapsed');
        });

        const saveImagesGroups = () => {
            imagesGroupsInput.value = JSON.stringify(imagesGroups);
        }

        const addImagesGroup = (group) => {
            const imagesGroup = document.createElement('div');
            imagesGroup.className = 'said-plugins-page-templater-images-group';
            imagesGroupsContainer.prepend(imagesGroup);
            const imagesGroupName = document.createElement('input');
            imagesGroupName.className = 'said-plugins-page-templater-images-group-name';
            imagesGroupName.type = 'text';
            imagesGroupName.placeholder = SaidEngine.Translator.get('said-plugins-page-templater-images-group-name-placeholder', 'Group name');
            imagesGroupName.value = group.name ?? ``;
            imagesGroupName.addEventListener('input', function (e) {
                imagesGroupName.value = imagesGroupName.value.replace(/[^a-zA-Z0-9_]/g, ``);
                group.name = imagesGroupName.value;
                saveImagesGroups();
            });
            imagesGroup.appendChild(imagesGroupName);
            const buttonsGroup = document.createElement('div');
            buttonsGroup.className = 'said-plugins-page-templater-buttons-group';
            imagesGroup.appendChild(buttonsGroup);
            const button = document.createElement('button');
            button.textContent = SaidEngine.Translator.get('said-plugins-page-templater-add-images', 'Add images');
            button.className = 'button said-plugins-page-templater-select-images-button';
            buttonsGroup.appendChild(button);
            const removeGroupButton = document.createElement('button');
            removeGroupButton.textContent = SaidEngine.Translator.get('said-plugins-page-templater-remove-group', 'Remove group');
            removeGroupButton.className = 'button said-plugins-page-templater-remove-group-button';
            buttonsGroup.appendChild(removeGroupButton);
            removeGroupButton.addEventListener('click', function (e) {
                e.preventDefault();
                const groupIndex = imagesGroups.indexOf(group);
                imagesGroups.splice(groupIndex, 1);
                saveImagesGroups();
                imagesGroup.remove();
            });
            const container = document.createElement('div');
            container.className = 'said-plugins-page-templater-selected-images-container';
            imagesGroup.appendChild(container);
            const addImage = (imageData) => {
                const imageContainer = document.createElement('div');
                imageContainer.classList.add('said-selected-image-container');
                const image = document.createElement('img');
                image.src = imageData.url;
                image.classList.add('said-selected-image');
                const removeButton = document.createElement('button');
                removeButton.className = 'button said-remove-selected-image-button';
                removeButton.textContent = 'Remove';
                removeButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    const imageIndex = group.images.indexOf(imageData);
                    group.images.splice(imageIndex, 1);
                    saveImagesGroups();
                    e.target.parentNode.remove();
                });
                imageContainer.appendChild(image);
                imageContainer.appendChild(removeButton);
                container.appendChild(imageContainer);
            }
            group.images.forEach(imageData => addImage(imageData));
            button.addEventListener('click', function (e) {
                e.preventDefault();
                const frame = wp.media({
                    title: 'Select Images',
                    multiple: true
                });
                frame.on('select', function () {
                    const selection = frame.state().get('selection');
                    selection.map(function (attachment) {
                        attachment = attachment.toJSON();
                        const imageData = {id: attachment.id, url: attachment.sizes.thumbnail.url};
                        group.images.push(imageData);
                        addImage(imageData);
                    });
                    saveImagesGroups();
                });

                frame.open();
            });
        }

        imagesGroups.forEach(group => addImagesGroup(group));
        imagesGroupsAddButton.addEventListener('click', function (e) {
            e.preventDefault();
            const group = {id: crypto.randomUUID(), name: '', images: []};
            imagesGroups.push(group);
            saveImagesGroups();
            addImagesGroup(group);
            imagesGroupsContainer.classList.remove('collapsed');
        });

        const faqGroupButton = document.getElementById('said-plugins-page-templater-faq-group-button');
        const faqToggleButton = document.getElementById('said-plugins-page-templater-faq-toggle-button');
        const faqInput = document.getElementById('said-plugins-page-templater-faq-input');
        const faqContainer = document.getElementById('said-plugins-page-templater-faq-container');

        let faqJson = JSON.parse(faqInput.value || '[]');
        if(faqJson && faqJson[0] && typeof faqJson[0].name === 'undefined') {
            faqJson = [{
                name: 'all',
                questions: faqJson
            }]
        }

        faqToggleButton.addEventListener('click', function (e) {
            e.preventDefault();
            faqContainer.classList.toggle('collapsed');
        });

        const saveFaqsGroups = () => {
            faqInput.value = JSON.stringify(faqJson);
        }

        const addNewQuestionGroup = (group = null) => {
            let questionGroup = group;
            if (!questionGroup) {
                questionGroup = {name: '', questions: []};
                faqJson.push(questionGroup);
                saveFaqsGroups();
            }
            const addNewQuestion = (container, _questionSet = null) => {
                let questionSet = _questionSet;
                if (!questionSet) {
                    questionSet = {id: crypto.randomUUID(), question: '', answer: ''};
                    questionGroup.questions.push(questionSet);
                    saveFaqsGroups();
                }
                const questionContainer = document.createElement('div');
                questionContainer.setAttribute('data-question-id', questionSet.id);
                container.prepend(questionContainer);
                const questionsNumber =
                    container.querySelectorAll('.said-plugins-page-templater-faq-question-container').length + 1;
                const answerContainer = document.createElement('div');
                answerContainer.className = 'said-plugins-page-templater-faq-question-container';
                questionContainer.appendChild(answerContainer);
                const numberLabel = document.createElement('div');
                numberLabel.className = 'said-plugins-page-templater-faq-question-number';
                numberLabel.textContent = `${questionsNumber}.`;
                answerContainer.appendChild(numberLabel);
                const question = document.createElement('input');
                question.type = 'text';
                question.className = 'said-plugins-page-templater-faq-question';
                question.placeholder = SaidEngine.Translator.get('said-plugins-page-templater-faq-question-placeholder', 'Question');
                question.value = questionSet.question;
                question.addEventListener('input', function (e) {
                    questionSet.question = question.value;
                    saveFaqsGroups();
                });
                answerContainer.appendChild(question);
                const answer = document.createElement('textarea');
                answer.className = 'said-plugins-page-templater-faq-answer';
                answer.placeholder = SaidEngine.Translator.get('said-plugins-page-templater-faq-answer-placeholder', 'Answer');
                answer.value = questionSet.answer;
                answer.addEventListener('input', function (e) {
                    questionSet.answer = answer.value;
                    saveFaqsGroups();
                });
                questionContainer.appendChild(answer);
                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'button said-plugins-page-templater-faq-remove-button';
                removeButton.textContent = SaidEngine.Translator.get('said-plugins-page-templater-faq-remove-button', 'Remove question');
                removeButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    const questionId = container.getAttribute('data-question-id');
                    const question = questionGroup.questions.find(q => q.id === questionId);
                    const questionIndex = questionGroup.questions.indexOf(question);
                    questionGroup.questions.splice(questionIndex, 1);
                    saveFaqsGroups();
                    questionContainer.remove();
                });
                questionContainer.appendChild(removeButton);
            }
            const questionGroupContainer = document.createElement('div');
            questionGroupContainer.className = 'said-plugins-page-templater-faq-group-container';
            faqContainer.prepend(questionGroupContainer);
            const questionGroupName = document.createElement('input');
            questionGroupName.type = 'text';
            questionGroupName.className = 'said-plugins-page-templater-faq-group-name';
            questionGroupName.placeholder =
                SaidEngine.Translator.get('said-plugins-page-templater-faq-group-name-placeholder', 'Group name');
            questionGroupName.value = questionGroup.name;
            questionGroupName.addEventListener('input', function (e) {
                questionGroup.name = questionGroupName.value;
                saveFaqsGroups();
            });
            questionGroupContainer.appendChild(questionGroupName);
            const questionGroupButtonsContainer = document.createElement('div');
            questionGroupButtonsContainer.className =
                'said-plugins-page-templater-faq-group-buttons-container said-plugins-page-templater-buttons-group';
            questionGroupContainer.appendChild(questionGroupButtonsContainer);
            const questionGroupItemsContainer = document.createElement('div');
            questionGroupItemsContainer.className = 'said-plugins-page-templater-faq-group-items-container';
            const addQuestionButton = document.createElement('button');
            questionGroupContainer.appendChild(questionGroupItemsContainer);
            addQuestionButton.type = 'button';
            addQuestionButton.className = 'button said-plugins-page-templater-faq-add-question-button';
            addQuestionButton.textContent =
                SaidEngine.Translator.get('said-plugins-page-templater-faq-button', 'Add question');
            addQuestionButton.addEventListener('click', function (e) {
                e.preventDefault();
                addNewQuestion(questionGroupItemsContainer);
            });
            questionGroupButtonsContainer.appendChild(addQuestionButton);
            const removeGroupButton = document.createElement('button');
            removeGroupButton.type = 'button';
            removeGroupButton.className = 'button said-plugins-page-templater-faq-remove-group-button';
            removeGroupButton.textContent =
                SaidEngine.Translator.get('said-plugins-page-templater-faq-remove-group-button', 'Remove group');
            removeGroupButton.addEventListener('click', function (e) {
                e.preventDefault();
                const groupIndex = faqJson.indexOf(questionGroup);
                faqJson.splice(groupIndex, 1);
                saveFaqsGroups();
                questionGroupContainer.remove();
            });
            questionGroupButtonsContainer.appendChild(removeGroupButton);
            questionGroup.questions.forEach(questionSet => addNewQuestion(questionGroupItemsContainer, questionSet));
        }

        faqJson.forEach(questionGroup => addNewQuestionGroup(questionGroup));
        faqGroupButton.addEventListener('click', function (e) {
            e.preventDefault();
            addNewQuestionGroup();
            faqContainer.classList.remove('collapsed');
        });

        const htmlFragmentsContainer = document.querySelector('#said-plugins-page-templater-html-fragments-container');
        const htmlFragmentsAddButton = document.querySelector('#said-plugins-page-templater-add-html-fragment-button');
        const htmlFragmentsInput = document.querySelector('[name="said_plugins_page_templater_html_fragments"]');
        const htmlFragmentsToggleButton = document.querySelector('#said-plugins-page-templater-html-fragments-toggle-button');

        const htmlFragments = htmlFragmentsInput.value ? JSON.parse(htmlFragmentsInput.value) : [];

        htmlFragmentsToggleButton.addEventListener('click', function (e) {
            htmlFragmentsContainer.classList.toggle('collapsed');
        });

        const addNewHtmlFragment = (_htmlFragment = null) => {
            let htmlFragment = _htmlFragment;
            if (!htmlFragment) {
                htmlFragment = {id: crypto.randomUUID(), name: '', content: ''};
                htmlFragments.push(htmlFragment);
                htmlFragmentsInput.value = JSON.stringify(htmlFragments);
            }
            const fragmentContainer = document.createElement('div');
            fragmentContainer.className = 'said-plugins-page-templater-html-fragment-container';
            const fragmentName = document.createElement('input');
            fragmentName.type = 'text';
            fragmentName.className = 'said-plugins-page-templater-html-fragment-name';
            fragmentName.placeholder = SaidEngine.Translator.get('said-plugins-page-templater-html-fragment-name-placeholder', 'Fragment name');
            fragmentName.value = htmlFragment.name;
            fragmentName.addEventListener('input', function (e) {
                htmlFragment.name = fragmentName.value;
                htmlFragmentsInput.value = JSON.stringify(htmlFragments);
            });
            const fragmentContent = document.createElement('textarea');
            fragmentContent.className = 'said-plugins-page-templater-html-fragment-content';
            fragmentContent.placeholder = SaidEngine.Translator.get('said-plugins-page-templater-html-fragment-content-placeholder', 'Fragment content');
            fragmentContent.value = htmlFragment.content;
            fragmentContent.addEventListener('input', function (e) {
                htmlFragment.content = fragmentContent.value;
                htmlFragmentsInput.value = JSON.stringify(htmlFragments);
            });
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'button said-plugins-page-templater-html-fragment-remove-button';
            removeButton.textContent = SaidEngine.Translator.get('said-plugins-page-templater-html-fragment-remove-button', 'Remove fragment');
            const container = document.createElement('div');
            fragmentContainer.appendChild(fragmentName);
            container.appendChild(fragmentContainer);
            container.appendChild(fragmentContent);
            removeButton.addEventListener('click', function (e) {
                e.preventDefault();
                const fragment = htmlFragments.find(f => f.id === htmlFragment.id);
                const fragmentIndex = htmlFragments.indexOf(fragment);
                htmlFragments.splice(fragmentIndex, 1);
                htmlFragmentsInput.value = JSON.stringify(htmlFragments);
                container.remove();
            });
            container.appendChild(removeButton);
            htmlFragmentsContainer.prepend(container);
        };

        htmlFragmentsAddButton.addEventListener('click', function (e) {
            e.preventDefault();
            htmlFragmentsContainer.classList.remove('collapsed');
            addNewHtmlFragment();
        });

        htmlFragments.forEach(fragment => addNewHtmlFragment(fragment));

    }, true);

});
