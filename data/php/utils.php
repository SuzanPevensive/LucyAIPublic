<?php

class SaidPluginsUtils
{

    /**
     * @description
     * Send request to server
     * @param string $method - request method
     * @param string $url - request url
     * @param array $data - request data
     * @param array $headers - request headers
     * @return string|null
     */
    static public function request(string $method, string $url, array $data = [], array $headers = []): ?string
    {
        $headers = array_merge($headers, [
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Accept' => 'application/json',
        ]);
        $headers = array_map(function ($key, $value) {
            return "$key: $value";
        }, array_keys($headers), $headers);
        $options = [
            'http' => [
                'header' => implode("\r\n", $headers),
                'method' => $method,
                'content' => http_build_query($data),
            ],
        ];
        $context = stream_context_create($options);
        $result = file_get_contents($url, false, $context);
        if ($result === false) {
            return null;
        }
        return $result;
    }

    /**
     * @description
     *  Get translations from server
     * @return array
     */
    static public function getTranslations(): array
    {

        $wpLang = explode('_', get_locale())[0];

        $response = wp_remote_post(said_getUrl() . '/translate', array(
            'body' => array('langTo' => $wpLang )
        ));

        if (is_wp_error($response)) {
            return [];
        } else {
            try {
                $response = json_decode(wp_remote_retrieve_body($response), true);
                if(empty($response) || !empty($response['error'])) {
                    return [];
                }
                return $response['translatedSentences'];
            } catch (Throwable $e) {
                return [];
            }
        }

    }

    /**
     * @description duplicate_post
     *  Duplicate post with all post meta and taxonomies.
     * @param int $post_id - post ID to duplicate
     * @param string|null $post_title - new post title
     * @return int
     */
    static function duplicate_post(
        int $post_id,
        string $post_title = null,
        string $post_content = null,
        string $post_status = 'pending',
        $post_meta_tokens = []
    ): int
    {
        $old_post = get_post($post_id);
        if (!$old_post) {
            // Invalid post ID, return early.
            return 0;
        }

        $title = $post_title ?? $old_post->post_title;
        $content = $post_content ?? $old_post->post_content;

        // Create new post array.
        $new_post = [
            'post_title'  => $title,
            'post_name'   => sanitize_title($title),
            'post_content' => $content,
            'post_status' => $post_status,
            'post_type'   => $old_post->post_type,
        ];

        // Insert new post.
        $new_post_id = wp_insert_post($new_post);

        // Copy post meta.
        $post_meta = get_post_custom($post_id);
        foreach ($post_meta as $key => $values) {
            foreach ($values as $value) {
                $metaValue = maybe_unserialize($value);
                foreach ($post_meta_tokens as $token => $tokenValue) {
                    $metaValue = str_replace('[' . $token . ']', $tokenValue, $metaValue);
                }
                add_post_meta($new_post_id, $key, $metaValue);
            }
        }

        // Copy post taxonomies.
        $taxonomies = get_post_taxonomies($post_id);
        foreach ($taxonomies as $taxonomy) {
            $term_ids = wp_get_object_terms($post_id, $taxonomy, ['fields' => 'ids']);
            wp_set_object_terms($new_post_id, $term_ids, $taxonomy);
        }

        // Return new post ID.
        return $new_post_id;
    }

    /**
     * @description
     *  If method receives only 1 argument, it will return first argument if it is not null, this is only useful
     *      if valueParser is provided.
     *  If method receives at least 2 arguments, it will return first argument if it is not null,
     *      otherwise it will return second argument.
     *  If method receives more than 2 arguments, it will try get first argument value of key equal to second argument,
     *      if it is not null, it will return it, otherwise it will return third argument.
     * @param array|mixed $value - value to be checked or array
     * @param mixed $subValueOrDef - key of value to be checked or default value
     * @param mixed $def - default value
     * @param callable|null $valueParser - function to parse value
     * @param callable|null $defParser - function to parse default value
     * @return mixed|null
     */
    static public function valOrDef(
        mixed     $value,
        mixed     $subValueOrDef,
        mixed     $def = null,
        ?callable $valueParser = null,
        ?callable $defParser = null
    ): mixed
    {
        $valueParser = $valueParser ?? function ($value) {
            return $value;
        };
        $defParser = $defParser ?? $valueParser;
        $returnValue = $value;
        if (func_num_args() > 2) {
            $returnValue = $value[$subValueOrDef];
        }
        return isset($returnValue) ? $valueParser($returnValue) : $defParser($def);
    }

    /**
     * @description
     *  write first argument to console.log file
     * @param mixed $text - text to be logged
     * @param bool $file_append - if true, text will be appended to file, otherwise file will be overwritten
     * @return void
     */
    static public function log(mixed $text, bool $file_append = true)
    {
        $plugin_dir = plugin_dir_path(__FILE__);
        file_put_contents($plugin_dir . 'console.log', $text . PHP_EOL, $file_append ? FILE_APPEND : null);
    }

    /**
     * @description
     *  Parse value to boolean
     * @param mixed $value - value to be parsed
     * @return bool
     */
    static public function boolParse(mixed $value): bool
    {
        return $value === "true" || $value === true || $value === 1 || $value === "1";
    }

}

function said_plugins_init() {
    $saidStaticFilesUrl = said_getGuiUrl();
    wp_enqueue_script("said-plugins-script-materialize", "https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js", array("jquery"));
    wp_enqueue_script("said-plugins-script-datatables", "https://cdn.datatables.net/2.0.7/js/dataTables.min.js", array("said-plugins-script-materialize"));
    wp_enqueue_style("said-plugins-style-datatables", "https://cdn.datatables.net/2.0.7/css/dataTables.dataTables.min.css");
    wp_enqueue_script("said-plugins-script-config", $saidStaticFilesUrl . "/scripts/config.js", array("said-plugins-script-datatables"));
    wp_enqueue_script("said-plugins-script-engine", $saidStaticFilesUrl . "/scripts/engine.js", array("said-plugins-script-config"));
    wp_enqueue_script("said-plugins-script-translator", $saidStaticFilesUrl . "/scripts/translator.js", array("said-plugins-script-engine"));
    wp_enqueue_style("said-plugins-style", $saidStaticFilesUrl . "/style/style.css");
    wp_enqueue_style("said-plugins-style-materialize", $saidStaticFilesUrl . "/style/materialize.css");
}

add_action("init", "said_plugins_init");