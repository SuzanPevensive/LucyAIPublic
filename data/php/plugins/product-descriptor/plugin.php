<?php

function said_plugins_product_descriptor_init()
{
    wp_enqueue_script('said-plugins-product-descriptor-plugin-script', said_getPhpUrl() . '/plugins/product-descriptor/plugin.js');
    wp_localize_script('said-plugins-product-descriptor-plugin-script', 'said_wp_config_object', array(
        'ajax_url' => admin_url('admin-ajax.php')
    ));
    wp_enqueue_style('said-plugins-product-descriptor-plugin-style', said_getPhpUrl() . '/plugins/product-descriptor/plugin.css');
}

add_action("init", "said_plugins_product_descriptor_init");

function said_plugins_product_descriptor_button_init($which)
{
    global $typenow;
    $translations = SaidPluginsUtils::getTranslations();
    if ('product' === $typenow && 'top' === $which) {
        ?>
        <div class="align-left actions custom-gallery-action">
            <button type="button" id="said-plugins-product_descriptor-add-button" class="button">
                <?php echo $translations['said-plugins-product_descriptor-add-button'] ?? 'Add from gallery'; ?>
            </button>
        </div>
        <?php
    }
}

add_action('manage_posts_extra_tablenav', 'said_plugins_product_descriptor_button_init', 20, 1);

function said_plugins_product_descriptor_ajax_create_products_from_gallery()
{

    $said_plugins_product_descriptor_page_template_name_token =
        get_option('said_plugins_product_descriptor_page_template_name_token');
    $said_plugins_product_descriptor_header_description_token =
        get_option('said_plugins_product_descriptor_header_description_token');
    $said_plugins_product_descriptor_content_description_token =
        get_option('said_plugins_product_descriptor_content_description_token');

    $sendError = function ($message = 'Unable to create page from template.') {
        wp_send_json(array(
            'status' => 'error',
            'message' => $message
        ));
    };

    $host = "https://" . $_SERVER["HTTP_HOST"];

    if (isset($_POST["page_id"])
        && isset($_POST["language"])
        && isset($_POST["city"])
        && isset($_POST["said_wp_token"])
        && isset($_POST["said_wp_csrf"])
    ) {

        $page_id = $_POST["page_id"];
        $city = $_POST["city"];
        $language = $_POST["language"];
        $sub_mode_prompt = $_POST["sub_mode_prompt"];
        $said_plugins_product_descriptor_publish_after_generate = $_POST["said_plugins_product_descriptor_publish_after_generate"];

        $page_content_html = get_post_field('post_content', $page_id);
        $page_content_html =
            str_replace(
                '[city]',
                $city,
                str_replace(
                    '`{`city`}`',
                    $city,
                    $page_content_html
                )
            );
        $page_title = get_post_field('post_title', $page_id);

        $post_id = SaidPluginsUtils::duplicate_post(
            $page_id,
            str_replace(
                '[city]',
                $city,
                str_replace(
                    '[' . $said_plugins_product_descriptor_page_template_name_token . ']',
                    '',
                    $page_title
                )
            ),
            'Generating ...',
            $said_plugins_product_descriptor_publish_after_generate === 'true' ? 'publish' : 'pending',
            array(
                'city' => $city
            )
        );

        $sendErrorAndRemovePage = function () use ($post_id, $sendError) {
            wp_delete_post($post_id, true);
            $sendError();
        };
        $secretKey = uniqid('said_secret_key_', true);
        update_post_meta($post_id, 'said_secret_key', $secretKey);
        $said_plugins_product_descriptor_faq_json = get_option('said_plugins_product_descriptor_faq', '[]');
        $said_plugins_product_descriptor_faq = json_decode($said_plugins_product_descriptor_faq_json, true);
        $data = array(
            'language' => $language,
            'subModePrompt' => $sub_mode_prompt,
            'city' => $city,
            'html' => $page_content_html,
            'questions' => $said_plugins_product_descriptor_faq,
            'titleToken' => $said_plugins_product_descriptor_header_description_token,
            'contentToken' => $said_plugins_product_descriptor_content_description_token,
            'host' => $host,
            'pageId' => $post_id,
            'secretKey' => $secretKey
        );
        $response = wp_remote_post(said_getUrl() . '/ask', array(
            'body' => array(
                'mode' => 'product-descriptor',
                'data' => json_encode($data)
            ),
            'headers' => array(
                'Authorization' => 'Bearer ' . $_POST["said_wp_token"],
                'x-csrf-token' => $_POST["said_wp_csrf"]
            ),
        ));
        if (is_wp_error($response)) {
            $sendErrorAndRemovePage();
        } else {
            try {
                $response = json_decode(wp_remote_retrieve_body($response), true);
                if (empty($response['error'])) {
                    wp_send_json(array(
                        'status' => 'success',
                        'message' => 'Page created successfully.'
                    ));
                } else {
                    $sendErrorAndRemovePage();
                }
            } catch (Throwable $e) {
                $sendErrorAndRemovePage();
            }
        }
    } else {
        $sendError('Invalid request.');
    }
}

add_action('wp_ajax_said_plugins_product_descriptor_ajax_create_page_from_template', 'said_plugins_product_descriptor_ajax_create_page_from_template');

function said_plugins_product_descriptor_ajax_update_page_from_template($request)
{
    $sendError = function ($message = 'Unable to update page from template.') {
        wp_send_json(array(
            'status' => 'error',
            'message' => $message
        ));
    };

    $params = $request->get_params();

    $pageId = $params["page_id"];
    $secretKey = $params["secret_key"];
    $pageContent = $params["page_content"];
    $city = $params["city"];

    if (isset($pageId)
        && isset($secretKey)
        && isset($pageContent)
    ) {

        $said_plugins_product_descriptor_selected_images = get_option('said_plugins_product_descriptor_selected_images', array());
        shuffle($said_plugins_product_descriptor_selected_images);
        $useId = false;
        $index = 0;
        $replaceSrc = function ($matches) use (&$said_plugins_product_descriptor_selected_images, &$useId, &$index) {
            $selected_image = $said_plugins_product_descriptor_selected_images[$index];
            if ($index < count($said_plugins_product_descriptor_selected_images) - 1) {
                $index++;
            } else {
                shuffle($said_plugins_product_descriptor_selected_images);
                while($selected_image === $said_plugins_product_descriptor_selected_images[0]) {
                    shuffle($said_plugins_product_descriptor_selected_images);
                }
                $index = 0;
            }
            if (empty($selected_image)) {
                return $matches[0];
            }
            $image_url = $useId ? $selected_image : wp_get_attachment_image_url($selected_image, 'full');
            return $matches[1] . $image_url . $matches[3];
        };

        $pageContent = preg_replace_callback(
            '/(<[^>]*?class\s*=\s*["\'][^"\']*?said-product-descriptor-image[^"\']*?["\'][^>]*?>.*?<img[^>]*?src\s*=\s*["\'])([^"\']*?)(["\'].*?<\/div>)/i',
            $replaceSrc,
            $pageContent
        );
        $pageContent = preg_replace_callback(
            '/(<[^>]*?class\s*=\s*["\'][^"\']*?said-product-descriptor-image[^"\']*?["\'][^>]+src\s*=\s*["\'])([^"\']*?)(["\'][^>]*?>)/i',
            $replaceSrc,
            $pageContent
        );
        $pageContent = preg_replace_callback(
            '/(<[^>]*?src\s*=\s*["\'])([^"\']*?)(["\'][^>]+class\s*=\s*["\'][^"\']*?said-product-descriptor-image[^"\']*?["\'][^>]*?>)/i',
            $replaceSrc,
            $pageContent
        );
        $useId = true;
        $pageContent = preg_replace_callback(
            '/(\[[^\[]*?image\s*=\s*")([^"\']*?)("[^\[]*?el_class\s*=\s*".*?said-product-descriptor-image.*?"[^\[]*?])/i',
            $replaceSrc,
            $pageContent
        );
        $pageContent = preg_replace_callback(
            '/(\[[^\[]*?el_class\s*=\s*".*?said-product-descriptor-image.*?"[^\[]+image\s*=\s*")([^"\']*?)("[^\[]*?])/i',
            $replaceSrc,
            $pageContent
        );

        $saved_secret_key = get_post_meta($pageId, 'said_secret_key', true);
        if ($secretKey === $saved_secret_key) {
            $post = array(
                'ID' => $pageId,
                'post_content' => str_replace(
                    '`{`city`}`',
                    $city,
                    str_replace(
                        '[city]',
                        $city,
                        $pageContent
                    )
                ),
            );
            wp_update_post($post);
            wp_send_json(array(
                'status' => 'success',
                'message' => 'Page updated successfully.'
            ));
        } else {
            $sendError('Invalid secret key.');
        }
    } else {
        $sendError('Invalid request.');
    }
}

add_action('rest_api_init', function () {
    register_rest_route('said-plugins/product-descriptor', '/update/', array(
        'methods' => 'POST',
        'callback' => 'said_plugins_product_descriptor_ajax_update_page_from_template',
        'permission_callback' => '__return_true'
    ));
});