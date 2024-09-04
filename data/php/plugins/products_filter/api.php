<?php

add_action('rest_api_init', function () {
    register_rest_route('said-plugins/products-filters', '/products/', array(
        'methods' => 'POST',
        'callback' => 'said_plugins_filter_get_products_endpoint',
        'permission_callback' => '__return_true'
    ));
    register_rest_route('said-plugins/products-filters', '/price_range/', array(
        'methods' => 'POST',
        'callback' => 'said_plugins_filter_get_price_range_endpoint',
        'permission_callback' => '__return_true'
    ));
    register_rest_route('said-plugins/products-filters', '/categories/', array(
        'methods' => 'POST',
        'callback' => 'said_plugins_filter_get_categories_endpoint',
        'permission_callback' => '__return_true'
    ));
    register_rest_route('said-plugins/products-filters', '/product/', array(
        'methods' => 'POST',
        'callback' => 'said_plugins_filter_get_product_endpoint',
        'permission_callback' => '__return_true'
    ));
    register_rest_route('said-plugins/products-filters', '/ping/', array(
        'methods' => 'POST',
        'callback' => 'said_plugins_filter_ping',
        'permission_callback' => '__return_true'
    ));
});

function said_plugins_filter_ping($request)
{
    return new WP_REST_Response(array('success' => true), 200);
}

function said_plugins_filter_get_price_range_endpoint($request)
{
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'meta_query' => array()
    );

    $query = new WP_Query($args);
    $prices = array();

    while ($query->have_posts()) {
        $query->the_post();
        global $product;
        $prices[] = $product->get_price();
    }

    wp_reset_postdata();

    return new WP_REST_Response(array(
        'min' => min($prices),
        'max' => max($prices)
    ), 200);
}

function said_plugins_filter_get_categories_endpoint(){
    $categories = get_terms('product_cat');
    $categoriesResponse = array();
    foreach($categories as $category) {
        $categoriesResponse[] = array(
            'id' => $category->term_id,
            'name' => $category->name
        );
    }
    return new WP_REST_Response($categoriesResponse, 200);
}

function said_plugins_filter_get_product_endpoint($request)
{

    $params = $request->get_params();
    $productId = $params['productId'];

    $product = wc_get_product($productId);

    if (!$product) {
        return new WP_REST_Response(array('error' => 'Product not found'), 404);
    }

    $images = [];
    $mainImage = get_the_post_thumbnail_url($product->get_id());
    if ($mainImage !== false) {
        $images[] = $mainImage;
    }
    $attachment_ids = $product->get_gallery_image_ids();
    foreach ($attachment_ids as $attachment_id) {
        $image = wp_get_attachment_url($attachment_id);
        if ($image !== false) {
            $images[] = $image;
        }
    }

    $categories = get_the_terms(get_the_ID(), 'product_cat');
    $product_categories = array();

    if (!empty($categories) && !is_wp_error($categories)) {
        foreach ($categories as $category) {
            $product_categories[$category->term_id] = $category->name;
        }
    }

    $productResponse = array(
        'id' => $product->get_id(),
        'name' => $product->get_name(),
        'description' => $product->get_description(),
        'short_description' => $product->get_short_description(),
        'price' => $product->get_price(),
        'mainImage' => $mainImage,
        'images' => $images,
        'stock' => $product->get_stock_quantity(),
        'categories' => $product_categories
    );

    return new WP_REST_Response($productResponse, 200);
}

function said_plugins_filter_get_products_endpoint($request)
{

    $params = $request->get_params();

    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'meta_query' => array()
    );

    if (!empty($params['s'])) {
        $args['s'] = sanitize_text_field($params['s']);
    }

    if (!empty($params['price_min']) || !empty($params['price_max'])) {
        $price_min = !empty($params['price_min']) ? $params['price_min'] : 0;
        $price_max = !empty($params['price_max']) ? $params['price_max'] : 9999999;

        $args['meta_query'][] = array(
            'key' => '_price',
            'value' => array($price_min, $price_max),
            'compare' => 'BETWEEN',
            'type' => 'NUMERIC'
        );
    }

    if (!empty($params['in_stock'])) {
        $args['meta_query'][] = array(
            'key' => '_stock_status',
            'value' => 'instock',
        );
    }

    if (!empty($params['cat'])) {
        $args['tax_query'][] = array(
            'taxonomy' => 'product_cat',
            'field' => 'term_id',
            'terms' => $params['cat']
        );
    }

    if ( ! empty( $params['chunkIndex'] ) || ! empty( $params['chunkSize'] )) {
        $chunkOffset = intval($params['chunkOffset']);
        $chunkIndex = intval($params['chunkIndex']);
        $chunkSize = intval($params['chunkSize']);
        if ($chunkIndex < 0) $chunkIndex = 0;
        if ($chunkIndex === 0 && $chunkOffset < 0) $chunkOffset = 0;
        if ($chunkSize === 0) $chunkSize = 20;
        $args['offset'] = $chunkSize * $chunkIndex + $chunkOffset;
        $args['posts_per_page'] = $chunkSize;
    }

    $query = new WP_Query($args);
    $products = array();

    while ($query->have_posts()) {
        $query->the_post();
        global $product;

        $categories = get_the_terms(get_the_ID(), 'product_cat');
        $product_categories = array();

        if (!empty($categories) && !is_wp_error($categories)) {
            foreach ($categories as $category) {
                $product_categories[$category->term_id] = $category->name;
            }
        }

        $products[] = array(
            'id' => get_the_ID(),
            'name' => get_the_title(),
            'description' => $product->get_description(),
            'short_description' => $product->get_short_description(),
            'image' => get_the_post_thumbnail_url(),
            'price' => $product->get_price(),
            'stock' => $product->get_stock_quantity(),
            'categories' => $product_categories
        );
    }

    wp_reset_postdata();

    return new WP_REST_Response($products, 200);
}
