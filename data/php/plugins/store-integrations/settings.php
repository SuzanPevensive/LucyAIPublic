<?php

function said_plugins_store_integrations_settings_page()
{

    wp_enqueue_style('said-store-integration-settings-page-core-style', getsaidStoreIntegrationsUrl('core.css'));
    wp_enqueue_style('said-store-integration-settings-page-style', getsaidStoreIntegrationsUrl('settings.css'));
    wp_enqueue_script('said-store-integration-settings-page-core-script', getsaidStoreIntegrationsUrl('core.js'));
    wp_enqueue_script('said-store-integration-settings-page-script', getsaidStoreIntegrationsUrl('settings.js'));
    wp_localize_script('said-store-integration-settings-page-script', 'said_ajax_object', array('ajax_url' => admin_url('admin-ajax.php')));

    $filter = SaidPluginsUtils::valOrDef($_GET, 'filter', 'all');
    $search = SaidPluginsUtils::valOrDef($_GET, 'search', '');
    $dateFrom = SaidPluginsUtils::valOrDef($_GET, 'date_from', '');
    $dateTo = SaidPluginsUtils::valOrDef($_GET, 'date_to', '');
    ?>

    <div class="said-stores-integration-container">
        <h2>Store integration - Offers management</h2>
        <div class="products-search-and-filters">
            <input type="text" value="<?php echo $search; ?>" class="products-search-input" placeholder="Search..."/>
            <div>
                <label>Date from:</label>
                <input type="date" value="<?php echo $dateFrom; ?>" class="products-date-from-input"/>
            </div>
            <div>
                <label>Date to:</label>
                <input type="date" value="<?php echo $dateTo; ?>" class="products-date-to-input"/>
            </div>
            <button class="products-search-button">Search</button>
            <div class="sep"></div>
            <div class="filters">
                <select class="products-filter-select">
                    <option value="all">All</option>
                    <option value="on_allegro">On allegro</option>
                    <option value="on_olx">On olx</option>
                    <option value="on_amazon">On amazon</option>
                </select>
            </div>
        </div>
        <div class="offers-tables">
            <h3 class="section-title">Products from store</h3>
            <div class="offers-table">
                <?php
                $products = said_plugins_store_integrations_getStoreProducts($search, $dateFrom, $dateTo);
                foreach ($products as $product) {
                    $isProductPublishedOnAllegro = said_plugins_store_integrations_isProductPublishedOnAllegro($product->id);
                    $isProductPublishedOnOlx = said_plugins_store_integrations_isProductPublishedOnOlx($product->id);
                    $isProductPublishedOnAmazon = said_plugins_store_integrations_isProductPublishedOnAmazon($product->id);
                    if ($filter === 'on_allegro' && !$isProductPublishedOnAllegro) continue;
                    if ($filter === 'on_olx' && !$isProductPublishedOnOlx) continue;
                    if ($filter === 'on_amazon' && !$isProductPublishedOnAmazon) continue;
                    if (!empty($search) && strpos(strtolower($product->name), strtolower($search)) === false) continue;
                    ?>
                    <div class="product-container" data-product-id="<?php echo $product->id ?>">
                        <div>
                            <a class="product-image-link" href="<?php echo $product->permalink; ?>">
                                <div class="product-image">
                                    <img src="<?php echo $product->image_url ?>"/>
                                </div>
                            </a>
                        </div>
                        <div><span class="product-name"><?php echo $product->name ?></span></div>
                        <div>
                            <button class="icon-button product-settings-button">
                                <span class="dashicons dashicons-edit"></span>
                            </button>
                        </div>
                        <div class="said-input-container">
                            <input type="checkbox" class="product-select-checkbox"/>
                        </div>
                    </div>
                    <?php
                }
                ?>
            </div>
        </div>
    </div>

    <div id="shop-integration-settings-modal" class="integration-settings-modal">

        <div class="modal-loader">
            <div class="lds-ellipsis">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
        </div>

        <div class="modal-body">
            <h1>Shop integration settings</h1>
            <form>
                <div class="scrollable">
                    <div class="section">
                        <h3>Allegro</h3>
                        <div class="form-group form-check">
                            <input type="checkbox" class="form-check-input" id="publish-on-allegro" name="allegro">
                            <label class="form-check-label" for="publish-on-allegro">Publish on Allegro</label>
                        </div>
                        <div class="visible-if-publish-on-allegro-on-true">
                            <div class="important-container">
                                <p class="important">Very important!!</p>
                                <p>
                                    Due to limitations of the Allegro website, please list the product and offer and
                                    then
                                    return to
                                    this page to associate this offer with this product in your store. You can do this
                                    by
                                    selecting
                                    an offer from the list below. You can also import products from the Allegro store on
                                    the
                                    main store
                                    integration screen, which is a much easier way.
                                </p>
                                <p>However, if you decide to create an offer from scratch, click the link below.</p>
                                <p>
                                    <a href="https://allegro.pl/offer/" target="_blank">https://allegro.pl/offer/</a>
                                </p>
                                <p>
                                    Complete only the necessary offer data, the rest of the data will be imported from
                                    the store.
                                    <br/> After this if you don't see the offer in the list below, refresh the page.
                                </p>
                                <p>
                                    If you need more information about your product click this link to open preview:
                                    <br/>
                                    <a class="product-link" href="#" target="_blank"></a>
                                </p>
                                <p class="product-image-info">
                                    If you need to add an image when creating an offer on allegro site, click this link:
                                    <br/>
                                    <a href="#" class="product-image-info-link">Download image</a>
                                </p>
                            </div>
                            <div class="form-group form-select">
                                <h4>Allegro offer</h4>
                                <div class="form-control input-field said-storage-integration-meterialize" id="allegro-offers">
                                    <ul class="chosen-offer"></ul>
                                    <a class='dropdown-trigger btn' href='#' data-target='allegro-offers-dropdown'>Select offer</a>
                                    <ul id="allegro-offers-dropdown" class='dropdown-content'>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sekcja OLX -->
                    <div class="section">
                        <h3>OLX</h3>
                        <div class="form-group form-check">
                            <input type="checkbox" class="form-check-input" id="publish-on-olx" name="olx">
                            <label class="form-check-label" for="publish-on-olx">Publish on OLX</label>
                        </div>
                    </div>

                    <!-- Sekcja Amazon -->
                    <div class="section">
                        <h3>Amazon</h3>
                        <div class="form-group form-check">
                            <input type="checkbox" class="form-check-input" id="publish-on-amazon" name="amazon">
                            <label class="form-check-label" for="publish-on-amazon">Publish on Amazon</label>
                        </div>
                    </div>
                </div>

                <!-- Przyciski -->
                <div class="form-group button-group">
                    <button type="button" name="save-settings" class="button button-primary">Save</button>
                    <button type="button" name="close-settings" class="button button-secondary">Close</button>
                </div>
            </form>
        </div>
    </div>
    <?php
}

function said_plugins_store_integrations_isProductPublishedOnAllegro($post_id){
    $isProductPublishedOnAllegro = get_post_meta($post_id, 'is_product_published_on_allegro', true);
    return SaidPluginsUtils::boolParse($isProductPublishedOnAllegro);
}
function said_plugins_store_integrations_getAllegroOfferId($post_id){
    $allegroOfferId = get_post_meta($post_id, 'allegro_offer_id', true);
    return intval($allegroOfferId);
}
function said_plugins_store_integrations_isProductPublishedOnOlx($post_id){
    $isProductPublishedOnOlx = get_post_meta($post_id, 'is_product_published_on_olx', true);
    return SaidPluginsUtils::boolParse($isProductPublishedOnOlx);
}
function said_plugins_store_integrations_isProductPublishedOnAmazon($post_id){
    $isProductPublishedOnAmazon = get_post_meta($post_id, 'is_product_published_on_amazon', true);
    return SaidPluginsUtils::boolParse($isProductPublishedOnAmazon);
}

add_action('wp_ajax_get_product_settings', 'said_plugins_store_integrations_get_product_settings');
function said_plugins_store_integrations_get_product_settings()
{
    $product_id = SaidPluginsUtils::valOrDef($_POST, 'product_id', null);
    $product = wc_get_product($product_id);
    if (!isset($product)) {
        wp_send_json(array());
        return;
    }
    $isProductPublishedOnAllegro = said_plugins_store_integrations_isProductPublishedOnAllegro($product_id);
    $allegroOfferId = said_plugins_store_integrations_getAllegroOfferId($product_id);
    $isProductPublishedOnOlx = said_plugins_store_integrations_isProductPublishedOnOlx($product_id);
    $isProductPublishedOnAmazon = said_plugins_store_integrations_isProductPublishedOnAmazon($product_id);

    $settings = array(
        'allegro' => array(
            'is_published' => $isProductPublishedOnAllegro,
            'offer_id' => $allegroOfferId,
        ),
        'olx' => array(
            'is_published' => $isProductPublishedOnOlx
        ),
        'amazon' => array(
            'is_published' => $isProductPublishedOnAmazon
        )
    );

    wp_send_json($settings);
}

add_action('wp_ajax_save_product_settings', 'said_plugins_store_integrations_save_product_settings');
function said_plugins_store_integrations_save_product_settings()
{
    $product_id = SaidPluginsUtils::valOrDef($_POST, 'product_id', null);
    if (!isset($product_id)) {
        wp_send_json(array());
        return;
    }
    $settings = SaidPluginsUtils::valOrDef($_POST, 'settings', array());

    $settingsAllegro = SaidPluginsUtils::valOrDef($settings, 'allegro', array());
    $isProductPublishedOnAllegro = SaidPluginsUtils::valOrDef($settingsAllegro, 'is_published', false);
    $allegroOfferId = SaidPluginsUtils::valOrDef($settingsAllegro, 'offer_id', '');
    $settingsOlx = SaidPluginsUtils::valOrDef($settings, 'olx', array());
    $isProductPublishedOnOlx = SaidPluginsUtils::valOrDef($settingsOlx, 'is_published', false);
    $settingsAmazon = SaidPluginsUtils::valOrDef($settings, 'amazon', array());
    $isProductPublishedOnAmazon = SaidPluginsUtils::valOrDef($settingsAmazon, 'is_published', false);

    if ($isProductPublishedOnAllegro && !empty($allegroOfferId)) {
        $product = wc_get_product($product_id);
        update_post_meta($product_id, 'is_product_published_on_allegro', $isProductPublishedOnAllegro);
        update_post_meta($product_id, 'allegro_offer_id', $allegroOfferId);
        update_post_meta($product_id, 'is_product_published_on_olx', $isProductPublishedOnOlx);
        update_post_meta($product_id, 'is_product_published_on_amazon', $isProductPublishedOnAmazon);
        _post_product_to_allegro($product);
    } else {
        delete_product_from_allegro($product_id);
    }

    wp_send_json(array('success' => true));
}

add_action('wp_ajax_get_product_png_image', 'said_plugins_store_integrations_get_product_png_image');
function said_plugins_store_integrations_get_product_png_image()
{
    $product_id = SaidPluginsUtils::valOrDef($_POST, 'product_id', null);
    if (!isset($product_id)) {
        wp_send_json(array());
        return;
    }
    $product = wc_get_product($product_id);
    $attachment_id = $product->get_image_id();
    $image_png_data = getAttachmentPngData($attachment_id);

    wp_send_json($image_png_data);
}

add_action('wp_ajax_get_allegro_offers', 'said_plugins_store_integrations_get_allegro_offers');
function said_plugins_store_integrations_get_allegro_offers()
{
    $allegroOffers = getAllegroOffers();
    wp_send_json($allegroOffers);
}
