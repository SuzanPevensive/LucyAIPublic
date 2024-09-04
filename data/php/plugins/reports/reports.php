<?php

function readGetParamForInput( $name, $type, $default = '', $attributes = [] )
{
    return array_merge(
        [
            'type' => $type,
            'value' => SaidPluginsUtils::valOrDef( $_GET, $name, $default )
        ],
        [
            'attributes' => $attributes
        ]
    );
}

function said_plugins_getStoreProducts($search = '', $dateFrom = '', $dateTo = '') {
    global $wpdb;

    $query = "
        SELECT p.ID as id, 
            p.post_name as name,
            CONCAT('" . site_url() . "/?p=', p.ID) as permalink,
            pm_price.meta_value as price,
            pm_stock.meta_value as stock_quantity,
            GROUP_CONCAT(term.name SEPARATOR ', ') as categories,
            pm_allegro.meta_value as is_product_published_on_allegro,
            pm_allegro_offer.meta_value as allegro_offer_id,
            pm_olx.meta_value as is_product_published_on_olx,
            pm_amazon.meta_value as is_product_published_on_amazon
        FROM {$wpdb->posts} p
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

    // Filtrowanie według daty (od)
    if (!empty($dateFrom)) {
        $query .= $wpdb->prepare(" AND p.post_date >= %s", $dateFrom);
    }

    // Filtrowanie według daty (do)
    if (!empty($dateTo)) {
        $query .= $wpdb->prepare(" AND p.post_date <= %s", $dateTo);
    }

    $query .= " GROUP BY p.ID";

    return $wpdb->get_results($query);
}


function said_plugins_reports_admin_menu()
{
    add_submenu_page('said-plugins', 'Reports', 'Reports', 'manage_options', 'said-plugins-reports', 'said_plugins_reports_page');
}
add_action('admin_menu', 'said_plugins_reports_admin_menu');

function said_plugins_reports_page()
{
    wp_enqueue_style(
            'said-reports-page-style',
            said_getPhpUrl() . '/plugins/reports/settings.css'
    );
    wp_enqueue_script(
        'said-plugins-reports-script-html2canvas',
        said_getPhpUrl() . '/plugins/reports/vendor/html2canvas.min.js'
    );
    wp_enqueue_script(
        'said-plugins-reports-script-jspdf',
        said_getPhpUrl() . '/plugins/reports/vendor/jspdf.umd.min.js',
        [ 'said-plugins-reports-script-html2canvas' ]
    );
    wp_enqueue_script(
        'said-plugins-reports-script-jspdf-verdana',
        said_getPhpUrl() . '/plugins/reports/vendor/Verdana-normal.js',
        [ 'said-plugins-reports-script-jspdf' ]
    );
    wp_enqueue_script(
        'said-plugins-reports-script-jspdf-autotable',
        said_getPhpUrl() . '/plugins/reports/vendor/jspdf.plugin.autotable.min.js',
        [ 'said-plugins-reports-script-jspdf' ]
    );
    wp_enqueue_script(
        'said-plugins-reports-script',
        said_getPhpUrl() . '/plugins/reports/reports.js',
        [ 'said-plugins-reports-script-jspdf-autotable' ]
    );

    $visibleInputs['search']    = readGetParamForInput( 'search', 'text', '', [ 'placeholder' => 'Szukaj produktu' ] );
    $visibleInputs['date_from'] = readGetParamForInput( 'date_from', 'date', '', [ 'id' => 'said_plugins_reports_search_date_from' ] );
    $visibleInputs['date_to']   = readGetParamForInput( 'date_to', 'date', '', [ 'id' => 'said_plugins_reports_search_date_to' ] );

    $products = said_plugins_getStoreProducts(
        $visibleInputs['search']['value'],
        $visibleInputs['date_from']['value'],
        $visibleInputs['date_to']['value']
    );
    ?>

    <div class="report-container">

        <!-- Formularz Wyszukiwania i Wyboru Dat -->
        <form method="get">
            <?php
            foreach( $_GET as $key => $value ) {
                if( !array_key_exists( $key, $visibleInputs ) && is_string( $value ) ) {
                    echo "<input type='hidden' name='$key' value='$value'/>";
                }
            }
            foreach( $visibleInputs as $key => $visibleInput ) {
                $attributes = '';

                foreach( $visibleInput['attributes'] as $attrKey => $attrValue ) {
                    $attributes .= sprintf( '%s="%s" ', $attrKey, esc_attr( $attrValue ) );
                }

                echo sprintf(
                    '<input type="%s" name="%s" value="%s" %s/> ',
                    $visibleInput['type'],
                    $key,
                    esc_attr( $visibleInput['value'] ),
                    $attributes
                );
            }
            ?>
            <input type="submit" value="Szukaj"/>
            <span style="white-space: nowrap; float: right">
                <label for="said_plugins_reports_save_as_pdf_render_images">zapisz obrazy</label>
                <input type="checkbox" id="said_plugins_reports_save_as_pdf_render_images"
                       onchange="onChangeRenderImages(event, 'Uwaga!' +
                       '\n\nZapisywanie obrazów spowalnia generowanie PDF.' +
                       '\nPrzy dużych ilościach produktów ( >500 ) nawet do kilku minut.')"/>
                <input type="button" id="said_plugins_reports_save_as_pdf"
                       onclick="saveTableAsPDF(
                           'said_plugins_reports_data_table',
                            document.getElementById('said_plugins_reports_save_as_pdf_render_images').checked,
                       )"
                       value="zapisz jako plik PDF"/>
            </span>
        </form>

        <div><span id="said_plugins_reports_info_count">Ilość produktów: <?php echo count($products); ?></span>
        <span id="said_plugins_reports_info_phrase"><?php if(!empty($visibleInputs['search']['value']))
            echo sprintf('Szukane hasło: %s', $visibleInputs['search']['value']);
        ?></span>
        <span id="said_plugins_reports_info_from"><?php if(!empty($visibleInputs['date_from']['value']))
            echo sprintf('Data od: %s', $visibleInputs['date_from']['value']);
        ?></span>
        <span id="said_plugins_reports_info_to"><?php if(!empty($visibleInputs['date_to']['value']))
            echo sprintf('Data do: %s', $visibleInputs['date_to']['value']);
        ?></span>
        </div>
        <table id="said_plugins_reports_data_table" class="widefat fixed striped">
            <thead>
            <tr>
                <th>Id</th>
                <th>Name</th>
                <th>Image</th>
                <th>Price</th>
                <th>Availability</th>
                <th>Categories</th>
            </tr>
            </thead>
            <tbody>

            <?php foreach ($products as $product): ?>
                <tr>
                    <td><?php echo esc_html($product->id); ?></td>
                    <td><a href="<?php echo esc_url($product->permalink); ?>"
                        target="_blank"><?php echo esc_html($product->name); ?></a></td>
                    <td><img src="<?php echo esc_url(
                            get_the_post_thumbnail_url($product->id, 'thumbnail')
                        ); ?>"
                        alt="<?php echo esc_attr($product->name); ?>" style="width: 50px; height: auto;"></td>
                    <td><?php echo wc_price($product->price); ?></td>
                    <td><?php echo esc_html($product->stock_quantity ?: '0'); ?></td>
                    <td><?php echo esc_html($product->categories); ?></td>
                </tr>
            <?php endforeach; ?>

            </tbody>
        </table>
    </div>

    <?php
}
