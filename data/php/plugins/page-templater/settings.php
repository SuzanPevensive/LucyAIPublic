<?php

add_action( 'admin_enqueue_scripts', function( $hook_suffix ) {
    wp_enqueue_media();
});

// Add custom menu option
function said_plugins_page_templater_options_menu() {
    add_menu_page(
        'Page templater - Lucy AI',
        'Page templater {{test-name-postfix}}',
        'manage_options',
        'said-plugins-page-templater',
        'said_plugins_page_templater_options_page',
        'dashicons-admin-generic',
    );
}
add_action('admin_menu', 'said_plugins_page_templater_options_menu');

// Render custom options page
function said_plugins_page_templater_options_page() {
    $translations = SaidPluginsUtils::getTranslations();
    ?>
    <div class="wrap said-materialize">
        <div class="card-panel lime lighten-5" id="said-plugins-page-templater-control-panel">
            <h5 id="said-plugins-page-templater-control-panel-header">
                <?php echo $translations['said-plugins-page-templater-control-panel-label'] ?? 'Control panel'; ?>
            </h5>
            <button type="button" class="btn orange lighten-4" id="said-plugins-page-templater-generate-button">
                <?php echo $translations['said-plugins-page-templater-generate-button'] ?? 'Generate from template'; ?>
            </button>
            <button type="button" class="btn orange lighten-2" id="said-plugins-page-templater-mirror-queue-clear-button">
                <?php echo $translations['said-plugins-page-templater-control-panel-queue-clear-button'] ?? 'Clear queue'; ?>
            </button>
            <button type="button" class="btn red lighten-2" id="said-plugins-page-templater-remove-failed-button">
                <?php echo $translations['said-plugins-page-templater-remove-failed-button'] ?? 'Remove failed'; ?>
            </button>
        </div>
        <form method="post" action="options.php">
            <?php settings_fields('said_plugins_page_templater_options_group'); ?>
            <?php do_settings_sections('said_plugins_page_templater_options_section'); ?>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

// Initialize custom options
function said_plugins_page_templater_options_init() {

    register_setting(
        'said_plugins_page_templater_options_group',
        'said_plugins_page_templater_page_template_mirror'
    );
    register_setting(
        'said_plugins_page_templater_options_group',
        'said_plugins_page_templater_default_language'
    );
    register_setting(
        'said_plugins_page_templater_options_group',
        'said_plugins_page_templater_default_sub_mode'
    );
    register_setting(
        'said_plugins_page_templater_options_group',
        'said_plugins_page_templater_publish_after_generate'
    );
    register_setting(
        'said_plugins_page_templater_options_group',
        'said_plugins_page_templater_selected_images_groups'
    );
    register_setting(
        'said_plugins_page_templater_options_group',
        'said_plugins_page_templater_faq'
    );
    register_setting(
        'said_plugins_page_templater_options_group',
        'said_plugins_page_templater_html_fragments'
    );
    register_setting(
        'said_plugins_page_templater_options_group',
        'said_plugins_page_templater_algorithm'
    );

    $translations = SaidPluginsUtils::getTranslations();

    // Add settings section
    add_settings_section(
        'said_plugins_page_templater_options_section',
        '<h4>' . ($translations['said-plugins-page-templater-custom-options-settings'] ?? 'Page templater settings') . '</h4>',
        'said_plugins_page_templater_options_section_callback',
        'said_plugins_page_templater_options_section'
    );

    add_settings_field(
        'said_plugins_page_templater_page_template_mirror',
        $translations['said-plugins-page-templater-mirror'] ?? 'Default query',
        'said_plugins_page_templater_said_plugins_page_templater_mirror_callback',
        'said_plugins_page_templater_options_section',
        'said_plugins_page_templater_options_section'
    );

    add_settings_field(
        'said_plugins_page_templater_default_language',
        $translations['said-plugins-page-templater-default-language'] ?? 'Default language',
        'said_plugins_page_templater_said_plugins_page_templater_default_language_callback',
        'said_plugins_page_templater_options_section',
        'said_plugins_page_templater_options_section'
    );
    add_settings_field(
        'said_plugins_page_templater_default_sub_mode',
        $translations['said-plugins-page-templater-default-sub-mode'] ?? 'Default writing mode',
        'said_plugins_page_templater_said_plugins_page_templater_default_sub_mode_callback',
        'said_plugins_page_templater_options_section',
        'said_plugins_page_templater_options_section'
    );
    add_settings_field(
        'said_plugins_page_templater_publish_after_generate',
        $translations['said-plugins-page-templater-publish-after-generating'] ?? 'Publish after generating',
        'said_plugins_page_templater_said_plugins_page_templater_publish_after_generate_callback',
        'said_plugins_page_templater_options_section',
        'said_plugins_page_templater_options_section'
    );
    add_settings_field(
        'said_plugins_page_templater_faq',
        $translations['said-plugins-page-templater-faq'] ?? 'FAQ',
        'said_plugins_page_templater_said_plugins_page_templater_faq_callback',
        'said_plugins_page_templater_options_section',
        'said_plugins_page_templater_options_section'
    );
    add_settings_field(
        'said_plugins_page_templater_selected_images_groups',
        $translations['said-plugins-page-templater-selected-images'] ?? 'Selected images',
        'said_plugins_page_templater_said_plugins_page_templater_selected_images_groups_callback',
        'said_plugins_page_templater_options_section',
        'said_plugins_page_templater_options_section'
    );
    add_settings_field(
        'said_plugins_page_templater_html_fragments',
        $translations['said-plugins-page-templater-html-fragments'] ?? 'Html fragments',
        'said_plugins_page_templater_html_fragments_callback',
        'said_plugins_page_templater_options_section',
        'said_plugins_page_templater_options_section'
    );
    add_settings_field(
        'said_plugins_page_templater_algorithm',
        $translations['said-plugins-page-templater-algorithm'] ?? 'Default algorithm',
        'said_plugins_page_templater_algorithm_callback',
        'said_plugins_page_templater_options_section',
        'said_plugins_page_templater_options_section'
    );
}
add_action('admin_init', 'said_plugins_page_templater_options_init');

// Section callback
function said_plugins_page_templater_options_section_callback() {
    echo '';
}

function said_plugins_page_templater_said_plugins_page_templater_default_language_callback() {
    $selected_language = get_option('said_plugins_page_templater_default_language', explode('_', get_locale())[0]);
    ?>
        <div class="input-field">
            <input type="text" name="said_plugins_page_templater_default_language" value="<?php echo esc_attr($selected_language); ?>" class="autocomplete" />
        </div>
    <?php
}


function said_plugins_page_templater_said_plugins_page_templater_mirror_callback() {
    $mirrors = get_option('said_plugins_page_templater_mirrors', []);
    $selected_mirror = get_option('said_plugins_page_templater_page_template_mirror', '');
    ?>
    <div>
        <div class="input-field">
            <select name="said_plugins_page_templater_page_template_mirror">
                <?php foreach ($mirrors as $key => $value) { ?>
                    <option value="<?php echo esc_attr($key); ?>" <?php echo $selected_mirror === $key ? 'selected' : ''; ?>>
                        <?php echo esc_html($value); ?>
                    </option>
                <?php } ?>
            </select>
        </div>
    </div>
    <?php
}

function said_plugins_page_templater_said_plugins_page_templater_default_sub_mode_callback() {
    $said_plugins_page_templater_default_sub_mode = get_option('said_plugins_page_templater_default_sub_mode', 'professional');
    ?>
        <div class="input-field">
            <select name="said_plugins_page_templater_default_sub_mode" data-selected-sub-mode="<?php echo esc_attr($said_plugins_page_templater_default_sub_mode); ?>"></select>
        </div>
    <?php
}

function said_plugins_page_templater_said_plugins_page_templater_publish_after_generate_callback() {
    $said_plugins_page_templater_publish_after_generate = get_option('said_plugins_page_templater_publish_after_generate', 'off');
    ?>
        <div class="switch">
            <label>
                <input type="checkbox" name="said_plugins_page_templater_publish_after_generate" <?php echo $said_plugins_page_templater_publish_after_generate === 'on' ? 'checked' : '' ?>>
                <span class="lever"></span>
            </label>
        </div>
    <?php
}

function said_plugins_page_templater_said_plugins_page_templater_faq_callback() {

    $translations = SaidPluginsUtils::getTranslations();

    $said_plugins_page_templater_faq = get_option('said_plugins_page_templater_faq', "[]");
    ?>
        <button type="button" class="button" id="said-plugins-page-templater-faq-group-button">
            <?php echo $translations['said-plugins-page-templater-faq-group-button'] ?? 'Add question group'; ?>
        </button>
        <input
            id="said-plugins-page-templater-faq-input"
            type="hidden"
            name="said_plugins_page_templater_faq"
            value="<?php echo esc_attr($said_plugins_page_templater_faq); ?>" />
        <button type="button" class="button" id="said-plugins-page-templater-faq-toggle-button">
            <?php echo $translations['said-plugins-page-templater-faq-toggle-button'] ?? 'Show/Hide FAQ'; ?>
        </button>
        <div id="said-plugins-page-templater-faq-container" class="collapsed">
        </div>
    <?php
}

function said_plugins_page_templater_said_plugins_page_templater_selected_images_groups_callback() {

    $translations = SaidPluginsUtils::getTranslations();

    $said_plugins_page_templater_selected_images_groups_json = get_option('said_plugins_page_templater_selected_images_groups', '[]');

    ?>
        <button type="button" class="button" id="said-plugins-page-templater-add-group-button">
            <?php echo $translations['said-plugins-page-templater-add-group'] ?? 'Add Group'; ?>
        </button>
        <input
            type="hidden"
            name="said_plugins_page_templater_selected_images_groups"
            value="<?php echo esc_attr($said_plugins_page_templater_selected_images_groups_json); ?>" />
        <button type="button" class="button" id="said-plugins-page-templater-images-groups-toggle-button">
            <?php echo $translations['said-plugins-page-templater-images-groups-toggle-button'] ?? 'Show/Hide images groups'; ?>
        </button>
        <div id="said-plugins-page-templater-images-groups-container" class="collapsed">
        </div>
    <?php
}

function said_plugins_page_templater_html_fragments_callback() {

    $translations = SaidPluginsUtils::getTranslations();

    $fragments = get_option('said_plugins_page_templater_html_fragments', '[]');
    ?>
        <button type="button" class="button" id="said-plugins-page-templater-add-html-fragment-button">
            <?php echo $translations['said-plugins-page-templater-add-html-fragment'] ?? 'Add html fragment'; ?>
        </button>
        <input
            id="said-plugins-page-templater-html-fragments-input"
            type="hidden"
            name="said_plugins_page_templater_html_fragments"
            value="<?php echo esc_attr($fragments); ?>" />
        <button type="button" class="button" id="said-plugins-page-templater-html-fragments-toggle-button">
            <?php echo $translations['said-plugins-page-templater-html-fragments-toggle-button'] ?? 'Show/Hide HTML fragments'; ?>
        </button>
        <div id="said-plugins-page-templater-html-fragments-container" class="collapsed">
        </div>
    <?php
}

function said_plugins_page_templater_algorithm_callback() {

    $translations = SaidPluginsUtils::getTranslations();

    $algorithms = get_option('said_plugins_page_templater_algorithms', []);
    $algorithm = get_option('said_plugins_page_templater_algorithm', '');
    ?>
        <select name="said_plugins_page_templater_algorithm">
            <?php foreach ($algorithms as $key => $value) { ?>
                <option value="<?php echo esc_attr($value); ?>" <?php echo $algorithm === $value ? 'selected' : ''; ?>>
                    <?php echo esc_html($value); ?>
                </option>
            <?php } ?>
        </select>
        <script
                id="said-plugins-page-templater-script-settings"
                src="<?php echo said_getPhpUrl() . '/plugins/page-templater/settings.js'; ?>"
        ></script>
    <?php
}