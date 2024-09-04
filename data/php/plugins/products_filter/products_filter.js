jQuery(document).ready(function ($) {

    const priceFrom = $("#said-plugins-filter-price-from");
    const priceTo = $("#said-plugins-filter-price-to");
    const search = $("#said-plugins-filter-search");
    const category = $("#said-plugins-filter-category");
    // const inStock = $("#said-plugins-filter-in-stock");
    const button = $("#said-plugins-filter-button");

    button.click(function () {
        const searchQuery = search.val();
        const categoryId = category.val();
        // const isInStock = inStock.is(':checked');
        const priceFromVal = priceFrom.val();
        const priceToVal = priceTo.val();

        window.location.href =
            '?s=' + encodeURIComponent(searchQuery)
            + `&cat=${categoryId}`
            // + `&in_stock=${isInStock}`
            + `&price_min=${priceFromVal}`
            + `&price_max=${priceToVal}`
            + '&post_type=product';

    });
});