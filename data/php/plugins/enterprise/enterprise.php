<?php

function said_plugins_enterprise_shortcode($atts) {

    $attr = shortcode_atts( array(
        'id' => null,
    ), $atts );
    $id = $attr['id'];
    if (empty($id)) {
        return false;
    }

    $response = wp_remote_post(said_getUrl() . '/enterprise-info', array(
        'body' => array(
            'enterpriseId' => $id
        )
    ));
    if (is_wp_error($response)) {
        return false;
    } else {


        $saidStaticFilesUrl = said_getGuiUrl();

        wp_enqueue_script("said-plugins-script-enterprise-stripe", "https://js.stripe.com/v3/", array("said-plugins-script-translator"));
        wp_enqueue_script("said-plugins-script-enterprise-page", $saidStaticFilesUrl . "/scripts/enterprise-page.js", array("said-plugins-script-enterprise-stripe"));
        wp_enqueue_style("said-plugins-style-enterprise-page", $saidStaticFilesUrl . "/style/enterprise-page.css");
        wp_enqueue_script("said-plugins-script-user-panel", $saidStaticFilesUrl . "/scripts/user-panel.js", array("said-plugins-script-enterprise-page"));
        wp_enqueue_style("said-plugins-style-user-panel", $saidStaticFilesUrl . "/style/user-panel.css");
        wp_enqueue_script("said-plugins-script-session", $saidStaticFilesUrl . "/scripts/session.js", array("said-plugins-script-user-panel"));
        wp_enqueue_style("said-plugins-style-session", $saidStaticFilesUrl . "/style/session.css");

        $responseResult = wp_remote_retrieve_body($response);
        $enterpriseInfo = json_decode($responseResult, true);
        $enterpriseName = $enterpriseInfo['name'];

        wp_enqueue_style(
            "said-plugins-style-enterprise-" . $enterpriseName, $saidStaticFilesUrl . "/style/enterprises/" . $enterpriseName . "/index.css"
        );
        wp_enqueue_script(
            "said-plugins-script-enterprise-" . $enterpriseName, $saidStaticFilesUrl . "/scripts/enterprises/" . $enterpriseName . "/index.js", 
            array("said-plugins-script-user-panel")
        );
        
        echo '<div id="said-session-panel" data-said-page-type="enterprise" data-said-page-data="' . $enterpriseInfo['enterpriseId'] . '"></div>';

    }

}

add_shortcode( 'said|-enterprice', 'said_plugins_enterprise_shortcode');