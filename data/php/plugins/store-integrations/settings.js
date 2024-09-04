jQuery(document).ready(function ($) {

    const productSettingsButtons = $('.product-settings-button');

    const shopIntegrationSettingsModal = $('#shop-integration-settings-modal');
    const shopIntegrationSettingsModalBody = shopIntegrationSettingsModal.find('.modal-body');
    const shopIntegrationSettingsModalLoader = shopIntegrationSettingsModal.find('.modal-loader');
    const shopIntegrationIsProductPublishedOnAllegroCheckbox = shopIntegrationSettingsModal.find('input[name="allegro"]');
    const shopIntegrationAllegroOfferDropdown = shopIntegrationSettingsModal.find('#allegro-offers');
    const shopIntegrationAllegroOfferDropdownMenu = shopIntegrationAllegroOfferDropdown.find('.dropdown-content');
    const shopIntegrationAllegroOfferDropdownMenuButton = shopIntegrationAllegroOfferDropdown.find('.dropdown-trigger');
    const shopIntegrationAllegroOfferDropdownChosenOffer = shopIntegrationAllegroOfferDropdown.find('.chosen-offer');
    const shopIntegrationIsProductPublishedOnOlxCheckbox = shopIntegrationSettingsModal.find('input[name="olx"]');
    const shopIntegrationIsProductPublishedOnAmazonCheckbox = shopIntegrationSettingsModal.find('input[name="amazon"]');
    const shopIntegrationVisibleIfPublishOnAllegroOnTrue = shopIntegrationSettingsModal.find('.visible-if-publish-on-allegro-on-true');
    const shopIntegrationSaveSettingsButton = shopIntegrationSettingsModal.find('button[name="save-settings"]');
    const shopIntegrationCloseSettingsButton = shopIntegrationSettingsModal.find('button[name="close-settings"]');

    const searchButton = $('.products-search-button');
    const searchInput = $('.products-search-input');
    const dateFromInput = $('.products-date-from-button');
    const dateToInput = $('.products-date-to-button');
    const filterSelect = $('.products-filter-select');

    shopIntegrationAllegroOfferDropdownMenuButton.click(function () {
        const allegroOfferDropdownMenuNode = shopIntegrationAllegroOfferDropdownMenu[0];
        allegroOfferDropdownMenuNode.instance.open();
    });

    searchButton.click(function () {
        const searchValue = searchInput.val();
        const dateFromValue = dateFromInput.val();
        const dateToValue = dateToInput.val();
        location.href = said_plugins_stores_integration_getClearedUrl() + '&search=' + searchValue + '&date_from=' + dateFromValue + '&date_to=' + dateToValue;
    });

    filterSelect.change(function () {
        const filterValue = filterSelect.val();
        location.href = said_plugins_stores_integration_getClearedUrl() + '&filter=' + filterValue;
    });

    shopIntegrationCloseSettingsButton.click(function () {
        shopIntegrationSettingsModal.hide();
        shopIntegrationSettingsModalBody.hide();
    });

    shopIntegrationSaveSettingsButton.click(function () {
        shopIntegrationSettingsModalLoader.show();
        shopIntegrationSettingsModalBody.hide();
        const productId = shopIntegrationSettingsModal.attr('data-product-id');
        const allegroOfferId = shopIntegrationAllegroOfferDropdown.attr('data-offer-id');
        const settings = {
            allegro: {
                is_published: shopIntegrationIsProductPublishedOnAllegroCheckbox.is(':checked'),
                offer_id: allegroOfferId
            },
            olx: {
                is_published: shopIntegrationIsProductPublishedOnOlxCheckbox.is(':checked')
            },
            amazon: {
                is_published: shopIntegrationIsProductPublishedOnAmazonCheckbox.is(':checked')
            }
        };
        // Wyślij żądanie Ajax do zapisania ustawień
        $.post(said_ajax_object.ajax_url, {
            action: 'save_product_settings',
            product_id: productId,
            settings: settings
        }, function (response) {
            shopIntegrationSettingsModal.hide();
        });
    });

    function isProductPublishedOnAllegro() {
        if (shopIntegrationIsProductPublishedOnAllegroCheckbox.is(':checked')) {
            shopIntegrationVisibleIfPublishOnAllegroOnTrue.show();
        } else {
            shopIntegrationVisibleIfPublishOnAllegroOnTrue.hide();
        }
    }

    shopIntegrationIsProductPublishedOnAllegroCheckbox.change(isProductPublishedOnAllegro);

    productSettingsButtons.click(function () {
        const productContainer = $(this).closest('.product-container');
        const productImageNode = productContainer.find('.product-image img:not(.woocommerce-placeholder)');
        const productLinkNode = productContainer.find('.product-image-link');
        const productId = productContainer.attr('data-product-id');
        const productImageUrl = productImageNode.attr('src');
        const productLinkUrl = productLinkNode.attr('href');
        shopIntegrationSettingsModalBody.hide();
        shopIntegrationSettingsModalLoader.show();
        shopIntegrationSettingsModal.css('display', 'flex');
        shopIntegrationSettingsModal.attr('data-product-id', productId);
        $.post(said_ajax_object.ajax_url, {
            action: 'get_product_settings',
            product_id: productId
        }, function (productSettings) {
            const productAllegroOfferId = productSettings.allegro.offer_id;
            $.post(said_ajax_object.ajax_url, {
                action: 'get_allegro_offers'
            }, function (offers) {
                shopIntegrationAllegroOfferDropdownMenu.empty();
                for (let i = 0; i < offers.length; i++) {
                    const offer = offers[i];
                    const option = document.createElement('li');
                    option.setAttribute('data-offer-id', offer.id);
                    const offerImage = document.createElement('img');
                    offerImage.className = 'offer-image';
                    offerImage.src = offer.primaryImage.url;
                    option.appendChild(offerImage);
                    const offerName = document.createElement('span');
                    offerName.className = 'offer-name';
                    offerName.innerText = offer.name;
                    option.appendChild(offerName);
                    shopIntegrationAllegroOfferDropdownMenu.append(option);
                }
                const allegroOfferDropdownMenuNode = shopIntegrationAllegroOfferDropdownMenu[0];
                if (allegroOfferDropdownMenuNode.instance) allegroOfferDropdownMenuNode.instance.destroy();
                const instances = M.Dropdown.init(shopIntegrationAllegroOfferDropdownMenuButton);
                allegroOfferDropdownMenuNode.instance = instances[0];

                shopIntegrationAllegroOfferDropdownChosenOffer.empty();
                const options = shopIntegrationAllegroOfferDropdownMenu.children();
                for (let i = 0; i < options.length; i++) {
                    const option = $(options[i]);
                    const offerId = option.attr('data-offer-id');

                    function chooseOffer() {
                        shopIntegrationAllegroOfferDropdown.attr('data-offer-id', offerId);
                        shopIntegrationAllegroOfferDropdownChosenOffer.empty();
                        shopIntegrationAllegroOfferDropdownChosenOffer.append(option.clone());
                    }

                    if (productAllegroOfferId) {
                        if (productAllegroOfferId == offerId) {
                            chooseOffer();
                        }
                    } else if (i == 0) {
                        chooseOffer();
                    }
                    option.click(chooseOffer);
                }

                shopIntegrationSettingsModalBody.show();
                shopIntegrationSettingsModalLoader.hide();
                if (productSettings.allegro.is_published) {
                    shopIntegrationIsProductPublishedOnAllegroCheckbox.attr('checked', 'checked');
                } else {
                    shopIntegrationIsProductPublishedOnAllegroCheckbox.removeAttr('checked');
                }
                isProductPublishedOnAllegro();

                if (productSettings.olx.is_published) {
                    shopIntegrationIsProductPublishedOnOlxCheckbox.attr('checked', 'checked');
                } else {
                    shopIntegrationIsProductPublishedOnOlxCheckbox.removeAttr('checked');
                }

                if (productSettings.amazon.is_published) {
                    shopIntegrationIsProductPublishedOnAmazonCheckbox.attr('checked', 'checked');
                } else {
                    shopIntegrationIsProductPublishedOnAmazonCheckbox.removeAttr('checked');
                }

                const productLink = shopIntegrationSettingsModal.find('.product-link');
                productLink.attr('href', productLinkUrl);
                productLink.text(productLinkUrl);

                const mainImageInfo = shopIntegrationSettingsModal.find('.product-image-info');
                if (productImageUrl) {
                    const mainImageInfoLink = mainImageInfo.find('.product-image-info-link');
                    mainImageInfoLink[0].onclick = function () {
                        $.post(said_ajax_object.ajax_url, {
                            action: 'get_product_png_image',
                            product_id: productId
                        }, function (response) {
                            const imageUrl = response.url;
                            if (imageUrl) {
                                fetch(imageUrl)
                                    .then(response => response.blob())
                                    .then(blob => {
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = response.name;
                                        a.style.display = 'none !important';
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        a.remove();
                                    })
                                    .catch(error => console.error('Błąd pobierania obrazka:', error));
                            }
                        });
                    }
                    mainImageInfo.show();
                } else {
                    mainImageInfo.hide();
                }
            }, 'json');
        }, 'json');
    });
});