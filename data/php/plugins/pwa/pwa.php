<?php

function said_plugins_pwa_find_max_price() {
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => 1,
        'orderby' => 'meta_value_num',
        'meta_key' => '_price',
        'order' => 'DESC',
    );
    $loop = new WP_Query($args);
    $price = 0.0;
    while ($loop->have_posts()){
        $loop->the_post();
        global $product;
        $productPrice =  floatval($product->get_price());
        if ($productPrice > $price) {
            $price = $productPrice;
        }
    }
    wp_reset_postdata();
    return $price;
}


function said_plugins_pwa_init() {

    session_start();

    $pages = array('shop');
    if ($_GET['pwa'] === 'false') {
        $_SESSION['pwa'] = 'false';
    }
    $pwa = $_SESSION['pwa'] ?? $_GET['pwa'];
    if ($pwa === 'true') {
        $_SESSION['pwa'] = 'true';
        $path = explode('?', $_SERVER['REQUEST_URI'])[0];
        if ($path === '/') {
            header('Location: /shop');
        }
        foreach ($pages as $page) {
            if (str_starts_with($path, "/$page")) {
                wp_enqueue_style("said-plugins-pwa-page-$page-style", said_getPhpUrl() . "/plugins/pwa/$page/style.css");
                $scriptName = "said-plugins-pwa-page-$page-script";
                wp_enqueue_script($scriptName, said_getPhpUrl() . "/plugins/pwa/$page/script.js");
                $maxPrice = said_plugins_pwa_find_max_price();
                wp_localize_script($scriptName, 'said_pwa_slider_object', array('max' => $maxPrice));
                break;
            }
        }
        wp_enqueue_style('said-plugins-pwa-style', said_getPhpUrl() . '/plugins/pwa/style.css');
        wp_enqueue_script('said-plugins-pwa-script', said_getPhpUrl() . '/plugins/pwa/script.js', );
        wp_localize_script('said-plugins-pwa-script', 'said_pwa_ajax_object', array('ajax_url' => admin_url('admin-ajax.php')));
    }
}
add_action('init', 'said_plugins_pwa_init');