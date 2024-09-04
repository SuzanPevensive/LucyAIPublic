<?php

function getsaidStoreIntegrationsUrl($path)
{
    return said_getPhpUrl() . "/plugins/store-integrations/$path";
}

function said_plugins_store_integrations_integration_menu()
{
    add_menu_page('Store integrations', 'Store integrations', 'manage_options', 'said-plugins-store-integration', 'said_plugins_store_integrations_settings_page', 'dashicons-cart');
    add_submenu_page('said-plugins-store-integration', 'Allegro settings', 'Allegro settings', 'manage_options', 'said-plugins-store-integration-allegro-settings', 'said_store_integration_allegro_settings_page');
}

add_action('admin_menu', 'said_plugins_store_integrations_integration_menu');

function said_plugins_store_integrations_getStoreProducts($search = '', $dateFrom = '', $dateTo = '') {
    global $wpdb;

    $query = "
        SELECT p.ID as id, 
            p.post_name as name,
            CONCAT('" . site_url() . "/?p=', p.ID) as permalink,
            img.guid as image_url,
            pm_price.meta_value as price,
            pm_stock.meta_value as stock_quantity,
            GROUP_CONCAT(term.name SEPARATOR ', ') as categories,
            pm_allegro.meta_value as is_product_published_on_allegro,
            pm_allegro_offer.meta_value as allegro_offer_id,
            pm_olx.meta_value as is_product_published_on_olx,
            pm_amazon.meta_value as is_product_published_on_amazon
        FROM {$wpdb->posts} p
        LEFT JOIN {$wpdb->postmeta} pm_thumb ON (p.ID = pm_thumb.post_id AND pm_thumb.meta_key = '_thumbnail_id')
        LEFT JOIN {$wpdb->posts} img ON (pm_thumb.meta_value = img.ID)
        LEFT JOIN {$wpdb->postmeta} pm_price ON (p.ID = pm_price.post_id AND pm_price.meta_key = '_price')
        LEFT JOIN {$wpdb->postmeta} pm_stock ON (p.ID = pm_stock.post_id AND pm_stock.meta_key = '_stock')
        LEFT JOIN {$wpdb->term_relationships} tr ON (p.ID = tr.object_id)
        LEFT JOIN {$wpdb->term_taxonomy} tt ON (tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'product_cat')
        LEFT JOIN {$wpdb->terms} term ON (tt.term_id = term.term_id)
        LEFT JOIN {$wpdb->postmeta} pm_allegro ON (p.ID = pm_allegro.post_id AND pm_allegro.meta_key = 'is_product_published_on_allegro')
        LEFT JOIN {$wpdb->postmeta} pm_allegro_offer ON (p.ID = pm_allegro_offer.post_id AND pm_allegro_offer.meta_key = 'allegro_offer_id')
        LEFT JOIN {$wpdb->postmeta} pm_olx ON (p.ID = pm_olx.post_id AND pm_olx.meta_key = 'is_product_published_on_olx')
        LEFT JOIN {$wpdb->postmeta} pm_amazon ON (p.ID = pm_amazon.post_id AND pm_amazon.meta_key = 'is_product_published_on_amazon')
        WHERE p.post_type = 'product' AND p.post_status = 'publish'
    ";

    // Filtrowanie według wyszukiwania
    if (!empty($search)) {
        $query .= $wpdb->prepare(" AND (p.post_title LIKE %s OR p.post_content LIKE %s OR p.post_excerpt LIKE %s)", '%' . $wpdb->esc_like($search) . '%', '%' . $wpdb->esc_like($search) . '%', '%' . $wpdb->esc_like($search) . '%');
    }

    // Filtrowanie według daty
    if (!empty($dateFrom)) {
        $query .= $wpdb->prepare(" AND p.post_date >= %s", strtotime($dateFrom));
    }
    if (!empty($dateTo)) {
        $query .= $wpdb->prepare(" AND p.post_date <= %s", strtotime($dateTo));
    }

    $query .= " GROUP BY p.ID";

    return $wpdb->get_results($query);
}


function getAttachmentPngData($attachment_id) {

    $image_path = get_attached_file($attachment_id);
    $image_url = wp_get_attachment_image_src( $attachment_id, 'single-post-thumbnail' );
    $image_url = $image_url[0];
    if (!$image_path) return null;

    $imageInfo = pathinfo($image_path);
    if ($imageInfo['extension'] === 'webp') {
        $image_path_output = str_replace(".webp", ".png", $image_path);
        $image_url = str_replace(".webp", ".png", $image_url);
        exec("dwebp $image_path -o $image_path_output");
        $image_path = $image_path_output;
    }

    return array('url' => $image_url, 'name' => basename($image_path));
}

function saidGenerateRandomFileName($extension = '.jpg') {
    $date = new DateTime();
    $timestamp = $date->getTimestamp();
    $randomString = bin2hex(random_bytes(10)); // Generuje losowy ciąg znaków

    // Tworzy nazwę pliku w formacie '2024-03-14-1652367890-abc123def456.jpg'
    $fileName = 'said_' . $date->format('Y-m-d') . '-' . $timestamp . '-' . $randomString . $extension;

    return sanitize_file_name($fileName); // Funkcja WordPressa do sanitacji nazw plików
}

function wp_insert_attachment_from_url( $url, $parent_post_id = null ) {

    $response = wp_remote_get($url);
    if ( 200 !== $response['response']['code'] ) {
        return false;
    }

    $file_name = saidGenerateRandomFileName();

    $upload = wp_upload_bits( $file_name, null, $response['body'] );
    if ( ! empty( $upload['error'] ) ) {
        return false;
    }

    $file_path        = $upload['file'];
    $file_type        = wp_check_filetype( $file_name, null );
    $wp_upload_dir    = wp_upload_dir();

    $post_info = array(
        'guid'           => $wp_upload_dir['url'] . '/' . $file_name,
        'post_mime_type' => $file_type['type'],
        'post_title'     => $file_name,
        'post_content'   => '',
        'post_status'    => 'inherit',
    );

    // Create the attachment.
    $attach_id = wp_insert_attachment( $post_info, $file_path, $parent_post_id );

    // Include image.php.
    require_once ABSPATH . 'wp-admin/includes/image.php';

    // Generate the attachment metadata.
    $attach_data = wp_generate_attachment_metadata( $attach_id, $file_path );

    // Assign metadata to attachment.
    wp_update_attachment_metadata( $attach_id, $attach_data );

    return $attach_id;

}