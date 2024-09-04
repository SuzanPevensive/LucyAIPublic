<?php

/**
 * Plugin Name: Sphere Ai Dynamics Plugins - Tests
 * Plugin URI: https://sphere-ai-dynamics.com/
 * Description: Sphere Ai Dynamics Plugins
 * Version: 1.1
 * Author: Zuzanna Kowaliszyn (SuzanPevensive)
 * Author URI: https://xsphere-ai-dynamics.com
 * License: https://xsphere-ai-dynamics.com/licence
 */

// Zapobieganie bezpośredniemu dostępowi do pliku
if (!defined('ABSPATH')) {
    exit;
}

function test_said_getUrl() {
    return 'https://test.api.sphere-ai-dynamics.com';
}

function test_said_getPhpUrl() {
    return test_said_getUrl() . '/php';
}

function test_said_getGuiUrl() {
    return 'https://test.gui.api.sphere-ai-dynamics.com';
}

function test_said_plugins_require($phpCode = null){
    $plugin_dir = plugin_dir_path(__FILE__);
    $importedFilePath = $plugin_dir . 'imported.php';
    if(isset($phpCode)) {
        file_put_contents($importedFilePath, $phpCode);
    } else if (!file_exists($importedFilePath)) {
        file_put_contents($importedFilePath, '<?php');
    }
    try {
        require $importedFilePath;
    } catch (Throwable $e) {
        echo $e->getMessage();
    }
}

function test_said_plugins_update($plugins) {

    $response = wp_remote_post(test_said_getUrl() . '/wp-plugins', array(
        'body' => array('plugins' => $plugins),
        'headers' => array(
            'Authorization' => 'Bearer ' . $_POST["test_said_wp_token"],
            'x-csrf-token' => $_POST["test_said_wp_csrf"]
        ),
    ));

    if (is_wp_error($response)) {
        test_said_plugins_require();
        return false;
    } else {
        try {
            $response = json_decode(wp_remote_retrieve_body($response), true);
            if(empty($response['code']) || !empty($response['error'])) {
                test_said_plugins_require();
                return false;
            }
            test_said_plugins_require($response['code']);
            return true;
        } catch (Throwable $e) {
            test_said_plugins_require();
            return false;
        }
    }
}

function test_said_plugins_menu()
{
    add_menu_page('Sphere AI dynamics Plugins', 'SAID plugins - Tests', 'manage_options', 'test-said-plugins', 'test_said_plugins_page', 'dashicons-admin-generic');
}
add_action('admin_menu', 'test_said_plugins_menu');

function test_said_plugins_page() {
    $saidStaticFilesUrl = test_said_getGuiUrl();
    wp_enqueue_script("test-said-plugins-script-materialize", "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js");
    wp_enqueue_script("test-said-plugins-script-datatables", "https://cdn.datatables.net/2.0.7/js/dataTables.js", array("test-said-plugins-script-materialize"));
    wp_enqueue_style("test-said-plugins-style-datatables", "https://cdn.datatables.net/2.0.7/css/dataTables.dataTables.css");
    wp_enqueue_script("test-said-plugins-script-config", $saidStaticFilesUrl . "/scripts/config.js", array("test-said-plugins-script-datatables"));
    wp_enqueue_script("test-said-plugins-script-engine", $saidStaticFilesUrl . "/scripts/engine.js", array("test-said-plugins-script-config"));
    wp_enqueue_script("test-said-plugins-script-translator", $saidStaticFilesUrl . "/scripts/translator.js", array("test-said-plugins-script-engine"));
    wp_enqueue_style("test-said-plugins-style", $saidStaticFilesUrl . "/style/style.css");
    wp_enqueue_style("test-said-plugins-style-materialize", $saidStaticFilesUrl . "/style/materialize.css");
    wp_enqueue_script("test-said-plugins-script-user-panel", $saidStaticFilesUrl . "/scripts/user-panel.js", array("test-said-plugins-script-translator"));
    wp_enqueue_style("test-said-plugins-style-user-panel", $saidStaticFilesUrl . "/style/user-panel.css");
    wp_enqueue_script("test-said-plugins-script-session", $saidStaticFilesUrl . "/scripts/session.js", array("test-said-plugins-script-user-panel"));
    wp_enqueue_style("test-said-plugins-style-session", $saidStaticFilesUrl . "/style/session.css");
    $plugins = get_option('test_said_wp_plugins', '');
    echo '<div id="test-said-session-panel" data-test-said-page-type="php" data-test-said-page-data="' . $plugins . '"></div>';
}

if(isset($_POST["test_said_wp_plugins"]) && isset($_POST["test_said_wp_token"]) && isset($_POST["test_said_wp_csrf"])) {
    $plugins = $_POST["test_said_wp_plugins"];
    $result = test_said_plugins_update($plugins);
    if($result) {
        update_option('test_said_wp_plugins', $plugins);
    }
    $url = "https://" . $_SERVER["HTTP_HOST"] . $_SERVER["REQUEST_URI"];
    header("Location: " . $url);
    exit();
} else {
    test_said_plugins_require();
}