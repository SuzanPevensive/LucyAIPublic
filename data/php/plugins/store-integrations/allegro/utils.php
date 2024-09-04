<?php

function allegro_request($url, $method, $body = null, $authorization = true)
{
    $headers = array(
        'Accept' => 'application/vnd.allegro.public.v1+json',
        'Content-Type' => 'application/vnd.allegro.public.v1+json'
    );
    if ($authorization === true) {
        $access_token = getAllegroAccessToken();
        $headers['Authorization'] = 'Bearer ' . $access_token;
    } else if (isset($authorization)) {
        $headers['Authorization'] = $authorization;
    }
    $response = wp_remote_allegro_request($url, [
        'method' => $method,
        'headers' => $headers,
        'body' => $body
    ]);
    if (is_wp_error($response)) {
        SaidPluginsUtils::log("!error: " . json_encode($response));
        return $response;
    }
    return json_decode(wp_remote_retrieve_body($response), true);
}