<?php

function said_convert_allegro_offer_content_to_product_description($offer){
    $content = '';
    $offerProductDescription = $offer['description'] ?: array();
    $offerProductDescriptionSections = $offerProductDescription['sections'] ?: array();
    foreach ($offerProductDescriptionSections as $section) {
        $sectionItems = $section['items'] ?: array();
        foreach ($sectionItems as $sectionItem) {
            $type = $sectionItem['type'];
            if($type === 'TEXT') {
                $content .= $sectionItem['content'];
            } else if($type === 'IMAGE') {
                $content .= "<img src='{$sectionItem['url']}'/>";
            }
        }
    }
    return $content;
}

function allegro_integration_register_settings()
{
    register_setting('said_allegro_options', 'allegro_access_token');
    register_setting('said_allegro_options', 'allegro_refresh_token');
    register_setting('said_allegro_options', 'allegro_access_token_date');
    register_setting('said_allegro_options', 'allegro_auto_update');
    // Tutaj można dodać więcej ustawień
}

add_action('admin_init', 'allegro_integration_register_settings');

function said_store_integration_allegro_settings_page()
{

    wp_enqueue_style('said-store-integration-settings-page-core-style', getsaidStoreIntegrationsUrl('core.css'));
    wp_enqueue_style('said-store-integration-allegro-settings-page-style', getsaidStoreIntegrationsUrl('allegro/settings.css'));
    wp_enqueue_script('said-store-integration-allegro-settings-page-core-script', getsaidStoreIntegrationsUrl('core.js'));
    wp_enqueue_script('said-store-integration-allegro-settings-page-script', getsaidStoreIntegrationsUrl('allegro/settings.js'));
    wp_localize_script('said-store-integration-allegro-settings-page-script', 'said_ajax_object', array('ajax_url' => admin_url('admin-ajax.php')));

    ?>
    <div class="wrap">
        <h2 style="margin-bottom: 16px;">Allegro integration settings</h2>
        <?php
        if (isset($_GET['logout'])) {
            delete_option('allegro_access_token');
            delete_option('allegro_refresh_token');
            delete_option('allegro_access_token_date');
            delete_option('allegro_auto_update');
            header("Location: " . getAllegroRedirectUrl());
            die();
        } else if (isset($_GET['allegro_auto_update'])) {
            $allegro_auto_update = SaidPluginsUtils::boolParse(sanitize_text_field($_GET['allegro_auto_update']));
            update_option('allegro_auto_update', $allegro_auto_update);
            header("Location: " . getAllegroRedirectUrl());
            die();
        } else if (isset($_GET['code'])) {
            $code = sanitize_text_field($_GET['code']);
            $response = allegro_request(getAllegroAccessTokenUrl($code), 'POST', null, getAllegroBase64Authorization());
            if (is_wp_error($response)) {
                SaidPluginsUtils::log("!error: " . json_encode($response));
                return;
            }
            update_option('allegro_access_token', $response["access_token"]);
            update_option('allegro_refresh_token', $response["refresh_token"]);
            update_option('allegro_access_token_date', time() + $response["expires_in"]);
            header("Location: " . getAllegroRedirectUrl());
            die();
        } else if (isset($_GET['delivery-options'])) {
            $delivery_options = sanitize_text_field($_GET['delivery-options']);
            $delivery_options = $delivery_options == "_" ? array() : explode(",", $delivery_options);
            update_option('allegro_shipping_rates', $delivery_options);
            header("Location: " . getAllegroRedirectUrl());
            die();
        } else {
            $access_token = getAllegroAccessToken();
            if (isset($access_token)) {
                SaidPluginsUtils::log("Access token: $access_token");
                $response = allegro_request('https://api.allegro.pl/me', 'GET');
                $company = SaidPluginsUtils::valOrDef($response, 'company', array());
                $companyName = SaidPluginsUtils::valOrDef($company, 'name', '');
                ?>
                <a href="<?php echo esc_url(getAllegroRedirectUrl() . getAllegroLogoutQueryPart()); ?>"
                   class="button button-error">Disconnect allegro account</a>
                <?php
                if (!empty($companyName)) {
                    $allegro_auto_update = SaidPluginsUtils::valOrDef(get_option('allegro_auto_update'), false);
                    if ($allegro_auto_update) {
                        ?>
                        <a href="<?php echo esc_url(getAllegroRedirectUrl() . getAllegroAutoUpdateQueryPart(false)); ?>"
                           class="button button-primary">Disable auto update</a>
                        <?php
                    } else {
                        ?>
                        <a href="<?php echo esc_url(getAllegroRedirectUrl() . getAllegroAutoUpdateQueryPart(true)); ?>"
                           class="button button-primary">Enable auto update</a>
                        <?php
                    }
                }
                ?>
                <h4 style="color: #982d03; max-width: 400px; text-align: justify;">
                    <?php
                    if (empty($companyName)) {
                        ?>
                        <p>Your account is not a company account, Allegro does not allow personal accounts to update
                            offer and
                            product data via external services.</p>
                        <p>You can continue to use the option of importing products from Allegro to the store and
                            updating product
                            data based on changes introduced in Allegro offers.</p>
                        <p>However, if you want the update to work both ways and for changes made to the product in the
                            store to
                            also update the offer data on the Allegro platform, please connect your company account.</p>
                        <?php
                    }
                    ?>
                </h4>
                <?php
            } else {
                ?>
                <a href="<?php echo esc_url(getAllegroAuthUrl()); ?>" class="button button-primary">Connect allegro
                    account</a>
                <?php
            }
        }
        ?>
        <p/>
    </div>

    <?php

    $search = SaidPluginsUtils::valOrDef($_GET, 'search', '');
    $dateFrom = SaidPluginsUtils::valOrDef($_GET, 'date_from', '');
    $dateTo = SaidPluginsUtils::valOrDef($_GET, 'date_to', '');

    ?>

    <div class="said-allegro-integration-container">
        <h2>Allegro integration - Offers management</h2>
        <div class="offers-search-and-filters">
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
        </div>
        <div class="offers-tables">
            <h3 class="section-title">Allegro offers</h3>
            <div class="options-row">
                <button id="select-all-offers">Select / Unselect all</button>
                <button id="select-only-non-imported">Select not imported</button>
                <div class="flex-1"></div>
                <select id="select-offers-action">
                    <option value="">Choose action for selected</option>
                    <option value="clear">Unlink offers from products</option>
                    <option value="import">Import products from offers</option>
                </select>
            </div>
            <div class="offers-table">

                <?php

                $allegroOffers = getAllegroOffers();

                foreach ($allegroOffers as $offer) {
                    if (!empty($search)
                        && strpos(strtolower($offer['name']), strtolower($search)) === false
                        && strpos(strtolower($offer['category']), strtolower($search)) === false
                    ) continue;
                    $offerPublication = $offer['publication'] ?: array();
                    $offerDate = $offerPublication['startedAt'] ?: $offerPublication['startingAt'] ?: '';
                    if (!empty($offerDate) && !empty($dateFrom) && strtotime($offerDate) < strtotime($dateFrom)) continue;
                    if (!empty($offerDate) && !empty($dateTo) && strtotime($offerDate) > strtotime($dateTo)) continue;
                    ?>
                    <div class="offer-container" data-offer-id="<?php echo $offer['id'] ?>">
                        <div>
                            <a class="offer-image-link" href="https://allegro.pl/oferta/<?php echo $offer['id']; ?>">
                                <div class="offer-image">
                                    <img src="<?php echo ($offer['primaryImage'] ?: array())['url'] ?: '' ?>"/>
                                </div>
                            </a>
                        </div>
                        <div class="offer-name-container">
                            <span class="offer-name"><?php echo $offer['name'] ?></span>
                        </div>
                        <div class="form-control input-field said-storage-integration-meterialize said-plugins-store-integrations-store-products">
                            <ul class="chosen-product"></ul>
                            <a class='dropdown-trigger btn' href='#' data-target='store-products-dropdown'>▶</a>
                        </div>
                        <div class="said-input-container">
                            <input type="checkbox" class="offer-checkbox"/>
                        </div>
                    </div>
                    <?php
                }
                ?>
            </div>
        </div>
    </div>
    <?php
}

add_action('wp_ajax_said_plugins_store_integrations_get_store_products', 'said_plugins_store_integrations_get_store_products');
function said_plugins_store_integrations_get_store_products()
{
    $products = said_plugins_store_integrations_getStoreProducts();
    wp_send_json($products);
}

add_action('wp_ajax_said_plugins_store_integrations_add_photo_from_allegro_offer', 'said_plugins_store_integrations_add_photo_from_allegro_offer');
function said_plugins_store_integrations_add_photo_from_allegro_offer()
{
    $product_id = intval(SaidPluginsUtils::valOrDef($_POST, 'product_id', -1));
    $image_url = SaidPluginsUtils::valOrDef($_POST, 'image_url', '');
    $is_main = SaidPluginsUtils::boolParse(SaidPluginsUtils::valOrDef($_POST, 'is_main', false));
    try {
        _said_plugins_store_integrations_add_photo_from_allegro_offer($product_id, $image_url, $is_main);
    } catch (Throwable $e) {
        wp_send_json(array('error' => "$e"));
    }
    wp_send_json(array('success' => true));
}

function _said_plugins_store_integrations_add_photo_from_allegro_offer($product_id, $image_url, $is_main = false){
    $imageId = wp_insert_attachment_from_url($image_url);
    if ($imageId !== false) {
        if($is_main) {
            set_post_thumbnail($product_id, $imageId);
        } else {
            $product_image_gallery = get_post_meta($product_id, '_product_image_gallery', true);
            if (empty($product_image_gallery)) {
                $product_image_gallery = array();
            } else {
                $product_image_gallery = explode(',', $product_image_gallery);
            }
            $product_image_gallery[] = $imageId;
            update_post_meta($product_id, '_product_image_gallery', implode(',', $product_image_gallery));
        }
    }
}

add_action('wp_ajax_said_plugins_store_integrations_save_allegro_offer_settings', 'said_plugins_store_integrations_save_allegro_offer_settings');

function said_plugins_store_integrations_save_allegro_offer_settings(){

    $products = said_plugins_store_integrations_getStoreProducts();
    $product_id = intval(valOrDef($_POST, 'product_id', -2));
    $offer_id = SaidPluginsUtils::valOrDef($_POST, 'offer_id', '');
    if (empty($offer_id)) {
        wp_send_json(array('error' => "Invalid request"));
        return;
    }
    try {
        _said_plugins_store_integrations_save_allegro_offer_settings(
            $products,
            $product_id,
            $offer_id,
            function($response) {
                wp_send_json($response);
            }
        );
    } catch (Throwable $e) {
        wp_send_json(array('error' => "$e"));
    }
}

function _said_plugins_store_integrations_save_allegro_offer_settings($products, $product_id, $offer_id, $_wp_send_json)
{

    $offer = getAllegroOffer($offer_id);
    $offerProducts = [];

    $offerProductSet = $offer['productSet'] ?: array();
    foreach ($offerProductSet as $offerProductSetItem) {
        $offerProduct = $offerProductSetItem['product'];
        if(empty($offerProduct)) continue;
        $offerProductId = $offerProduct['id'];
        if (empty($offerProductId)) continue;
        $offerProductDetails = getAllegroProduct($product_id);
        $offerProducts[] = $offerProductDetails;
    }

    if (empty($offer)) {
        $_wp_send_json(array('success' => false));
        return;
    }

    foreach ($products as $product) {
        if ($product->allegro_offer_id === $offer_id) {
            delete_post_meta($product->id, 'allegro_offer_id');
        }
    }

    if($product_id === -2) {
        $_wp_send_json(array('success' => true));
    } else if ($product_id === -1) {
        $offerTitle = $offer['name'] ?: '';
        $offerContent = said_convert_allegro_offer_content_to_product_description($offer);
        $offerImages = $offer['images'] ?: array();
        $offerSellingMode = $offer['sellingMode'] ?: array();
        $offerPrice = $offerSellingMode['price'] ?: array();
        $offerPriceAmount = $offerPrice['amount'] ?: 0;
        $offerStock = $offer['stock'] ?: array();
        $offerQuantityAvailable = $offerStock['available'] ?: 0;
        $offerCategory = $offer['category'] ?: array();
        $offerCategoryId = $offerCategory['id'] ?: '';

        $categoryId = null;
        $category = allegro_request("https://api.allegro.pl/sale/categories/$offerCategoryId", 'GET');
        if(isset($category)){
            $categoryName = SaidPluginsUtils::valOrDef($category, 'name', '');
            if(!empty($categoryName)){
                $term = term_exists( $categoryName, 'product_cat' );
                if (empty($term)) {
                    $term = wp_insert_term( $categoryName, 'product_cat' );
                }
                $categoryId = $term['term_id'];
            }
        }

        foreach ($offerProducts as $offerProduct) {
            if(empty($offerTitle)){
                $offerTitle = $offerProduct['name'] ?: '';
            }
            if(empty($offerContent)){
                $offerContent .= said_convert_allegro_offer_content_to_product_description($offerProduct);
            }
            if(count($offerImages) === 0){
                $offerImages = $offerProduct['images'] ?: array();
            }
        }

        $post_id = wp_insert_post( array(
            'post_title' => $offerTitle,
            'post_type' => 'product',
            'post_status' => 'publish',
            'post_content' => $offerContent,
        ));
        $product = wc_get_product( $post_id );
        $product->set_regular_price($offerPriceAmount);
        $product->set_stock_status($offerQuantityAvailable > 0 ? 'instock' : 'outofstock');
        $product->set_stock_quantity($offerQuantityAvailable);
        $product->save();
        if(isset($categoryId)){
            wp_set_object_terms($post_id, $categoryId, 'product_cat');
        }
        update_post_meta($post_id, 'allegro_offer_id', "$offer_id");
        update_post_meta($post_id, 'is_product_published_on_allegro', true);
        $_wp_send_json(array(
            'success' => true,
            'productId' => $post_id,
            'productName' => $product->get_name(),
            'offerImages' => $offerImages
        ));
    } else {
        update_post_meta($product_id, 'allegro_offer_id', "$offer_id");
        update_post_meta($product_id, 'is_product_published_on_allegro', true);
        $_wp_send_json(array('success' => true));
    }
}