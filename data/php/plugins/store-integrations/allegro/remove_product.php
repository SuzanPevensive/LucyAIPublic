<?php
function delete_product_from_allegro($post_id)
{
    $post = get_post($post_id);

    // Sprawdź, czy to produkt i czy jest opublikowany
    if ($post->post_type !== 'product' || $post->post_status !== 'publish') {
        return;
    }

    // Pobierz token dostępu do API Allegro
    $access_token = getAllegroAccessToken();
    if (!isset($access_token)) {
        SaidPluginsUtils::log("!1: Brak access_token");
        return;
    }

    // Pobierz listę produktów z Allegro
    $allegroOffers = getAllegroOffers();
    if (empty($allegroOffers)) {
        SaidPluginsUtils::log("!2: Brak produktów w Allegro");
        return;
    }

    // Szukajproduktu w Allegro z takim samym ID jak usunięty produkt
    $offerId = '';
    foreach ($allegroOffers as $allegroProduct) {
        if (SaidPluginsUtils::valOrDef($allegroProduct, 'external', array())['id'] == $post_id) {
            $offerId = $allegroProduct['id'];
            break;
        }
    }

    if (empty($offerId)) {
        SaidPluginsUtils::log("!3: Nie znaleziono produktu w Allegro");
        return;
    }

    // Wykonaj żądanie DELETE do API Allegro
    $response = allegro_request('https://api.allegro.pl/sale/offers/' . $offerId, 'DELETE');

    if (is_wp_error($response)) {
        SaidPluginsUtils::log("!4: " . json_encode($response));
    } else {
        SaidPluginsUtils::log("Produkt usunięty z Allegro: " . $offerId);
    }
}

add_action('before_delete_post', 'delete_product_from_allegro');