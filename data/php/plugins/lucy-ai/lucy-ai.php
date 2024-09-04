<?php



function said_plugins_lucy_ai_wp_script_init()
{
    if (!get_role("translate_page")) {
        add_role("translate_page", "Lucy AI Translator",
            array(
                "translate_page" => true
            )
        );
    }
    if (!get_role("said_lucy_ai_web_dev")) {
        add_role("said_lucy_ai_web_dev", "Lucy AI Web Developer",
            array(
                "said_lucy_ai_web_dev" => true
            )
        );
    }
    $saidStaticFilesUrl = said_getGuiUrl();
    wp_enqueue_script("said-plugins-script-lucy-ai", said_getPhpUrl() . '/plugins/lucy-ai/lucy-ai.js', array("said-plugins-script-config"));
//     if (is_admin()) {
//         wp_enqueue_script("lucy-ai-script-descriptor", $saidStaticFilesUrl . "/scripts/descriptor.js", array("said-plugins-script-engine"));
//     }
    if (current_user_can("translate_page")) {
        wp_enqueue_style("lucy-ai-style-material-icons", "https://fonts.googleapis.com/icon?family=Material+Icons");
        wp_enqueue_script("lucy-ai-script-translator-admin", $saidStaticFilesUrl . "/scripts/translator-admin.js", array("said-plugins-script-translator"));
    }
//     if (current_user_can("said_lucy_ai_web_dev")) {
//         wp_enqueue_style("said-lucy-ai-web-dev-style", $saidStaticFilesUrl . "/style/web-dev.css");
//         wp_enqueue_script("said-lucy-ai-script-web-dev-vanilla-context-menu", "https://unpkg.com/vanilla-context-menu@1.4.1/dist/vanilla-context-menu.js");
//         wp_enqueue_script("said-lucy-ai-script-web-dev-script", $saidStaticFilesUrl . "/scripts/web-dev.js", array("said-plugins-script-engine"));
//         wp_enqueue_script("said-lucy-ai-script-divi-styler", $saidStaticFilesUrl . "/scripts/divi-styler.js", array("said-plugins-script-engine"));
//     }
}

add_action("init", "said_plugins_lucy_ai_wp_script_init");