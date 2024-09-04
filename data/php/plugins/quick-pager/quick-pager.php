<?php

function said_plugins_quick_pager_shortcode($atts) {

    $attr = shortcode_atts( array(
        'site' => null,
        'page' => null,
        'lang' => null,
    ), $atts );

    $site = $attr['site'];
    $page = $attr['page'];
    $lang = $attr['lang'] ?? '*';

    if(empty($site) || empty($page)) {
        return false;
    }

    $siteUrl = said_getPhpUrl() . '/plugins/quick-pager/sites/' . $site;
    $pageUrl = $siteUrl . '/pages/' . $page;

    $response = wp_remote_get(said_getUrl() . '/page-info/' . $site . '/' . $page);
    if (is_wp_error($response)) {
        return false;
    } else {
        $pageInfoJsonString = wp_remote_retrieve_body($response);
        $pageInfo = json_decode($pageInfoJsonString, true);

        wp_enqueue_script("said-plugins-quick-pager-script", $pageUrl . "/script.js", array("said-plugins-script-engine"));
        wp_localize_script("said-plugins-quick-pager-script", "said_plugins_quick_pager_wp_config_object", array(
            "pageUrl" => $pageUrl,
            "pageInfo" => $pageInfo,
        ));
        wp_enqueue_style("said-plugins-quick-pager-style", $pageUrl . "/style.css");

        $response = wp_remote_get($siteUrl . '/template.html');
        if (is_wp_error($response)) {
            return false;
        } else {
            $template = wp_remote_retrieve_body($response);
            $response = wp_remote_get($siteUrl . '/translations.json');
            if (is_wp_error($response)) {
                return false;
            } else {
                $translationsJsonString = wp_remote_retrieve_body($response);
                $translations = json_decode($translationsJsonString, true)[$lang];
                $response = wp_remote_get($pageUrl . '/page.html');
                if (is_wp_error($response)) {
                    return false;
                } else {
                    $page = wp_remote_retrieve_body($response);
                    $page = str_replace('{{site-url}}', $siteUrl, $page);
                    $page = str_replace('{{page-url}}', $pageUrl, $page);
                    $page = preg_replace_callback('/{{_t:(.+?)}}/', function($matches) use ($translations) {
                        $pathSteps = array_map('trim', explode(':', $matches[1]));
                        $value = $translations;
                        foreach ($pathSteps as $pathStep) {
                            $value = $value[$pathStep];
                            if (empty($value)) break;
                        }
                        return $value ?? '';
                    }, $page);
                    $template = str_replace('{{page}}', $page, $template);
                    echo $template;
                }
            }
        }
    }
}

add_shortcode( 'said|-quick-pager', 'said_plugins_quick_pager_shortcode');