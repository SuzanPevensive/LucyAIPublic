jQuery(document).ready(function ($) {

    const searchButton = $('.products-search-button');
    const searchInput = $('.products-search-input');
    const dateFromInput = $('.products-date-from-button');
    const dateToInput = $('.products-date-to-button');

    const selectAllOffers = $('#select-all-offers');
    const selectOnlyNonImported = $('#select-only-non-imported');
    const selectOffersAction = $('#select-offers-action');

    const dropdowns = $('.said-plugins-store-integrations-store-products');

    $('body').append(`<ul id="store-products-dropdown" class='dropdown-content'></ul>`);
    const dropdownContent = $('#store-products-dropdown.dropdown-content');

    $(document).click(function(e) {
        if(
            !e.target.closest('#store-products-dropdown.dropdown-content')
            && !e.target.className.includes('dropdown-trigger')
        ){
            dropdownContent.hide();
        }
    });
    dropdownContent.hide();

    const barrier = $(`<div></div>`);
    barrier.css({
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.92)',
        zIndex: 2000005
    });
    barrier.appendTo('body');
    barrier.hide();
    const messageContainer = $(`<div></div>`);
    messageContainer.css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '20px',
        background: 'white',
        borderRadius: '5px',
        border: '1px solid #000',
        zIndex: 2000006
    });
    messageContainer.appendTo(barrier);

    const showMessage = (title, message) => {
        messageContainer.empty();
        if(title) {
            const titleNode = $(`<p>${title}</p>`);
            titleNode.css({
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '10px'
            });
            titleNode.appendTo(messageContainer);
        }
        const messageNode = $(`<p>${message}</p>`);
        messageNode.appendTo(messageContainer);
        const warningNode = $(`<p>Do not close this page before end of this process.</p>`);
        warningNode.css({
            fontSize: '12px',
            fontStyle: 'italic',
            color: '#982d03'
        });
        warningNode.appendTo(messageContainer);
        barrier.show();
    }

    const hideMessage = () => {
        barrier.hide();
    }

    const addImage = (productId, offerImages, initialLength, callback, message) => {
        if(offerImages.length == 0){
            console.log('All images added');
            hideMessage();
            if(callback) callback();
            return;
        }
        const newInitialLength = initialLength || offerImages.length;
        const image = offerImages.shift();
        const imageIndex = newInitialLength - offerImages.length;
        showMessage(message, `Adding image ${imageIndex} of ${newInitialLength}`);
        $.post(said_ajax_object.ajax_url, {
            action: 'said_plugins_store_integrations_add_photo_from_allegro_offer',
            product_id: productId,
            image_url: image,
            is_main: !initialLength,
        }, function (response) {
            addImage(productId, offerImages, newInitialLength, callback, message);
        });
    }
    const addOption = (productId, productName, imgSrc, productAllegroOfferId) => {
        const option = document.createElement('li');
        option.setAttribute('data-product-id', productId);
        if (productAllegroOfferId) {
            option.setAttribute('allegro-offer-id', productAllegroOfferId);
        }
        const productImage = document.createElement('img');
        productImage.className = 'product-image';
        if(imgSrc) productImage.src = imgSrc;
        else productImage.style.background = 'green';
        option.appendChild(productImage);
        const productNameNodeCol = document.createElement('span');
        productNameNodeCol.className = 'product-name';
        productNameNodeCol.innerText = productName;
        option.appendChild(productNameNodeCol);
        dropdownContent.append(option);
        return option;
    };

    const chooseProduct = (productId, _offerId = null, save = true, callback = null, message = null) => {
        dropdownContent.hide();
        const offerId = _offerId || dropdownContent.attr('data-offer-id');
        const offerContainer = $(`[data-offer-id=${offerId}]`);
        const chosenProduct = offerContainer.find('.chosen-product');
        const option = dropdownContent.find(`[data-product-id=${productId}]`);
        chosenProduct.empty();
        chosenProduct.append(option.clone());
        chosenProduct.attr('data-product-id', productId);
        if(!save) return;
        showMessage(message, 'Saving product settings...');
        console.log('Product settings saving');
        console.log(productId, offerId);
        $.post(said_ajax_object.ajax_url, {
            action: 'said_plugins_store_integrations_save_allegro_offer_settings',
            product_id: productId,
            offer_id: offerId
        }, function (response) {
            if (response.success) {
                console.log('Product settings saved');
                console.log(response);
                if (productId == -1) {
                    const optionNode = addOption(response.productId, response.productName, response.offerImages[0], offerId);
                    const option = $(optionNode);
                    option.click(() => chooseProduct(productId));
                    chosenProduct.empty();
                    chosenProduct.append(option.clone());
                    if(response.offerImages.length > 0) {
                        addImage(response.productId, response.offerImages, null, callback, message);
                    } else {
                        hideMessage();
                        if(callback) callback();
                    }
                }
            } else {
                console.error('Product settings not saved');
                console.log(response);
                hideMessage();
                if(callback) callback();
            }
        });
    }

    selectAllOffers.click(function () {
        const isAnyUnchecked = $('.offer-checkbox:not(:checked)').length > 0;
        $('.offer-checkbox').prop('checked', isAnyUnchecked);
    });

    selectOnlyNonImported.click(function () {
        for (let i = 0; i < dropdowns.length; i++) {
            const dropdown = $(dropdowns[i]);
            const offerContainer
                = dropdown.closest('[data-offer-id]');
            const chosenProduct = offerContainer.find('.chosen-product');
            const offerCheckbox = offerContainer.find('.offer-checkbox');
            const productId = chosenProduct.attr('data-product-id');
            if (productId == -2) {
                offerCheckbox.prop('checked', !offerCheckbox.prop('checked'));
            }
        }
    });

    const importNextOffer = (offersIds, initialLength) => {
        if(offersIds.length == 0) return;
        const newInitialLength = initialLength || offersIds.length;
        const offerId = offersIds.shift();
        const offerIndex = newInitialLength - offersIds.length;
        chooseProduct(-1, offerId, true, () => {
            importNextOffer(offersIds);
        }, 'Importing offer ' + offerIndex + ' of ' + newInitialLength);
    }

    selectOffersAction.change(function () {
        const action = selectOffersAction.val();
        if (action === '') return;
        selectOffersAction.val("");
        const checkedOffers = $('.offer-checkbox:checked');
        const offersIds = [];
        checkedOffers.each(function () {
            const offer = $(this);
            const offerContainer
                = offer.closest('[data-offer-id]');
            const offerId = offerContainer.attr('data-offer-id');
            offersIds.push(offerId);
        });
        importNextOffer(offersIds);
    });

    searchButton.click(function () {
        const searchValue = searchInput.val();
        const dateFromValue = dateFromInput.val();
        const dateToValue = dateToInput.val();
        location.href = said_plugins_stores_integration_getClearedUrl() + '&search=' + searchValue + '&date_from=' + dateFromValue + '&date_to=' + dateToValue;
    });

    $.post(said_ajax_object.ajax_url, {
        action: 'said_plugins_store_integrations_get_store_products'
    }, function (products) {
        dropdownContent.empty();

        addOption(-2, 'Any product');
        addOption(-1, 'Add new product');
        products.forEach((product) => {
            addOption(product.id, product.name, product.image_url, product.allegro_offer_id);
        });

        const options = dropdownContent.children();
        for (let i = 0; i < options.length; i++) {
            const option = $(options[i]);
            const productId = option.attr('data-product-id');
            option.click(() => chooseProduct(productId));
        }
        dropdowns.each(function () {
            const dropdown = $(this);
            const offerContainer =
                dropdown.closest('[data-offer-id]');
            const chosenProduct = offerContainer.find('.chosen-product');
            const offerId = offerContainer.attr('data-offer-id');
            const dropdownContainer = dropdown.closest('.said-plugins-store-integrations-store-products');
            const dropdownTrigger = dropdownContainer.find('.dropdown-trigger');
            dropdownTrigger.click(function (e) {
                dropdownContent.css(`position`, `absolute`);
                dropdownContent.css(`top`, chosenProduct.offset().top + chosenProduct.height());
                dropdownContent.css(`left`, chosenProduct.offset().left);
                dropdownContent.attr('data-offer-id', offerId);
                dropdownContent.show();
                e.preventDefault();
            });
            for (let product of products) {
                if (product.allegro_offer_id == offerId) {
                    chooseProduct(product.id, offerId, false);
                }
            }
            if (chosenProduct.children().length == 0) {
                chooseProduct(-2, offerId, false);
            }
        });
    });

});