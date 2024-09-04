<?php

function said_plugins_quick_pager_theme() {
    $theme_slug = 'said-quick-pager-theme';
    $theme_exists = wp_get_theme($theme_slug)->exists();

    if (!$theme_exists) {
        // Create theme directory
        $theme_dir = WP_CONTENT_DIR . '/themes/' . $theme_slug;
        if (!is_dir($theme_dir)) {
            mkdir($theme_dir, 0755, true);
        }

        $functions_php_content = '<?php
        function said_quick_pager_theme_settings( $wp_customize ) {
            $wp_customize->add_section("said-quick-pager-theme-section", array(
                "title"    => "Said Quick Pager Theme Settings",
                "priority" => 30,
            ));

            $wp_customize->add_setting("said-quick-pager-theme-description", array(
                "default"   => "",
                "transport" => "refresh",
            ));

            $wp_customize->add_setting("said-quick-pager-theme-keywords", array(
                "default"   => "",
                "transport" => "refresh",
            ));

            $wp_customize->add_control(new WP_Customize_Control($wp_customize, "said-quick-pager-theme-description-control", array(
                "label"    => "Meta Description",
                "section"  => "said-quick-pager-theme-section",
                "settings" => "said-quick-pager-theme-description",
            )));

            $wp_customize->add_control(new WP_Customize_Control($wp_customize, "said-quick-pager-theme-keywords-control", array(
                "label"    => "Meta Keywords",
                "section"  => "said-quick-pager-theme-section",
                "settings" => "said-quick-pager-theme-keywords",
            )));
        }
        add_action("customize_register", "said_quick_pager_theme_settings");
        ';

        // Add functions.php
        file_put_contents($theme_dir . '/functions.php', $functions_php_content);

        $head_php_content = '
        <!DOCTYPE html>
        <html <?php language_attributes(); ?>>
        <head>
            <meta charset="<?php bloginfo("charset"); ?>">
            <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0, user-scalable=no">
            <meta name="description" content="<?php echo esc_attr(get_theme_mod("said-quick-pager-theme-description")); ?>">
            <meta name="keywords" content="<?php echo esc_attr(get_theme_mod("said-quick-pager-theme-keywords")); ?>">
            <meta name="author" content="Twoje imię">
            <title><?php wp_title("|", true, "right"); ?></title>
            <?php wp_head(); ?>
        </head>
        <body <?php body_class(); ?>>
        ';

        // Add header.php
        file_put_contents($theme_dir . '/header.php', $head_php_content);

        // Add index.php
        $index_php_content = '<?php
        get_header();
        if ( have_posts() ) :
            while ( have_posts() ) : the_post();
                the_content();
            endwhile;
        else :
            echo \'No content found\';
        endif;
        get_footer();';
        
        file_put_contents($theme_dir . '/index.php', $index_php_content);

        // Add style.css
        $style_css_content = '/*
        Theme Name: Said quick pager theme
        Theme URI: http://sphere-ai-dynamics.com
        Author: Zuzanna Kowaliszyn (Suzan Pevensive)
        Author URI: http://sphere-ai-dynamics.com
        Description: Theme for Said Quick Pager plugin
        Version: 1.0
        License: GNU General Public License v2 or later
        License URI: http://www.gnu.org/licenses/gpl-2.0.html
        Text Domain: said-quick-pager-theme
        */

        * {
            overflow: hidden;
        }

        #header, #header + hr, #footer {
            display: none;
        }
            
        ';
        
        file_put_contents($theme_dir . '/style.css', $style_css_content);

        // Switch to the new theme
        switch_theme($theme_slug);
    }
}

add_action("init", "said_plugins_quick_pager_theme");