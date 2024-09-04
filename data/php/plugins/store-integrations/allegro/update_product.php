<?php

//add_action('save_post', 'post_product_to_allegro', 10, 3);
//function post_product_to_allegro($post_id, $post)
//{
//
//    if ($post->post_type !== 'product' || $post->post_status !== 'publish') {
//        SaidPluginsUtils::log("!1: " . json_encode($post));
//        return;
//    }
//    SaidPluginsUtils::log("1: " . json_encode($post));
//
//    $product = wc_get_product($post_id);
//
//    $allegro_auto_update = SaidPluginsUtils::valOrDef(get_option('allegro_auto_update'), false);
//    if (!$allegro_auto_update) {
//        SaidPluginsUtils::log("!2: $allegro_auto_update");
//        return;
//    }
//
//    _post_product_to_allegro($product);
//
//}

function _post_product_to_allegro($product)
{

    $access_token = getAllegroAccessToken();
    if (!isset($access_token)) {
        SaidPluginsUtils::log("!2");
        return;
    }
    SaidPluginsUtils::log("2");

    $isProductPublishedOnAllegro = said_plugins_store_integrations_isProductPublishedOnAllegro($product->get_id());
    if (!$isProductPublishedOnAllegro) {
        SaidPluginsUtils::log("!2.1v1: $isProductPublishedOnAllegro");
        return;
    }

    $allegroOfferId = said_plugins_store_integrations_getAllegroOfferId($product->get_id());
    $allegroOffers = getAllegroOffers();
    $allegroOffer = null;
    foreach ($allegroOffers as $_allegroOffer) {
        if ($_allegroOffer['id'] === $allegroOfferId) {
            $allegroOffer = $_allegroOffer;
            break;
        }
    }

    if(!isset($allegroOffer)) {
        SaidPluginsUtils::log("!2.1v2: $allegroOffer");
        return;
    }

    $quantity = $product->get_stock_quantity();
    if (!isset($quantity) || !is_numeric($quantity)) {
        $quantity = 1;
    }

    $description = $product->get_description();
    if (empty($description)) {
        $description = $product->get_short_description();
    }
    if (!isset($description)) {
        $description = "";
    }
    $description = "<p>$description</p>";

    $price = floatval($product->get_sale_price());
    if (!isset($price) || !is_float($price)) {
        $price = floatval($product->get_regular_price());
    }
    if (!isset($price) || !is_float($price)) {
        $price = floatval($product->get_price());
    }
    if (!isset($price)) {
        $price = floatval("0.00");
    }
    $price = number_format($price, 2);

    SaidPluginsUtils::log("3.3: $price");

    $attachment_ids = $product->get_gallery_image_ids();
    $attachments = [];
    if (!empty($attachment_ids)) {
        foreach ($attachment_ids as $attachment_id) {
            $image_png_data = getAttachmentPngData($attachment_id);
            $attachments[] = $image_png_data['url'];
        }
    }

    $product_data = array(
        "name" => $product->get_name(),
        "description" => array(
            "sections" => array(
                array(
                    "items" => array(
                        array(
                            "type" => "TEXT",
                            "content" => $description
                        )
                    )
                )
            )
        ),
        "stock" => array(
            "available" => $quantity,
            "unit" => "UNIT"
        ),
        "sellingMode" => array(
            "format" => "BUY_NOW",
            "price" => array(
                "amount" => $price,
                "currency" => get_woocommerce_currency()
            )
        ),
        "images" => $attachments,
    );
    SaidPluginsUtils::log('3.4: ' . json_encode($product_data));

    $response = allegro_request('https://api.allegro.pl/sale/product-offers/' . $allegroOfferId, 'PATCH', json_encode($product_data));
    SaidPluginsUtils::log('3.5');

    if (is_wp_error($response)) {
        SaidPluginsUtils::log("!4: " . json_encode($response));
        return;
    }
    SaidPluginsUtils::log("4: " . json_encode($response));
}