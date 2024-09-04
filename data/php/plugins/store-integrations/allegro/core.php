<?php

function getAllegroClientId()
{
    return '26442efd19d94ed5bd3b67a02d1b3685';
}

function getAllegroSecret()
{
    return '9oo63aDzEebk1ggM2tTG7q6TLtHYEmnOrWK9lc0z4Xmcx3n9hCI6USlI5p7Nk4hd';
}

function getAllegroBase64Authorization()
{
    $client_id = getAllegroClientId();
    $allegro_secret = getAllegroSecret();
    return 'Basic ' . base64_encode("$client_id:$allegro_secret");
}

function getAllegroLogoutQueryPart()
{
    return "&logout=true";
}

function getAllegroAutoUpdateQueryPart($value)
{
    $value = $value ? "true" : "false";
    return "&allegro_auto_update=$value";
}

function getAllegroRedirectUrl()
{
    $actual_link = "https://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
    $actual_link = str_replace(getAllegroLogoutQueryPart(), "", $actual_link);
    $actual_link = str_replace('&said_update=true', "", $actual_link);
    $actual_link = preg_replace('/&(code|delivery-options|allegro_auto_update)=[^&]+/', "", $actual_link);
    return $actual_link;
}

function getAllegroAuthUrl()
{
    $client_id = getAllegroClientId();
    $redirect_uri = urlencode(getAllegroRedirectUrl());
    return "https://allegro.pl/auth/oauth/authorize?response_type=code&client_id={$client_id}&redirect_uri={$redirect_uri}";
}

function getAllegroAccessTokenUrl($code, $refresh_token = null)
{
    $redirect_uri = urlencode(getAllegroRedirectUrl());
    $grantType = isset($refresh_token) ? "refresh_token&refresh_token=$refresh_token" : "authorization_code&code=$code";
    return "https://allegro.pl/auth/oauth/token?grant_type=$grantType&redirect_uri=$redirect_uri";
}

function getAllegroAccessToken()
{
    $access_token = get_option('allegro_access_token');
    $access_token_date = get_option('allegro_access_token_date');
    if (time() >= $access_token_date - 60) {
        SaidPluginsUtils::log("3?: $access_token_date");
        $refresh_token = get_option('allegro_refresh_token');
        if (!isset($refresh_token)) {
            return null;
        }
        $response = allegro_request(getAllegroAccessTokenUrl(null, $refresh_token), 'POST', null, getAllegroBase64Authorization());
        if (is_wp_error($response)) {
            SaidPluginsUtils::log("!error: " . json_encode($response));
            return;
        }
        $access_token = $response["access_token"];
        update_option('allegro_access_token', $access_token);
        update_option('allegro_refresh_token', $response["refresh_token"]);
        update_option('allegro_access_token_date', time() + $response["expires_in"]);
        return $access_token;
    }
    return $access_token;
}

function getAllegroOffers()
{
    $allegroOffers = [];
    $allegroResponseOffers = null;
    $allegroResponseOffersOffset = 0;
    $allegroResponseOffersStep = 1000;
    while (!isset($allegroResponseOffers) || count($allegroResponseOffers) > 0) {
        $allegroResponseOffers =
            allegro_request(
                "https://api.allegro.pl/sale/offers?limit=$allegroResponseOffersStep&offset=$allegroResponseOffersOffset",
                'GET'
            );
        $allegroResponseOffers = $allegroResponseOffers['offers'];
        $allegroOffers = array_merge($allegroOffers, $allegroResponseOffers);
        $allegroResponseOffersOffset += $allegroResponseOffersStep;
    }
    return $allegroOffers;
}

function getAllegroOffer($offerId)
{
    return allegro_request("https://api.allegro.pl/sale/product-offers/$offerId", 'GET') ?: [];
}

function getAllegroProduct($productId)
{
    return allegro_request("https://api.allegro.pl/sale/products/$productId", 'GET') ?: [];
}