<?php

function said_modify_product_query( $query ) {
    if ( ! is_admin() && $query->is_main_query() && is_search() && ! empty( $_GET['post_type'] ) && $_GET['post_type'] == 'product' ) {

        if ( ! empty( $_GET['s'] ) ) {
            $query->set('s', $_GET['s']);
        }

        if ( ! empty( $_GET['price_min'] ) || ! empty( $_GET['price_max'] ) ) {
            $current_meta_query = $query->get('meta_query') ?? array();
            $price_min = ! empty( $_GET['price_min'] ) ? $_GET['price_min'] : 0;
            $price_max = ! empty( $_GET['price_max'] ) ? $_GET['price_max'] : 9999999;
            $current_meta_query[] = array(
                'key' => '_price',
                'value' => array( $price_min, $price_max ),
                'compare' => 'BETWEEN',
                'type' => 'NUMERIC'
            );
            $query->set('meta_query', $current_meta_query);
        }

        if ( ! empty( $_GET['in_stock'] ) ) {
            $current_meta_query = $query->get('meta_query') ?? array();
            $current_meta_query[] = array(
                'key' => '_stock_status',
                'value' => 'instock',
            );
            $query->set('meta_query', $current_meta_query);
        }

        if ( ! empty( $_GET['cat'] ) ) {
            $query->set('tax_query', array(
                array(
                    'taxonomy' => 'product_cat',
                    'field' => 'term_id',
                    'terms' => $_GET['cat']
                )
            ));
        }

        if ( ! empty( $_GET['chunkIndex'] ) || ! empty( $_GET['chunkSize'] )) {
            $chunkOffset = intval($_GET['chunkOffset']);
            $chunkIndex = intval($_GET['chunkIndex']);
            $chunkSize = intval($_GET['chunkSize']);
            if ($chunkIndex < 0) $chunkIndex = 0;
            if ($chunkIndex === 0 && $chunkOffset < 0) $chunkOffset = 0;
            if ($chunkSize === 0) $chunkSize = 20;
            $query->set('offset', $chunkSize * $chunkIndex + $chunkOffset);
            $query->set('posts_per_page', $chunkSize);
        }
    }
}
add_action( 'pre_get_posts', 'said_modify_product_query' );

function said_products_filter_shortcode( $atts ){

    wp_enqueue_script('jquery-ui-slider');
    wp_enqueue_script('said-plugins-filter-script', said_getPhpUrl() . '/plugins/products_filter/products_filter.js', array('jquery'), '1.0', true);
    wp_enqueue_style('jquery-ui-style', '//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css');
    wp_enqueue_style('said-plugins-filter-style', said_getPhpUrl() . '/plugins/products_filter/products_filter.css');

    ob_start();
    ?>
    <div id="said-plugins-filter-form">
        <div>
            <div>
                <label>Search:</label>
                <input type="text" id="said-plugins-filter-search" placeholder="Search Products..."
                       value="<?php echo ! empty( $_GET['s'] ) ? $_GET['s'] : ''; ?>">
            </div>
            <div>
                <label>Choose category:</label>
                <select id="said-plugins-filter-category">
                    <?php
                    $categories = get_terms('product_cat');
                    foreach($categories as $category) {
                        ?>
                        <option <?php echo ! empty( $_GET['cat'] ) && $_GET['cat'] == $category->term_id ? 'selected' : ''; ?>
                            value="<?php echo $category->term_id; ?>"><?php echo $category->name; ?></option>
                        <?php
                    }
                    ?>
                </select>
            </div>
        </div>
        <div>
            <div>
                <label>Price range:</label>
                <div>
                    <label>
                        <input type="number" style="padding-right: 30px !important;" id="said-plugins-filter-price-from"
                               value="<?php echo ! empty( $_GET['price_min'] ) ? $_GET['price_min'] : ''; ?>">
                    </label>
                    <label>
                        <input type="number" style="padding-right: 30px !important;" id="said-plugins-filter-price-to"
                                 value="<?php echo ! empty( $_GET['price_max'] ) ? $_GET['price_max'] : ''; ?>">
                    </label>
                </div>
            </div>
            <div >
                <button class="button" id="said-plugins-filter-button">Search</button>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode( 'said_products_filter', 'said_products_filter_shortcode' );