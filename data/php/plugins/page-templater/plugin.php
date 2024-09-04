<?php

function said_plugins_page_templater_init()
{
    update_option('said_plugins_page_templater_mirrors', [
        'test' => 'Test queue',
        '01' => 'First queue',
        '02' => 'Second queue',
        '03' => 'Third queue',
        '04' => 'Fourth queue',
    ]);
    update_option('said_plugins_page_templater_algorithms', [
        'gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'
    ]);
    $selected_language = get_option('said_plugins_page_templater_default_language', explode('_', get_locale())[0]);
    $mirrors = get_option('said_plugins_page_templater_mirrors', []);
    $selected_mirror = get_option('said_plugins_page_templater_page_template_mirror', '');
    wp_enqueue_script('said-plugins-page-templater-plugin-script', said_getPhpUrl() . '/plugins/page-templater/plugin.js');
    $algorithms = get_option('said_plugins_page_templater_algorithms', []);
    $algorithm = get_option('said_plugins_page_templater_algorithm', '');
    wp_localize_script('said-plugins-page-templater-plugin-script', 'said_wp_config_object', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'language' => $selected_language,
        'mirror' => $selected_mirror,
        'mirrors' => $mirrors,
        'algorithms' => $algorithms,
        'algorithm' => $algorithm,
        'defaultPublishNow' => get_option('said_plugins_page_templater_publish_after_generate', 'off') === 'on',
        'defaultMode' => get_option('said_plugins_page_templater_default_sub_mode', ''),
    ));
    wp_enqueue_style('said-plugins-page-templater-plugin-style', said_getPhpUrl() . '/plugins/page-templater/plugin.css');
}

add_action("init", "said_plugins_page_templater_init");

function said_plugins_page_templater_add_create_template_option_to_page_row_actions($actions, $post)
{
    if (strpos($post->post_title, '[said_template') === 0) {
        $actions['create_template'] =
            '<span href="#" class="said-plugins-page-templater-create-template-link" data-said-page-id="'
            . $post->ID .
            '">Create from this template {{test-name-postfix}}</span>';
        $actions['translate_template'] =
            '<span href="#" class="said-plugins-page-templater-translate-template-link" data-said-page-id="'
            . $post->ID .
            '">Translate this template {{test-name-postfix}}</span>';
    }
    return $actions;
}

add_filter('page_row_actions', 'said_plugins_page_templater_add_create_template_option_to_page_row_actions', 10, 2);

function said_plugins_page_templater_add_create_template_option_to_page_edit_frame()
{
    global $post;

    if (!empty($post) && strpos($post->post_title, '[said_template') === 0) {
        $pageLanguage = get_post_meta($post->ID, 'said_page_language', true);
        $wpLang = explode('_', get_locale())[0];
        if (empty($pageLanguage)) $pageLanguage = $wpLang;
        ?>
        <script>
            jQuery(document).ready(function ($) {
                setTimeout(function () {
                    let linkHTML =
                        '<span href="#" style="margin-right: 16px;" class="said-plugins-page-templater-create-template-link" data-said-page-id="'
                        + '<?php echo $post->ID; ?>' +
                        '">Create from this template {{test-name-postfix}}</span>'
                        + '<span href="#" style="margin-right: 16px;" class="said-plugins-page-templater-translate-template-link" data-said-page-id="'
                        + '<?php echo $post->ID; ?>' +
                        '">Translate this template {{test-name-postfix}}</span>';
                    let selectorHtml =
                        '<div class="said-materialize">' +
                        '<div class="input-field">' +
                        '<input type="text" style="margin-right: 32px;" class="autocomplete said-plugins-page-templater-page-language-selector" value="'
                        + '<?php echo $pageLanguage; ?>' +
                        '" data-said-page-id="'
                        + '<?php echo $post->ID; ?>' +
                        '"/>' +
                        '</div>' +
                        '</div>';
                    $('.edit-post-header__center').before(linkHTML);
                    $('.edit-post-header__center').before(selectorHtml);
                    linkHTML = linkHTML.replace('margin-right: 16px;', 'margin: 8px; margin-bottom: 0 !important; display: block;');
                    selectorHtml = selectorHtml.replace('margin-right: 32px;', 'margin: 8px; margin-top: -16px !important; width: 94%; display: block;');
                    $('#major-publishing-actions').before(linkHTML);
                    $('#major-publishing-actions').before(selectorHtml);
                    SaidEngine.WP.PageTemplater.initTemplatesLinks();
                }, 2000);
            });
        </script>
        <?php
    }
}

add_action('admin_footer', 'said_plugins_page_templater_add_create_template_option_to_page_edit_frame');

function said_plugins_page_templater_ajax_get_templates() {
     $args = array(
         'post_type' => 'page',
         'posts_per_page' => -1,
         'fields' => 'ids',
     );
     $query = new WP_Query($args);
     $templates = [];
     if ($query->have_posts()) {
         foreach ($query->posts as $post_id) {
             $title = get_the_title($post_id);
             if (strpos($title, '[said_template') !== false) {
                 $templates[] = array(
                     'id' => $post_id,
                     'title' => str_replace('&#8211;', '-', $title)
                 );
             }
         }
     }
     wp_reset_postdata();
     wp_send_json($templates);
 }

add_action('wp_ajax_said_plugins_page_templater_ajax_get_templates', 'said_plugins_page_templater_ajax_get_templates');

function said_plugins_page_templater_ajax_clear_queue()
{
    $sendError = function ($message = 'Unable to clear queue.') {
        wp_send_json(array(
            'status' => 'error',
            'message' => $message
        ));
    };

    $mirror = $_POST["mirror"];

    if (isset($_POST["said_wp_token"]) && isset($_POST["said_wp_csrf"])) {
        $response = wp_remote_post(said_getUrl() . '/clear-queue', array(
            'body' => array(
                'model' => 'page-templater'
            ),
            'headers' => array(
                'Authorization' => 'Bearer ' . $_POST["said_wp_token"],
                'x-csrf-token' => $_POST["said_wp_csrf"]
            )
        ));
        if (is_wp_error($response)) {
            $sendError($response->get_error_message());
        } else {
            try {
                $response = json_decode(wp_remote_retrieve_body($response), true);
                if (empty($response['error'])) {
                    wp_send_json(array(
                        'status' => 'success',
                        'message' => 'Queue cleared successfully.'
                    ));
                } else {
                    $sendError($response['error']['message']);
                }
            } catch (Throwable $e) {
                $sendError($e->getMessage());
            }
        }
    } else {
        $sendError('Invalid request.');
    }
}

add_action('wp_ajax_said_plugins_page_templater_ajax_clear_queue', 'said_plugins_page_templater_ajax_clear_queue');

function said_plugins_page_templater_ajax_translate_template()
{
    $sendError = function ($message = 'Unable to create page from template.') {
        wp_send_json(array(
            'status' => 'error',
            'message' => $message
        ));
    };

    $host = "https://" . $_SERVER["HTTP_HOST"];

    if (isset($_POST["page_id"])
        && isset($_POST["language"])
        && isset($_POST["said_wp_token"])
        && isset($_POST["said_wp_csrf"])
    ) {

        $page_id = $_POST["page_id"];
        $queue = $_POST["queue"] ?? 'main';
        $language = $_POST["language"];

        $page_title = get_post_field('post_title', $page_id);
        $page_title = $page_title . ' - ' . $language;
        $page_status = get_post_field('post_status', $page_id);

        $pageLanguage = get_post_meta($page_id, 'said_page_language', true);
        $wpLang = explode('_', get_locale())[0];
        if (empty($pageLanguage)) $pageLanguage = $wpLang;

        $generated_page_id = SaidPluginsUtils::duplicate_post(
            $page_id,
            $page_title,
            'Generating ...',
            $page_status
        );

        $sendErrorAndRemovePage = function ($message) use ($generated_page_id) {
            wp_delete_post($generated_page_id, true);
            wp_send_json(array(
                'status' => 'error',
                'message' => $message
            ));
        };

        $secretKey = uniqid('said_secret_key_', true);
        update_post_meta($generated_page_id, 'said_secret_key', $secretKey);

        $page_content = get_post_field('post_content', $page_id);

        $data = array(
            'action' => 'translate',
            'language' => $language,
            'pageLanguage' => $pageLanguage,
            'templateId' => $page_id,
            'templateName' => $page_title,
            'city' => '[translation]',
            'pageContent' => $page_content,
            'host' => $host,
            'pageId' => $generated_page_id,
            'secretKey' => $secretKey
        );
        $response = wp_remote_post(said_getUrl() . '/ask', array(
            'body' => array(
                'model' => 'page-templater',
                'queue' => $queue,
                'data' => json_encode($data)
            ),
            'headers' => array(
                'Authorization' => 'Bearer ' . $_POST["said_wp_token"],
                'x-csrf-token' => $_POST["said_wp_csrf"]
            )
        ));
        if (is_wp_error($response)) {
            $sendErrorAndRemovePage($response->get_error_message());
        } else {
            try {
                $response = json_decode(wp_remote_retrieve_body($response), true);
                if (empty($response['error'])) {
                    wp_send_json(array(
                        'status' => 'success',
                        'message' => 'Page created successfully.'
                    ));
                } else {
                    $sendErrorAndRemovePage($response['error']['message']);
                }
            } catch (Throwable $e) {
                $sendErrorAndRemovePage($e->getMessage());
            }
        }
    } else {
        $sendError('Invalid request.');
    }
}

add_action('wp_ajax_said_plugins_page_templater_ajax_translate_template', 'said_plugins_page_templater_ajax_translate_template');

function said_plugins_page_templater_ajax_create_page_from_template()
{
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
        $queue = $_POST["queue"] ?? 'main';
        $city = $_POST["city"];
        $language = $_POST["language"];
        $mode = $_POST["mode"];
        $algorithm = $_POST["algorithm"];
        $publish_after_generate = $_POST["publish_after_generate"];
        $page_title = get_post_field('post_title', $page_id);
        $page_title_addon = '';
        $page_title = str_replace(
            '[city]',
            $city,
            preg_replace_callback(
                '/^\[said_template' . '(.*?)]/',
                function ($matches) use (&$page_title_addon) {
                    $page_title_addon = $matches[1];
                    return '';
                },
                $page_title
            )
        );

        $pageLanguage = get_post_meta($page_id, 'said_page_language', true);
        $wpLang = explode('_', get_locale())[0];
        if (empty($pageLanguage)) $pageLanguage = $wpLang;

        $generated_page_id = SaidPluginsUtils::duplicate_post(
            $page_id,
            $page_title,
            'Generating ...',
            ($publish_after_generate === 'true' || $publish_after_generate === true) ? 'publish' : 'pending',
            array(
                'city' => $city
            )
        );

        $sendErrorAndRemovePage = function ($message) use ($generated_page_id) {
            wp_delete_post($generated_page_id, true);
            wp_send_json(array(
                'status' => 'error',
                'message' => $message
            ));
        };

        $secretKey = uniqid('said_secret_key_', true);
        update_post_meta($generated_page_id, 'said_secret_key', $secretKey);

        $said_plugins_page_templater_faq_json = get_option('said_plugins_page_templater_faq', '[]');
        $said_plugins_page_templater_faq = json_decode($said_plugins_page_templater_faq_json, true);

        $said_plugins_page_templater_selected_images_groups_json = get_option('said_plugins_page_templater_selected_images_groups', '[]');
        $said_plugins_page_templater_selected_images_groups = json_decode($said_plugins_page_templater_selected_images_groups_json, true);

        $page_content = get_post_field('post_content', $page_id);

        $data = array(
            'language' => $language,
            'pageLanguage' => $pageLanguage,
            'mode' => $mode,
            'city' => $city,
            'templateId' => $page_id,
            'templateName' => $page_title . ' (' . $page_title_addon . ')',
            'pageContent' => $page_content,
            'algorithm' => $algorithm,
            'questionsGroups' => $said_plugins_page_templater_faq,
            'imagesGroups' => $said_plugins_page_templater_selected_images_groups,
            'host' => $host,
            'pageId' => $generated_page_id,
            'secretKey' => $secretKey
        );
        $response = wp_remote_post(said_getUrl() . '/ask', array(
            'body' => array(
                'model' => 'page-templater',
                'queue' => $queue,
                'data' => json_encode($data)
            ),
            'headers' => array(
                'Authorization' => 'Bearer ' . $_POST["said_wp_token"],
                'x-csrf-token' => $_POST["said_wp_csrf"]
            )
        ));
        if (is_wp_error($response)) {
            $sendErrorAndRemovePage($response->get_error_message());
        } else {
            try {
                $response = json_decode(wp_remote_retrieve_body($response), true);
                if (empty($response['error'])) {
                    wp_send_json(array(
                        'status' => 'success',
                        'message' => 'Page created successfully.'
                    ));
                } else {
                    $sendErrorAndRemovePage($response['error']['message']);
                }
            } catch (Throwable $e) {
                $sendErrorAndRemovePage($e->getMessage());
            }
        }
    } else {
        $sendError('Invalid request.');
    }
}

add_action('wp_ajax_said_plugins_page_templater_ajax_create_page_from_template', 'said_plugins_page_templater_ajax_create_page_from_template');

function said_plugins_page_templater_ajax_update_page_language()
{
    $sendError = function ($message = 'Unable to update page language.') {
        wp_send_json(array(
            'status' => 'error',
            'message' => $message
        ));
    };

    $pageId = $_POST["page_id"];
    $language = $_POST["language"];

    if (isset($pageId) && isset($language)) {
        update_post_meta($pageId, 'said_page_language', $language);
        wp_send_json(array(
            'status' => 'success',
            'message' => 'Page language updated successfully.'
        ));
    } else {
        $sendError('Invalid request.');
    }
}

add_action('wp_ajax_said_plugins_page_templater_ajax_update_page_language', 'said_plugins_page_templater_ajax_update_page_language');

function said_plugins_page_templater_ajax_get_image($request)
{
    $sendError = function ($message = 'Unable to get image.') {
        wp_send_json(array(
            'status' => 'error',
            'message' => $message
        ));
    };

    $params = $request->get_params();
    $imageId = $params["image_id"];

    if (isset($imageId)) {
        $image = wp_get_attachment_image_src($imageId, 'full');
        if ($image) {
            wp_send_json(array(
                'status' => 'success',
                'message' => 'Image retrieved successfully.',
                'image_url' => $image[0]
            ));
        } else {
            $sendError('Image not found.');
        }
    } else {
        $sendError('Invalid request.');
    }
}

function said_plugins_page_templater_ajax_update_page_from_template($request)
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

    if (isset($pageId)
        && isset($secretKey)
        && isset($pageContent)
    ) {

        $saved_secret_key = get_post_meta($pageId, 'said_secret_key', true);
        if ($secretKey === $saved_secret_key) {
            $page = array(
                'ID' => $pageId,
                'post_content' => $pageContent,
            );
            wp_update_post($page);
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

function said_plugins_page_templater_ajax_remove_failed_generations_pages($request)
{
    $sendError = function ($message = 'Unable to remove failed generations pages.') {
        wp_send_json(array(
            'status' => 'error',
            'message' => $message
        ));
    };

    $params = $request->get_params();
    $said_wp_token = $params["said_wp_token"];
    $said_wp_csrf = $params["said_wp_csrf"];
    $date_from = $params["date_from"];
    $date_to = $params["date_to"];
    if (!empty($said_wp_token) && !empty($said_wp_csrf) && !empty($date_from) && !empty($date_to)) {
        $response = wp_remote_post(said_getUrl() . '/get-user-jobs', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $said_wp_token,
                'x-csrf-token' => $said_wp_csrf
            )
        ));
        if (is_wp_error($response)) {
            $sendError($response->get_error_message());
        } else {
            try {
                $jobs = [];
                $response = json_decode(wp_remote_retrieve_body($response), true);
                if (empty($response['error'])) {
                    foreach ($response['jobs'] as $job) {
                        if ($job['modelName'] === 'page-templater' && $job['state'] === 'failed') {
                            $jobCreatedAt = $job['createdAt'];
                            if ($jobCreatedAt >= $date_from && $jobCreatedAt <= $date_to) {
                                $jobs[] = $job;
                                $pageId = $job['data']['pageId'];
                                wp_delete_post($pageId, true);
                            }
                        }
                    }
                    wp_send_json(array(
                        'status' => 'success',
                        'message' => 'Failed generations pages removed successfully.',
                        'jobs' => $jobs
                    ));
                } else {
                    $sendError($response['error']['message']);
                }
            } catch (Throwable $e) {
                $sendError($e->getMessage());
            }
        }
    } else {
        $sendError('Invalid request.');
        
    }
}

add_action('rest_api_init', function () {
    register_rest_route('said-plugins/page-templater', '/update/', array(
        'methods' => 'POST',
        'callback' => 'said_plugins_page_templater_ajax_update_page_from_template',
        'permission_callback' => '__return_true'
    ));
    register_rest_route('said-plugins/page-templater', '/get-image/', array(
        'methods' => 'POST',
        'callback' => 'said_plugins_page_templater_ajax_get_image',
        'permission_callback' => '__return_true'
    ));
    register_rest_route('said-plugins/page-templater', '/remove-failed-generations-pages/', array(
        'methods' => 'POST',
        'callback' => 'said_plugins_page_templater_ajax_remove_failed_generations_pages',
        'permission_callback' => '__return_true'
    ));
});

function _said_plugins_page_templater_html_fragment_shortcode($name)
{
    if (is_admin()) return '';
    $said_plugins_page_templater_html_fragments_json = get_option('said_plugins_page_templater_html_fragments', '[]');
    $said_plugins_page_templater_html_fragments = json_decode($said_plugins_page_templater_html_fragments_json, true);
    $chosen_fragment = null;
    foreach ($said_plugins_page_templater_html_fragments as $fragment) {
        if ($fragment['name'] === $name) {
            $chosen_fragment = $fragment;
            break;
        }
    }
    if (empty($chosen_fragment)) return '';
    return $chosen_fragment['content'];
}

function said_plugins_page_templater_html_fragment_shortcode($atts)
{
    if (is_admin()) return '';
    $attr = shortcode_atts( array(
        'name' => null,
    ), $atts );
    $name = $attr['name'];
    if(empty($name)) return '';
    echo _said_plugins_page_templater_html_fragment_shortcode($name);
}
add_shortcode('said|_html_fragment', 'said_plugins_page_templater_html_fragment_shortcode');

function said_plugins_page_templater_cities_list_shortcode()
{
    echo _said_plugins_page_templater_html_fragment_shortcode('lista_miast');
}
add_shortcode('said|_cities_list', 'said_plugins_page_templater_cities_list_shortcode');